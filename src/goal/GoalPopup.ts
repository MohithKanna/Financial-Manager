import type { CreateGoalInput } from "./Goal";

export default class GoalPopup {
    private abortController: AbortController | null = null;
    private readonly parent: HTMLElement;
    private readonly checker: (input: CreateGoalInput) => string | null;
    private readonly onSuccess: (input: CreateGoalInput) => void;

    constructor(
        parent: HTMLElement,
        checker: (input: CreateGoalInput) => string | null,
        onSuccess: (input: CreateGoalInput) => void,
    ) {
        this.parent = parent;
        this.checker = checker;
        this.onSuccess = onSuccess;
    }

    open() {
        const popup = this.parent;
        this.abortController?.abort();
        const controller = new AbortController();
        this.abortController = controller;
        const { signal } = controller;

        popup.className = "popup";
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h2 class="popup-title">Create goal</h2>
                </div>

                <div
                    class="form-error-banner"
                    role="alert"
                    aria-live="polite"
                    hidden
                ></div>

                <form class="create-goal-form">
                    <div class="form-field">
                        <label for="goal-name">Name</label>
                        <input
                            id="goal-name"
                            name="name"
                            type="text"
                            minlength="3"
                            required
                            spellcheck="false"
                            autocomplete="off"
                            placeholder="Goal name"
                        />
                    </div>

                    <div class="form-field">
                        <label for="goal-target-amount">Target amount</label>
                        <input
                            id="goal-target-amount"
                            name="targetAmount"
                            type="number"
                            min="0.01"
                            step="any"
                            inputmode="decimal"
                            required
                            placeholder="0"
                        />
                    </div>

                    <div class="form-field">
                        <label for="goal-current-amount">Current amount</label>
                        <input
                            id="goal-current-amount"
                            name="currentAmount"
                            type="number"
                            min="0"
                            step="any"
                            inputmode="decimal"
                            value="0"
                            required
                            placeholder="0"
                        />
                    </div>

                    <div class="form-field">
                        <label for="goal-target-date">Target date</label>
                        <input
                            id="goal-target-date"
                            name="targetDate"
                            type="date"
                        />
                    </div>

                    <div class="popup-actions">
                        <button type="button" data-action="close">
                            Cancel
                        </button>
                        <button type="submit">Create goal</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(popup);

        const form = popup.querySelector(".create-goal-form");
        if (!(form instanceof HTMLFormElement)) {
            throw new Error("Create goal form not found");
        }

        const errorBanner = popup.querySelector(".form-error-banner");
        if (!(errorBanner instanceof HTMLElement)) {
            throw new Error("Error banner not found");
        }

        const getGoalInput = (): CreateGoalInput => {
            const formData = new FormData(form);
            const targetDate = String(formData.get("targetDate") ?? "");

            return {
                name: String(formData.get("name") ?? "").trim(),
                targetAmount: Number(formData.get("targetAmount")),
                currentAmount: Number(formData.get("currentAmount")),
                targetDate: targetDate
                    ? new Date(`${targetDate}T00:00:00`).getTime()
                    : undefined,
            };
        };

        const setError = (message: string | null) => {
            errorBanner.textContent = message ?? "";
            errorBanner.hidden = !message;
        };

        form.addEventListener(
            "input",
            () => setError(this.checker(getGoalInput())),
            { signal },
        );
        form.addEventListener(
            "change",
            () => setError(this.checker(getGoalInput())),
            { signal },
        );
        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();
                const input = getGoalInput();
                const error = this.checker(input);
                if (error) {
                    setError(error);
                    return;
                }

                this.onSuccess(input);
                this.close(popup);
            },
            { signal },
        );

        popup.querySelectorAll('[data-action="close"]').forEach((button) => {
            button.addEventListener("click", () => this.close(popup), {
                signal,
            });
        });

        return popup;
    }

    private close(popup: HTMLElement) {
        this.abortController?.abort();
        this.abortController = null;
        popup.remove();
    }
}
