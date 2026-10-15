export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
    label: string;
    onClick: () => void | Promise<void>;
}

export interface ToastOptions {
    message: string;
    title?: string;
    type?: ToastType;
    duration?: number;
    action?: ToastAction;
}

interface ToastRecord {
    id: string;
    message: string;
    title?: string;
    type: ToastType;
    duration: number;
    action?: ToastAction;

    element: HTMLElement;
    messageElement: HTMLElement;
    titleElement: HTMLElement;
    iconElement: HTMLElement;
    actionButton?: HTMLButtonElement;

    timer?: ReturnType<typeof setTimeout>;
    removalTimer?: ReturnType<typeof setTimeout>;
    remaining: number;
    startedAt: number;
    actionRunning: boolean;
    isVisible: boolean;
    isPaused: boolean;
    isLeaving: boolean;
}

type ToastOverrides = Omit<ToastOptions, "message" | "type">;

export class ToastManager {
    private static readonly MAX_VISIBLE = 3;
    private static readonly MAX_QUEUED = 5;

    private static readonly DEFAULT_DURATIONS: Record<ToastType, number> = {
        success: 3000,
        info: 4000,
        warning: 6000,
        error: 5000,
    };

    private container: HTMLElement | null = null;
    private visible: ToastRecord[] = [];
    private queue: ToastRecord[] = [];
    private nextId = 0;

    /**
     * Creates the shared container once.
     * Safe to call repeatedly.
     */
    init(): void {
        if (typeof document === "undefined") {
            throw new Error("ToastManager requires a browser DOM.");
        }

        if (this.container?.isConnected) return;

        const container = document.createElement("div");
        container.className = "fm-toast-container";
        container.setAttribute("aria-label", "Notifications");
        container.dataset.toastContainer = "";

        document.body.append(container);
        this.container = container;
    }

    show(options: ToastOptions): string | null {
        const type = options.type ?? "info";
        const duration =
            options.duration ?? ToastManager.DEFAULT_DURATIONS[type];

        if (!options.message.trim()) {
            throw new Error("Toast message cannot be empty.");
        }

        if (!Number.isFinite(duration) || duration < 0) {
            throw new Error("Toast duration must be a non-negative number.");
        }

        // Reject the newest request when the waiting queue is full.
        if (
            this.visible.length >= ToastManager.MAX_VISIBLE &&
            this.queue.length >= ToastManager.MAX_QUEUED
        ) {
            return null;
        }

        this.init();

        const id = `fm-toast-${++this.nextId}`;
        const toast = this.createToast(id, {
            ...options,
            type,
            duration,
        });

        if (this.visible.length < ToastManager.MAX_VISIBLE) {
            this.display(toast);
        } else {
            this.queue.push(toast);
        }

        return id;
    }

    success(message: string, options?: ToastOverrides): string | null {
        return this.show({ ...options, message, type: "success" });
    }

    error(message: string, options?: ToastOverrides): string | null {
        return this.show({ ...options, message, type: "error" });
    }

    warning(message: string, options?: ToastOverrides): string | null {
        return this.show({ ...options, message, type: "warning" });
    }

    info(message: string, options?: ToastOverrides): string | null {
        return this.show({ ...options, message, type: "info" });
    }

    dismiss(id: string): void {
        const queuedIndex = this.queue.findIndex((toast) => toast.id === id);

        if (queuedIndex !== -1) {
            this.queue.splice(queuedIndex, 1);
            return;
        }

        const toast = this.visible.find((item) => item.id === id);
        if (toast) this.remove(toast);
    }

    dismissAll(): void {
        this.queue = [];

        for (const toast of [...this.visible]) {
            this.remove(toast, false);
        }
    }

