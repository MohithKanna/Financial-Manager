/**
 * Calendar and clock infrastructure for a single application timezone.
 *
 * Calendar dates use the proleptic Gregorian calendar and are valid only for
 * years 1 through 9999. All calendar arithmetic is immutable and clamps the
 * day when its destination month has fewer days (for example Jan 31 + 1 month
 * is Feb 28, or Feb 29 in a leap year).
 */

export type Instant = number & { readonly __instantBrand: unique symbol };

export interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Monday through Sunday

export interface Period {
  readonly start: CalendarDate;
  readonly endExclusive: CalendarDate;
}

export interface Clock {
  now(): Instant;
}

export interface TimeSystemConfig {
  /** IANA timezone used to interpret instants as application calendar dates. */
  readonly timezone: string;
  /** Locale used only for display formatting. Defaults to en-GB. */
  readonly locale?: string;
  /** Monday (1) through Sunday (7). Defaults to Monday. */
  readonly firstDayOfWeek?: Weekday;
  /** Default clock style used by formatTime and formatDateTime. */
  readonly hour12?: boolean;
}

export interface DateFormatOptions {
  readonly dateStyle?: "full" | "long" | "medium" | "short";
}

export interface TimeFormatOptions {
  readonly timeStyle?: "full" | "long" | "medium" | "short";
  readonly hour12?: boolean;
}

export interface DateTimeFormatOptions extends DateFormatOptions, TimeFormatOptions {}

/**
 * A small, self-contained authority for current time and calendar mechanics.
 * It deliberately has no financial, persistence, recurrence-policy, or event
 * responsibilities.
 */
export class TimeSystem {
  private readonly clock: Clock;
  private readonly configuredTimezone: string;
  private readonly locale: string;
  private readonly firstWeekday: Weekday;
  private readonly defaultHour12?: boolean;
  private readonly calendarPartsFormatter: Intl.DateTimeFormat;

  public constructor(config: TimeSystemConfig, clock?: Clock) {
    if (!config || typeof config !== "object") {
      throw new TypeError("TimeSystem configuration is required.");
    }

    this.configuredTimezone = TimeSystem.validateTimezone(config.timezone);
    this.locale = config.locale ?? "en-GB";
    this.validateLocale(this.locale);
    this.firstWeekday = config.firstDayOfWeek ?? 1;
    this.assertWeekday(this.firstWeekday, "firstDayOfWeek");
    this.defaultHour12 = config.hour12;
    if (this.defaultHour12 !== undefined && typeof this.defaultHour12 !== "boolean") {
      throw new TypeError("hour12 must be a boolean when provided.");
    }

    this.clock = clock ?? { now: () => Date.now() as Instant };
    if (!this.clock || typeof this.clock.now !== "function") {
      throw new TypeError("Clock must provide now().");
    }

    this.calendarPartsFormatter = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
      timeZone: this.configuredTimezone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /** Returns the current absolute instant from this instance's clock. */
  public now(): Instant {
    return this.assertInstant(this.clock.now(), "Clock returned an invalid instant.");
  }

  /** Returns today's date in the configured application timezone. */
  public today(): CalendarDate {
    return this.dateForInstant(this.now());
  }

  public getTimezone(): string {
    return this.configuredTimezone;
  }

  /** Safely constructs an immutable Gregorian calendar date. */
  public date(year: number, month: number, day: number): CalendarDate {
    this.assertYear(year);
    this.assertMonth(month);
    this.assertInteger(day, "day");
    if (day < 1 || day > this.daysInMonth(year, month)) {
      throw new RangeError(`Invalid calendar date: ${year}-${month}-${day}.`);
    }
    return Object.freeze({ year, month, day });
  }

  /** Safely constructs an absolute instant from epoch milliseconds. */
  public instant(epochMilliseconds: number): Instant {
    return this.assertInstant(epochMilliseconds, "Invalid epoch milliseconds.");
  }

  public compareInstants(a: Instant, b: Instant): -1 | 0 | 1 {
    const left = this.assertInstant(a, "Invalid left instant.");
    const right = this.assertInstant(b, "Invalid right instant.");
    return left < right ? -1 : left > right ? 1 : 0;
  }

  public compareDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
    const left = this.assertDate(a, "left date");
    const right = this.assertDate(b, "right date");
    const difference = this.dayNumber(left) - this.dayNumber(right);
    return difference < 0 ? -1 : difference > 0 ? 1 : 0;
  }

  /** Calendar-day arithmetic; amounts must be finite integers. */
  public addDays(date: CalendarDate, amount: number): CalendarDate {
    const value = this.assertDate(date, "date");
    this.assertInteger(amount, "day amount");
    return this.dateFromDayNumber(this.dayNumber(value) + amount);
  }

