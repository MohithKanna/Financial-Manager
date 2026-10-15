import type { CategoryType, CreateCategoryInput } from "./Category";

export default class CategoryPopup {
    private readonly abortController = new AbortController();
    private readonly signal = this.abortController.signal;
    private readonly parent: HTMLElement;
    private readonly checker: (input: CreateCategoryInput) => string | null;
    private readonly onSuccess: (input: CreateCategoryInput) => void;

    constructor(
        parent: HTMLElement,
        checker: (input: CreateCategoryInput) => string | null,
        onSuccess: (input: CreateCategoryInput) => void,
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
                    <h2 class="popup-title">Create category</h2>
                </div>

                <div
                    class="form-error-banner"
                    role="alert"
                    aria-live="polite"
                    hidden
                ></div>

                <form class="create-category-form">
                    <div class="form-field">
                        <label for="category-name">Name</label>
                        <input
                            id="category-name"
                            name="name"
                            type="text"
                            spellcheck="false"
                            autocomplete="off"
                            placeholder="Category name"
                        />
                    </div>

                    <div class="form-field">
                        <label for="category-type">Type</label>
                        <select id="category-type" name="type">
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                            <option value="transfer">Transfer</option>
                            <option value="general">General</option>
                        </select>
                    </div>

                    <div class="form-field">
                        <label for="category-status">Status</label>
                        <select id="category-status" name="status">
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div class="popup-actions">
                        <button type="button" data-action="close">Cancel</button>
                        <button type="submit">Create category</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(popup);

        const form = popup.querySelector(".create-category-form");
        if (!(form instanceof HTMLFormElement)) {
            throw new Error("Create category form not found");
        }

        const errorBanner = popup.querySelector(".form-error-banner");
        if (!(errorBanner instanceof HTMLElement)) {
            throw new Error("Error banner not found");
        }

        const getCategoryInput = (): CreateCategoryInput => {
            const formData = new FormData(form);
            return {
                name: String(formData.get("name") ?? "").trim(),
                type: String(formData.get("type") ?? "general") as CategoryType,
                status: String(
                    formData.get("status") ?? "active",
                ) as CreateCategoryInput["status"],
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

        form.addEventListener(
            "input",
            () => {
                const input = getCategoryInput();
                if (input.name.length > 0 && input.name.length < 3) {
                    setError(null);
                    return;
                }
                setError(this.checker(input));
            },
            { signal: this.signal },
        );

        form.addEventListener(
            "change",
            () => setError(this.checker(getCategoryInput())),
            { signal: this.signal },
        );

        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                const input = getCategoryInput();
                const error = this.checker(input);
                if (error) {
                    setError(error);
                    return;
                }

                this.onSuccess(input);
                this.close(popup);
            },
            { signal: this.signal },
        );

        popup.querySelectorAll('[data-action="close"]').forEach((button) => {
            button.addEventListener(
                "click",
                () => this.close(popup),
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