    private createToast(
        id: string,
        options: ToastOptions & { type: ToastType; duration: number },
    ): ToastRecord {
        const element = document.createElement("article");
        element.className = `fm-toast fm-toast--${options.type}`;
        element.dataset.toastId = id;
        element.dataset.state = "entering";

        const iconElement = document.createElement("span");
        iconElement.className = "fm-toast__icon";
        iconElement.setAttribute("aria-hidden", "true");

        const content = document.createElement("div");
        content.className = "fm-toast__content";

        const titleElement = document.createElement("div");
        titleElement.className = "fm-toast__title";

        const messageElement = document.createElement("div");
        messageElement.className = "fm-toast__message";
        messageElement.textContent = options.message;

        if (options.title) {
            titleElement.textContent = options.title;
            content.append(titleElement);
        }

        content.append(messageElement);

        const controls = document.createElement("div");
        controls.className = "fm-toast__controls";

        let actionButton: HTMLButtonElement | undefined;

        if (options.action) {
            actionButton = document.createElement("button");
            actionButton.type = "button";
            actionButton.className = "fm-toast__action";
            actionButton.textContent = options.action.label;
            actionButton.addEventListener("click", () => {
                void this.runAction(id);
            });
            controls.append(actionButton);
        }

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "fm-toast__close";
        closeButton.setAttribute("aria-label", "Dismiss notification");
        closeButton.innerHTML = this.icon("close");
        closeButton.addEventListener("click", () => this.dismiss(id));

        controls.append(closeButton);
        element.append(iconElement, content, controls);

        // Pause the countdown while the user interacts with the toast.
        element.addEventListener("mouseenter", () => this.pause(id));
        element.addEventListener("mouseleave", () => this.resume(id));
        element.addEventListener("focusin", () => this.pause(id));
        element.addEventListener("focusout", (event) => {
            const next = event.relatedTarget;
            if (!(next instanceof Node) || !element.contains(next)) {
                this.resume(id);
            }
        });

        return {
            id,
            message: options.message,
            title: options.title,
            type: options.type,
            duration: options.duration,
            action: options.action,
            element,
            messageElement,
            titleElement,
            iconElement,
            actionButton,
            remaining: options.duration,
            startedAt: 0,
            actionRunning: false,
            isVisible: false,
            isPaused: false,
            isLeaving: false,
        };
    }

    private display(toast: ToastRecord): void {
        if (!this.container) this.init();

        toast.isVisible = true;
        toast.iconElement.innerHTML = this.icon(toast.type);

        // Each toast announces itself; errors use an assertive live region.
        toast.element.setAttribute(
            "role",
            toast.type === "error" ? "alert" : "status",
        );
        toast.element.setAttribute(
            "aria-live",
            toast.type === "error" ? "assertive" : "polite",
        );
        toast.element.setAttribute("aria-atomic", "true");

        this.container!.append(toast.element);
        this.visible.push(toast);

        requestAnimationFrame(() => {
            if (!toast.isLeaving) {
                toast.element.dataset.state = "visible";
            }
        });

        this.startTimer(toast);
    }

    private startTimer(toast: ToastRecord): void {
        if (
            !toast.isVisible ||
            toast.isPaused ||
            toast.actionRunning ||
            toast.duration === 0 ||
            toast.isLeaving
        ) {
            return;
        }

        clearTimeout(toast.timer);

        toast.startedAt = Date.now();
        toast.timer = setTimeout(() => this.remove(toast), toast.remaining);
    }

    private pause(id: string): void {
        const toast = this.visible.find((item) => item.id === id);
        if (!toast || toast.isPaused) return;

        toast.isPaused = true;

        if (toast.timer) {
            clearTimeout(toast.timer);
            toast.remaining = Math.max(
                0,
                toast.remaining - (Date.now() - toast.startedAt),
            );
            toast.timer = undefined;
        }
    }

    private resume(id: string): void {
        const toast = this.visible.find((item) => item.id === id);
        if (!toast || !toast.isPaused) return;

        toast.isPaused = false;

        if (toast.remaining <= 0 && !toast.actionRunning) {
            this.remove(toast);
        } else {
            this.startTimer(toast);
        }
    }

    private async runAction(id: string): Promise<void> {
        const toast = this.visible.find((item) => item.id === id);

        if (!toast?.action || toast.actionRunning || toast.isLeaving) {
            return;
        }

        toast.actionRunning = true;
        clearTimeout(toast.timer);

        if (toast.actionButton) {
            toast.actionButton.disabled = true;
            toast.actionButton.setAttribute("aria-busy", "true");
        }

        try {
            await toast.action.onClick();
            this.remove(toast);
        } catch {
            // Keep the toast available and let the user try again.
            toast.type = "error";
            toast.element.className = "fm-toast fm-toast--error";
            toast.iconElement.innerHTML = this.icon("error");
            toast.element.setAttribute("role", "alert");
            toast.element.setAttribute("aria-live", "assertive");
            toast.message =
                "That action couldn't be completed. Please try again.";
            toast.messageElement.textContent = toast.message;

            toast.actionRunning = false;

            if (toast.actionButton) {
                toast.actionButton.disabled = false;
                toast.actionButton.removeAttribute("aria-busy");
            }

            // Restart with the error duration, unless the toast is paused.
            toast.duration = ToastManager.DEFAULT_DURATIONS.error;
            toast.remaining = toast.duration;
            this.startTimer(toast);
        }
    }