  public addWeeks(date: CalendarDate, amount: number): CalendarDate {
    this.assertInteger(amount, "week amount");
    return this.addDays(date, amount * 7);
  }

  /** Calendar-month arithmetic with deterministic last-valid-day clamping. */
  public addMonths(date: CalendarDate, amount: number): CalendarDate {
    const value = this.assertDate(date, "date");
    this.assertInteger(amount, "month amount");
    const absoluteMonth = (value.year - 1) * 12 + (value.month - 1) + amount;
    const year = Math.floor(absoluteMonth / 12) + 1;
    const month = TimeSystem.positiveModulo(absoluteMonth, 12) + 1;
    this.assertYear(year);
    return this.date(year, month, Math.min(value.day, this.daysInMonth(year, month)));
  }

  /** Calendar-year arithmetic with deterministic Feb 29 to Feb 28 clamping. */
  public addYears(date: CalendarDate, amount: number): CalendarDate {
    const value = this.assertDate(date, "date");
    this.assertInteger(amount, "year amount");
    const year = value.year + amount;
    this.assertYear(year);
    return this.date(year, value.month, Math.min(value.day, this.daysInMonth(year, value.month)));
  }

  /** Signed calendar-day difference: end minus start. */
  public daysBetween(start: CalendarDate, end: CalendarDate): number {
    return this.dayNumber(this.assertDate(end, "end date")) - this.dayNumber(this.assertDate(start, "start date"));
  }

  /** Signed elapsed timeline duration: end minus start, in milliseconds. */
  public elapsedMilliseconds(start: Instant, end: Instant): number {
    return this.assertInstant(end, "end instant") - this.assertInstant(start, "start instant");
  }

  public isLeapYear(year: number): boolean {
    this.assertYear(year);
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  public daysInMonth(year: number, month: number): number {
    this.assertYear(year);
    this.assertMonth(month);
    if (month === 2) return this.isLeapYear(year) ? 29 : 28;
    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
  }

  /** Monday is 1, Sunday is 7. */
  public dayOfWeek(date: CalendarDate): Weekday {
    const dayNumber = this.dayNumber(this.assertDate(date, "date"));
    return (TimeSystem.positiveModulo(dayNumber + 3, 7) + 1) as Weekday;
  }

  public dayPeriod(date: CalendarDate): Period {
    const start = this.assertDate(date, "date");
    return this.period(start, this.addDays(start, 1));
  }

  public weekPeriod(date: CalendarDate): Period {
    const value = this.assertDate(date, "date");
    const offset = TimeSystem.positiveModulo(this.dayOfWeek(value) - this.firstWeekday, 7);
    const start = this.addDays(value, -offset);
    return this.period(start, this.addDays(start, 7));
  }

  public monthPeriod(date: CalendarDate): Period {
    const value = this.assertDate(date, "date");
    const start = this.date(value.year, value.month, 1);
    return this.period(start, this.addMonths(start, 1));
  }

  public yearPeriod(date: CalendarDate): Period {
    const value = this.assertDate(date, "date");
    const start = this.date(value.year, 1, 1);
    return this.period(start, this.addYears(start, 1));
  }

  public currentMonthPeriod(): Period {
    return this.monthPeriod(this.today());
  }

  public previousMonthPeriod(): Period {
    return this.monthPeriod(this.addMonths(this.today(), -1));
  }

  /** Creates an arbitrary, non-empty half-open date range [start, endExclusive). */
  public range(start: CalendarDate, endExclusive: CalendarDate): Period {
    return this.period(this.assertDate(start, "start date"), this.assertDate(endExclusive, "end date"));
  }

  public containsDate(period: Period, date: CalendarDate): boolean {
    const checkedPeriod = this.assertPeriod(period);
    const value = this.assertDate(date, "date");
    return this.compareDates(checkedPeriod.start, value) <= 0 && this.compareDates(value, checkedPeriod.endExclusive) < 0;
  }

  /** Interprets the instant in this instance's configured application timezone. */
  public containsInstant(period: Period, instant: Instant): boolean {
    return this.containsDate(period, this.dateForInstant(instant));
  }

  /** Returns null for a Gregorian-valid day number absent from the target month. */
  public resolveDayOfMonth(year: number, month: number, day: number): CalendarDate | null {
    this.assertYear(year);
    this.assertMonth(month);
    this.assertInteger(day, "day");
    if (day < 1 || day > 31 || day > this.daysInMonth(year, month)) return null;
    return this.date(year, month, day);
  }

  public resolveMonthDay(year: number, month: number, day: number): CalendarDate | null {
    return this.resolveDayOfMonth(year, month, day);
  }

  /** Formats a date-only value without interpreting it in the application timezone. */
  public formatDate(date: CalendarDate, options: DateFormatOptions = {}): string {
    const value = this.assertDate(date, "date");
    const temporaryUtcDate = new Date(0);
    temporaryUtcDate.setUTCFullYear(value.year, value.month - 1, value.day);
    return new Intl.DateTimeFormat(this.locale, {
      calendar: "gregory",
      timeZone: "UTC",
      dateStyle: options.dateStyle ?? "medium",
    }).format(temporaryUtcDate);
  }

  public formatTime(instant: Instant, options: TimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat(this.locale, {
      timeZone: this.configuredTimezone,
      timeStyle: options.timeStyle ?? "short",
      hour12: options.hour12 ?? this.defaultHour12,
    }).format(new Date(this.assertInstant(instant, "instant")));
  }

  public formatDateTime(instant: Instant, options: DateTimeFormatOptions = {}): string {
    return new Intl.DateTimeFormat(this.locale, {
      timeZone: this.configuredTimezone,
      dateStyle: options.dateStyle ?? "medium",
      timeStyle: options.timeStyle ?? "short",
      hour12: options.hour12 ?? this.defaultHour12,
    }).format(new Date(this.assertInstant(instant, "instant")));
  }

  private dateForInstant(instant: Instant): CalendarDate {
    const validInstant = this.assertInstant(instant, "instant");
    const parts = this.calendarPartsFormatter.formatToParts(new Date(validInstant));
    const values: Record<string, number> = {};
    for (const part of parts) {
      if (part.type === "year" || part.type === "month" || part.type === "day") values[part.type] = Number(part.value);
    }
    return this.date(values.year, values.month, values.day);
  }

  private period(start: CalendarDate, endExclusive: CalendarDate): Period {
    if (this.compareDates(start, endExclusive) >= 0) {
      throw new RangeError("A period's endExclusive must be after its start.");
    }
    return Object.freeze({ start, endExclusive });
  }

  private assertPeriod(period: Period): Period {
    if (!period || typeof period !== "object") throw new TypeError("Invalid period.");
    return this.period(this.assertDate(period.start, "period start"), this.assertDate(period.endExclusive, "period endExclusive"));
  }

  private assertDate(value: CalendarDate, label: string): CalendarDate {
    if (!value || typeof value !== "object") throw new TypeError(`${label} must be a CalendarDate.`);
    return this.date(value.year, value.month, value.day);
  }

  private assertInstant(value: number, message: string): Instant {
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) throw new RangeError(message);
    return value as Instant;
  }

