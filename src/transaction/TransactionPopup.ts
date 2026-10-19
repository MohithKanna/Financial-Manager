import type { Account } from "../account/Account";
import type { CategoryType } from "../category/Category";
import type Category from "../category/Category";
import type { CreateTransactionInput } from "./Transaction";

export default class TransactionPopup {
    private abortController: AbortController | null = null;
    private readonly parent: HTMLElement;
    private readonly getAccounts: () => Account[];
    private readonly getCategories: (category: CategoryType) => Category[];
    private readonly checker: (input: CreateTransactionInput) => string | null;
    private readonly onSuccess: (input: CreateTransactionInput) => void;
    constructor(
        parent: HTMLElement,
        getAccounts: () => Account[],
        getCategories: (category: CategoryType) => Category[],
        checker: (input: CreateTransactionInput) => string | null,
        onSuccess: (input: CreateTransactionInput) => void,
    ) {
        this.parent = parent;
        this.getAccounts = getAccounts;
        this.getCategories = getCategories;
        this.checker = checker;
        this.onSuccess = onSuccess;
    }
    open() {
        const popup = this.parent;
        this.abortController?.abort();
        const abortController = new AbortController();
        this.abortController = abortController;
        const signal = abortController.signal;
        popup.className = "popup";
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h2 class="popup-title">Create transaction</h2>
                </div>

                <div
                    class="form-error-banner"
                    role="alert"
                    aria-live="polite"
                    hidden
                ></div>

                <form class="create-transaction-form">
                    <div class="form-field">
                        <label for="transaction-type">Type</label>
                        <select id="transaction-type" name="type">
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                            <option value="transfer">Transfer</option>
                        </select>
                    </div>

                    <div class="form-field">
                        <label for="transaction-amount">Amount</label>
                        <input
                            id="transaction-amount"
                            name="amount"
                            type="number"
                            min="0.01"
                            step="any"
                            inputmode="decimal"
                            required
                            placeholder="0"
                        />
                    </div>

                    <div class="form-field">
                        <label for="transaction-date">Date</label>
                        <input
                            id="transaction-date"
                            name="date"
                            type="date"
                            required
                        />
                    </div>

                    <div class="form-field">
                        <label for="transaction-category">Category</label>
                        <select
                            id="transaction-category"
                            name="categoryId"
                            required
                        ></select>
                    </div>

                    <div class="form-field">
                        <label for="transaction-src-account">Account</label>
                        <select
                            id="transaction-src-account"
                            name="fromAccountId"
                            required
                        ></select>
                    </div>

                    <div class="form-field" data-transfer-only hidden>
                        <label for="transaction-dst-account">
                            Destination account
                        </label>
                        <select
                            id="transaction-dst-account"
                            name="toAccountId"
                        ></select>
                    </div>

                    <div class="form-field">
                        <label for="transaction-note">Note (optional)</label>
                        <input
                            id="transaction-note"
                            name="note"
                            type="text"
                            autocomplete="off"
                        />
                    </div>

                    <div class="popup-actions">
                        <button type="button" data-action="close">
                            Cancel
                        </button>
                        <button type="submit">Create transaction</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(popup);

        const form = popup.querySelector(".create-transaction-form");
        if (!(form instanceof HTMLFormElement)) {
            throw new Error("Create transaction form not found");
        }

        const errorBanner = popup.querySelector(".form-error-banner");
        if (!(errorBanner instanceof HTMLElement)) {
            throw new Error("Error banner not found");
        }

        const sourceSelect = form.elements.namedItem("fromAccountId");
        const destinationSelect = form.elements.namedItem("toAccountId");
        const transferFields = form.querySelector("[data-transfer-only]");
        const typeSelect = form.elements.namedItem("type");
        const categorySelect = form.elements.namedItem("categoryId");
        if (
            !(sourceSelect instanceof HTMLSelectElement) ||
            !(destinationSelect instanceof HTMLSelectElement) ||
            !(transferFields instanceof HTMLElement) ||
            !(typeSelect instanceof HTMLSelectElement) ||
            !(categorySelect instanceof HTMLSelectElement)
        ) {
            throw new Error("Transaction form fields not found");
        }

        const activeAccounts = this.getAccounts().filter(
            (account) => account.status === "active",
        );
        const setAccountOptions = (
            select: HTMLSelectElement,
            excludedAccountId?: string,
        ) => {
            const selectedAccountId = select.value;
            const availableAccounts = activeAccounts.filter(
                (account) => account.id !== excludedAccountId,
            );
            select.replaceChildren();
            for (const account of availableAccounts) {
                const option = document.createElement("option");
                option.value = account.id;
                option.textContent = account.name;
                select.append(option);
            }
            select.value = availableAccounts.some(
                (account) => account.id === selectedAccountId,
            )
                ? selectedAccountId
                : (availableAccounts[0]?.id ?? "");
        };
        const updateDestinationOptions = () => {
            setAccountOptions(destinationSelect, sourceSelect.value);
        };
        setAccountOptions(sourceSelect);
        updateDestinationOptions();

        const updateCategoryOptions = () => {
            const selectedCategoryId = categorySelect.value;
            const type = typeSelect.value;
            const categories = this.getCategories(type as CategoryType).filter(
                (category) =>
                    category.status === "active" && category.name.trim(),
            );
            categorySelect.replaceChildren();

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Select category";
            categorySelect.append(placeholder);

            for (const category of categories) {
                const option = document.createElement("option");
                option.value = category.id;
                option.textContent = category.name.trim();
                categorySelect.append(option);
            }

            categorySelect.value = categories.some(
                (category) => category.id === selectedCategoryId,
            )
                ? selectedCategoryId
                : "";
        };

        const dateInput = form.elements.namedItem("date");
        if (dateInput instanceof HTMLInputElement) {
            const today = new Date();
            dateInput.value = [
                today.getFullYear(),
                String(today.getMonth() + 1).padStart(2, "0"),
                String(today.getDate()).padStart(2, "0"),
            ].join("-");
        }

        const getTransactionInput = (): CreateTransactionInput => {
            const formData = new FormData(form);
            const type = typeSelect.value;
            if (
                type !== "income" &&
                type !== "expense" &&
                type !== "transfer"
            ) {
                throw new Error(`Unsupported transaction type: ${type}`);
            }

            return {
                type,
                amount: Number(formData.get("amount")),
                date: String(formData.get("date") ?? ""),
                categoryId: String(formData.get("categoryId") ?? "").trim(),
                fromAccountId: String(formData.get("fromAccountId") ?? ""),
                toAccountId:
                    type === "transfer"
                        ? String(formData.get("toAccountId") ?? "")
                        : undefined,
                note: String(formData.get("note") ?? "").trim() || undefined,
            };
        };

        const setError = (message: string | null) => {
            errorBanner.textContent = message ?? "";
            errorBanner.hidden = !message;
        };

        const updateTransferFields = () => {
            const isTransfer = typeSelect.value === "transfer";
            transferFields.hidden = !isTransfer;
            transferFields.style.display = isTransfer ? "" : "none";
            destinationSelect.required = isTransfer;
            updateDestinationOptions();
            updateCategoryOptions();
        };
        updateTransferFields();
        if (activeAccounts.length === 0) {
            setError("Create an active account before adding a transaction");
        }

        form.addEventListener(
            "input",
            () => setError(this.checker(getTransactionInput())),
            { signal },
        );
        form.addEventListener(
            "change",
            () => {
                updateTransferFields();
                setError(this.checker(getTransactionInput()));
            },
            { signal },
        );
        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                const input = getTransactionInput();
                const error = this.checker(input);
                if (error) {
                    setError(error);
                    return;
                }
                try {
                    this.onSuccess(input);
                    this.close(popup);
                } catch (error) {
                    setError(
                        error instanceof Error && error.message
                            ? error.message
                            : "Unable to create transaction",
                    );
                }
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