    private remove(toast: ToastRecord, promote = true): void {
        if (toast.isLeaving) return;

        toast.isLeaving = true;
        toast.isVisible = false;

        clearTimeout(toast.timer);

        this.visible = this.visible.filter((item) => item.id !== toast.id);

        toast.element.dataset.state = "leaving";

        const finish = () => {
            clearTimeout(toast.removalTimer);
            toast.element.remove();

            if (promote) this.promoteNext();
        };

        toast.element.addEventListener("transitionend", finish, { once: true });

        // Fallback if transitions are disabled or transitionend never fires.
        toast.removalTimer = setTimeout(finish, 250);

        if (!promote) {
            this.visible = this.visible.filter((item) => item.id !== toast.id);
        }
    }

    private promoteNext(): void {
        while (
            this.visible.length < ToastManager.MAX_VISIBLE &&
            this.queue.length > 0
        ) {
            const next = this.queue.shift()!;
            this.display(next);
        }
    }

    private icon(type: ToastType | "close"): string {
        const paths: Record<ToastType | "close", string> = {
            success: '<path d="m5 12 4 4L19 6"/>',
            error: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6m0-6 6 6"/>',
            warning:
                '<path d="M10.3 3.9 2.5 17.4A1.8 1.8 0 0 0 4.1 20h15.8a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/>',
            info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
            close: '<path d="m18 6-12 12M6 6l12 12"/>',
        };

        return `<svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24" width="20" height="20"
      fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      focusable="false" aria-hidden="true">${paths[type]}</svg>`;
    }
}

export const toast = new ToastManager();

// /* Financial Manager — Toast Manager */

// .fm-toast-container {
//     /* Override these variables when the app palette is decided. */
//     --fm-toast-success: var(--color-success, #15803d);
//     --fm-toast-error: var(--color-danger, #b91c1c);
//     --fm-toast-warning: var(--color-warning, #a16207);
//     --fm-toast-info: var(--color-info, #1d4ed8);

//     --fm-toast-surface: var(--color-surface, #ffffff);
//     --fm-toast-text: var(--color-text, #1f2937);
//     --fm-toast-muted: var(--color-text-muted, #6b7280);
//     --fm-toast-border: var(--color-border, #e5e7eb);
//     --fm-toast-shadow: 0 8px 28px rgb(0 0 0 / 12%);

//     position: fixed;
//     z-index: 1000;
//     top: max(1rem, env(safe-area-inset-top));
//     right: max(1rem, env(safe-area-inset-right));

//     display: flex;
//     flex-direction: column;
//     align-items: stretch;
//     gap: 0.75rem;

//     width: min(24rem, calc(100vw - 2rem));
//     max-height: calc(100dvh - 2rem);
//     overflow: visible;

//     pointer-events: none;
//     font-family: inherit;
//     color: var(--fm-toast-text);
// }

// /* Base toast */

// .fm-toast {
//     --fm-toast-accent: var(--fm-toast-info);
//     --fm-toast-tint: color-mix(
//         in srgb,
//         var(--fm-toast-accent) 9%,
//         var(--fm-toast-surface)
//     );

//     display: grid;
//     grid-template-columns: auto minmax(0, 1fr) auto;
//     align-items: start;
//     gap: 0.75rem;

//     padding: 1rem;
//     border: 1px solid var(--fm-toast-border);
//     border-inline-start: 4px solid var(--fm-toast-accent);
//     border-radius: 0.875rem;

//     background: var(--fm-toast-surface);
//     box-shadow: var(--fm-toast-shadow);
//     color: var(--fm-toast-text);

//     overflow-wrap: anywhere;
//     pointer-events: auto;

//     opacity: 0;
//     transform: translateX(0.75rem) scale(0.98);
//     transition:
//         opacity 180ms ease,
//         transform 180ms ease;
// }