  private assertYear(year: number): void {
    this.assertInteger(year, "year");
    if (year < 1 || year > 9999) throw new RangeError("year must be between 1 and 9999.");
  }

  private assertMonth(month: number): void {
    this.assertInteger(month, "month");
    if (month < 1 || month > 12) throw new RangeError("month must be between 1 and 12.");
  }

  private assertWeekday(weekday: number, label: string): void {
    this.assertInteger(weekday, label);
    if (weekday < 1 || weekday > 7) throw new RangeError(`${label} must be between 1 (Monday) and 7 (Sunday).`);
  }

  private assertInteger(value: number, label: string): void {
    if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new RangeError(`${label} must be a finite integer.`);
    }
  }

  private validateLocale(locale: string): void {
    if (typeof locale !== "string" || locale.length === 0) throw new TypeError("locale must be a non-empty string.");
    try {
      Intl.getCanonicalLocales(locale);
    } catch {
      throw new RangeError(`Unsupported locale: ${locale}.`);
    }
  }

  private dayNumber(date: CalendarDate): number {
    let year = date.year;
    const month = date.month;
    year -= month <= 2 ? 1 : 0;
    const era = Math.floor(year / 400);
    const yearOfEra = year - era * 400;
    const monthPrime = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + date.day - 1;
    const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
    return era * 146097 + dayOfEra - 719468;
  }

  private dateFromDayNumber(dayNumber: number): CalendarDate {
    this.assertInteger(dayNumber, "day number");
    const shifted = dayNumber + 719468;
    const era = Math.floor(shifted / 146097);
    const dayOfEra = shifted - era * 146097;
    const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365);
    const yearBase = yearOfEra + era * 400;
    const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
    const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
    const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
    const month = monthPrime + (monthPrime < 10 ? 3 : -9);
    const year = yearBase + (month <= 2 ? 1 : 0);
    return this.date(year, month, day);
  }

  private static validateTimezone(timezone: string): string {
    if (typeof timezone !== "string" || timezone.length === 0) throw new TypeError("timezone must be a non-empty IANA timezone identifier.");
    try {
      return new Intl.DateTimeFormat("en", { timeZone: timezone }).resolvedOptions().timeZone;
    } catch {
      throw new RangeError(`Unsupported IANA timezone: ${timezone}.`);
    }
  }

  private static positiveModulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
  }
}
