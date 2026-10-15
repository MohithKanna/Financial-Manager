import type {
    AccountStatus,
    AccountType,
    OwnershipType,
    CreateAccountInput,
} from "./Account";

export default class AccountPopup {
    private readonly abortController = new AbortController();
    private readonly signal = this.abortController.signal;
    private readonly parent: HTMLElement;
    private readonly checker: (input: CreateAccountInput) => string | null;
    private readonly onSuccess: (input: CreateAccountInput) => void;

    constructor(
        parent: HTMLElement,
        checker: (input: CreateAccountInput) => string | null,
        onSuccess: (input: CreateAccountInput) => void,
    ) {
        this.parent = parent;
        this.checker = checker;
        this.onSuccess = onSuccess;
    }

    open() {
        const popup = this.parent;

        popup.className = "popup";
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h2 class="popup-title">
                        Create account
                    </h2>
                </div>

                <div
                    class="form-error-banner"
                    role="alert"
                    aria-live="polite"
                    hidden
                ></div>

                <form class="create-account-form">
                    <div class="form-field">
                        <label for="account-name">
                            Name
                        </label>

                        <input
                            id="account-name"
                            name="name"
                            type="text"
                            spellcheck="false"
                            autocomplete="off"
                            placeholder="Account name"
                        />
                    </div>

                    <div class="form-field">
                        <label for="account-balance">
                            Balance
                        </label>

                        <input
                            id="account-balance"
                            name="balance"
                            
                            placeholder="0"
                        />
                    </div>

                    <div class="form-field">
                        <label for="account-type">
                            Type
                        </label>

                        <select
                            id="account-type"
                            name="type"
                        >
                            <option value="cash">
                                Cash
                            </option>

                            <option value="bank">
                                Bank
                            </option>

                            <option value="credit">
                                Credit
                            </option>
                        </select>
                    </div>

                    <div class="form-field">
                        <label for="account-status">
                            Status
                        </label>

                        <select
                            id="account-status"
                            name="status"
                        >
                            <option value="active">
                                Active
                            </option>

                            <option value="inactive">
                                Inactive
                            </option>
                        </select>
                    </div>

                    <div class="form-field">
                        <label for="account-ownership">
                            Ownership
                        </label>

                        <select
                            id="account-ownership"
                            name="ownerShip"
                        >
                            <option value="owned">
                                Owned
                            </option>

                            <option value="borrowed">
                                Borrowed
                            </option>
                        </select>
                    </div>

                    <div class="popup-actions">
                        <button
                            type="button"
                            data-action="close"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                        >
                            Create account
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(popup);

        const form = popup.querySelector(".create-account-form");

        if (!(form instanceof HTMLFormElement)) {
            throw new Error("Create account form not found");
        }

        const errorBanner = popup.querySelector(".form-error-banner");

        if (!(errorBanner instanceof HTMLElement)) {
            throw new Error("Error banner not found");
        }

        const getAccountInput = (): CreateAccountInput => {
            const formData = new FormData(form);
            return {
                name: String(formData.get("name") ?? "").trim(),

                balance: Number(formData.get("balance") ?? 0),

                type: String(formData.get("type") ?? "cash") as AccountType,

                status: String(
                    formData.get("status") ?? "active",
                ) as AccountStatus,

                ownerShip: String(
                    formData.get("ownerShip") ?? "owned",
                ) as OwnershipType,
            };
        };

        const setError = (message: string | null) => {
            if (message) {
                errorBanner.textContent = message;
                errorBanner.hidden = false;
            } else {
                errorBanner.textContent = "";
                errorBanner.hidden = true;
            }
        };

        /*
         * Validate on every change to the form.
         */
        form.addEventListener(
            "input",
            () => {
                const input = getAccountInput();
                const error = this.checker(input);
                if (input.name.length >= 0 && input.name.length < 3) {
                    setError(null);
                    return;
                }
                setError(error);
            },
            { signal: this.signal },
        );

        /*
         * Selects don't always fire `input` consistently
         * in every environment, so listen to change as well.
         */
        form.addEventListener(
            "change",
            () => {
                const input = getAccountInput();
                const error = this.checker(input);

                setError(error);
            },
            { signal: this.signal },
        );

        /*
         * Submit.
         */
        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                const accountInput = getAccountInput();
                const error = this.checker(accountInput);

                if (error) {
                    setError(error);
                    return;
                }
                this.onSuccess(accountInput);
                this.close(popup);
            },
            { signal: this.signal },
        );

        /*
         * Close buttons.
         */
        popup.querySelectorAll('[data-action="close"]').forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    this.close(popup);
                },
                { signal: this.signal },
            );
        });

        return popup;
    }

    private close(popup: HTMLElement) {
        this.abortController.abort();
        popup.remove();
    }
}

/*  fix for amoint input -  type="number"
                            step="any"
                            inputmode="decimal"
                            value="0"  */