// .fm-toast[data-state="visible"] {
//     opacity: 1;
//     transform: translateX(0) scale(1);
// }

// .fm-toast[data-state="leaving"] {
//     opacity: 0;
//     transform: translateX(0.5rem) scale(0.98);
//     pointer-events: none;
// }

// /* Semantic types */

// .fm-toast--success {
//     --fm-toast-accent: var(--fm-toast-success);
// }

// .fm-toast--error {
//     --fm-toast-accent: var(--fm-toast-error);
// }

// .fm-toast--warning {
//     --fm-toast-accent: var(--fm-toast-warning);
// }

// .fm-toast--info {
//     --fm-toast-accent: var(--fm-toast-info);
// }

// /* Icon */

// .fm-toast__icon {
//     display: inline-flex;
//     align-items: center;
//     justify-content: center;

//     width: 1.5rem;
//     height: 1.5rem;
//     margin-top: 0.0625rem;

//     color: var(--fm-toast-accent);
// }

// .fm-toast__icon svg {
//     display: block;
//     width: 1.25rem;
//     height: 1.25rem;
//     flex: none;
// }

// /* Content */

// .fm-toast__content {
//     display: flex;
//     flex-direction: column;
//     gap: 0.25rem;
//     min-width: 0;
// }

// .fm-toast__title {
//     font-size: 0.925rem;
//     font-weight: 650;
//     line-height: 1.4;
// }

// .fm-toast__title:empty {
//     display: none;
// }

// .fm-toast__message {
//     font-size: 0.875rem;
//     line-height: 1.5;
//     color: var(--fm-toast-muted);
// }

// /* Actions */

// .fm-toast__controls {
//     display: flex;
//     align-items: center;
//     justify-content: flex-end;
//     flex-wrap: wrap;
//     gap: 0.375rem;
// }

// .fm-toast__action,
// .fm-toast__close {
//     display: inline-flex;
//     align-items: center;
//     justify-content: center;

//     min-width: 2.5rem;
//     min-height: 2.5rem;
//     border: 0;
//     border-radius: 0.5rem;

//     font: inherit;
//     cursor: pointer;
//     transition:
//         background-color 150ms ease,
//         opacity 150ms ease;
// }

// .fm-toast__action {
//     padding: 0.5rem 0.625rem;
//     background: transparent;
//     color: var(--fm-toast-accent);
//     font-size: 0.875rem;
//     font-weight: 650;
// }

// .fm-toast__action:hover:not(:disabled) {
//     background: var(--fm-toast-tint);
// }

// .fm-toast__action:disabled {
//     opacity: 0.55;
//     cursor: wait;
// }

// .fm-toast__close {
//     width: 2.5rem;
//     padding: 0.5rem;
//     background: transparent;
//     color: var(--fm-toast-muted);
// }

// .fm-toast__close:hover {
//     background: var(--fm-toast-tint);
//     color: var(--fm-toast-text);
// }

// .fm-toast__close svg {
//     display: block;
//     width: 1rem;
//     height: 1rem;
// }

// /* Keyboard accessibility */

// .fm-toast__action:focus-visible,
// .fm-toast__close:focus-visible {
//     outline: 2px solid var(--fm-toast-accent);
//     outline-offset: 2px;
// }

// /* Narrow screens */

// @media (max-width: 480px) {
//     .fm-toast-container {
//         top: auto;
//         right: max(0.75rem, env(safe-area-inset-right));
//         bottom: max(0.75rem, env(safe-area-inset-bottom));
//         left: max(0.75rem, env(safe-area-inset-left));

//         width: auto;
//         max-height: calc(100dvh - 1.5rem);
//     }

//     .fm-toast {
//         gap: 0.625rem;
//         padding: 0.875rem;
//         border-radius: 0.75rem;
//     }

//     .fm-toast__controls {
//         gap: 0.125rem;
//     }
// }

// /* Respect the user's motion preferences */

// @media (prefers-reduced-motion: reduce) {
//     .fm-toast,
//     .fm-toast__action,
//     .fm-toast__close {
//         transition: none;
//     }

//     .fm-toast {
//         transform: none;
//     }

//     .fm-toast[data-state="visible"],
//     .fm-toast[data-state="leaving"] {
//         transform: none;
//     }
// }
