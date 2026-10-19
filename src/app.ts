import LiveStore from "./core/LiveStore";
import DomainOperator from "./core/DomainOperator";
import AccountPopup from "./account/AccountPopup";
import GoalPopup from "./goal/GoalPopup";
import TransactionPopup from "./transaction/TransactionPopup";
import { Committer } from "./core/Committer";
import type { commit } from "./core/Committer";
import StorageManager from "./storage/StorageManager";
import CategoryPopup from "./category/CategoryPopup";
import type { CategoryType } from "./category/Category";
import { ToastManager } from "./utilities/ToastManager";
import { TimeSystem } from "./core/TimeSystem";
const toastManager = new ToastManager();
async function bootstrap() {
    const storageManager = new StorageManager();
    const accounts = await storageManager.getAllAccounts();
    const goals = await storageManager.getAllGoals();
    const categories = await storageManager.getAllCategories();
    const transactions = await storageManager.getAllTransactions();
    const committer = new Committer({ storageManager });
    const liveStore = new LiveStore({
        accounts,
        goals,
        transactions,
        categories,
    });
    const domainOperator = new DomainOperator(
        liveStore,
        committer,
        toastManager,
    );

    const accountPopup = new AccountPopup(
        document.getElementById("popup-container")!,
        (input) => domainOperator.checkAccountInput(input),
        (account) => domainOperator.createAccount(account),
    );
    accountPopup;
    const goalPopup = new GoalPopup(
        document.getElementById("popup-container")!,
        (input) => domainOperator.checkGoalInput(input),
        (goal) => domainOperator.createGoal(goal),
    );
    const transactionPopup = new TransactionPopup(
        document.getElementById("popup-container")!,
        () => liveStore.accountManager.getAll(),
        (category: CategoryType) =>
            liveStore.categoryManager.getAllByCategory(category),
        (input) => domainOperator.checkTransactionInput(input),
        (transaction) => domainOperator.createTransaction(transaction),
    );
    const categoryPopup = new CategoryPopup(
        document.getElementById("popup-container")!,
        (input) => domainOperator.checkCategoryInput(input),
        (category) => domainOperator.createCategory(category),
    );

    document
        .getElementById("create-category-button")
        ?.addEventListener("click", () => categoryPopup.open());
    document
        .getElementById("create-transaction-button")
        ?.addEventListener("click", () => transactionPopup.open());
    document
        .getElementById("create-account-button")
        ?.addEventListener("click", () => accountPopup.open());
    document
        .getElementById("create-goal-button")
        ?.addEventListener("click", () => goalPopup.open());
    //replace later
    const accountsList = document.getElementById("accounts-list")!;
    const goalsList = document.getElementById("goals-list")!;
    const transactionsSection = document.createElement("section");
    const transactionsHeading = document.createElement("h2");
    transactionsHeading.textContent = "Transactions";
    const transactionsList = document.createElement("ul");
    transactionsSection.append(transactionsHeading, transactionsList);
    document
        .getElementById("create-transaction-button")
        ?.before(transactionsSection);

    function renderAccounts() {
        accountsList.replaceChildren();

        for (const account of liveStore.accountManager.getAll()) {
            const item = document.createElement("li");
            item.innerHTML = `${account.name} | ${account.type} | ${account.ownerShip} | ${account.status}
            <button >X</button>`;
            item.querySelector("button")?.addEventListener("click", () => {
                // domainOperator.archiveAccount(account.id);
            });
            accountsList.append(item);
        }
    }

    function renderGoals() {
        goalsList.replaceChildren();

        for (const goal of liveStore.goalManager.getAll()) {
            const item = document.createElement("li");
            const details = document.createElement("span");
            const targetDate = goal.targetDate
                ? `, target date ${new Date(goal.targetDate).toLocaleDateString()}`
                : "";
            details.textContent = `${goal.name} - ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} - ${goal.status}${targetDate}`;
            item.append(details);

            const action = document.createElement("button");
            action.type = "button";
            action.textContent =
                goal.status === "archived" ? "Restore" : "Archive";
            action.addEventListener("click", () => {
                if (goal.status === "archived") {
                    domainOperator.restoreGoal(goal.id);
                } else {
                    domainOperator.archiveGoal(goal.id);
                }
            });
            item.append(action);
            goalsList.append(item);
        }
    }

    function renderTransactions() {
        transactionsList.replaceChildren();

        const transactions = liveStore.transactionManager
            .getAllTransactions()
            .sort(
                (a, b) =>
                    b.date.localeCompare(a.date) ||
                    b.createdAt.localeCompare(a.createdAt),
            );

        if (transactions.length === 0) {
            const item = document.createElement("li");
            item.textContent = "No transactions yet";
            transactionsList.append(item);
            return;
        }

        for (const transaction of transactions) {
            const fromAccount =
                liveStore.accountManager.get(transaction.fromAccountId)?.name ??
                "Unknown account";
            const destination =
                transaction.type === "transfer" && transaction.toAccountId
                    ? ` → ${liveStore.accountManager.get(transaction.toAccountId)?.name ?? "Unknown account"}`
                    : "";
            const category =
                liveStore.categoryManager.get(transaction.categoryId)?.name ??
                "Unknown category";
            const item = document.createElement("li");
            item.textContent = `${transaction.date} | ${transaction.type} | ${transaction.amount.toLocaleString()} | ${fromAccount}${destination} | ${category}${transaction.note ? ` | ${transaction.note}` : ""}`;
            transactionsList.append(item);
        }
    }

    committer.eventEmitter.subscribe((data) => {
        console.log("Received commit event:", data);
        liveStore.updateStore(data as commit);
        renderAccounts();
        renderGoals();
        renderTransactions();
    });

    renderAccounts();
    renderGoals();
    renderTransactions();
}

// const ts = new TimeSystem({
//     timezone: "America/New_York", // or fetch dynamically from user profile
//     locale: "en-US",
//     firstDayOfWeek: 1, // Monday
// });
// console.log(ts.now());
void bootstrap();
