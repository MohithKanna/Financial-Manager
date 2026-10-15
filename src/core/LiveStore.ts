import type { Account } from "../account/Account";
import { AccountManager } from "../account/AccountManager";
import type { Category } from "../category/Category";
import { CategoryManager } from "../category/CategoryManager";
import type { Goal } from "../goal/Goal";
import { GoalManager } from "../goal/GoalManager";
import type Transaction from "../transaction/Transaction";
import TransactionManager from "../transaction/TransactionManager";
import type { commit } from "./Committer";

export default class LiveStore {
    public accountManager: AccountManager;
    public transactionManager: TransactionManager;
    public goalManager: GoalManager;
    public categoryManager: CategoryManager;

    constructor(data: {
        accounts: Account[];
        goals: Goal[];
        transactions: Transaction[];
        categories: Category[];
    }) {
        this.accountManager = new AccountManager(data.accounts);
        this.goalManager = new GoalManager(data.goals);
        this.categoryManager = new CategoryManager(data.categories ?? []);
        this.transactionManager = new TransactionManager(data.transactions);
    }

    private eventHandlers = {
        new_account: (account: Account): void =>
            this.accountManager.addAccount(account),
        update_account: (account: Account): void =>
            this.accountManager.replaceAccount(account),
        new_goal: (goal: Goal): void => this.goalManager.addGoal(goal),
        update_goal: (goal: Goal): void => this.goalManager.replaceGoal(goal),
        new_category: (category: Category): void =>
            this.categoryManager.addCategory(category),
        update_category: (category: Category): void =>
            this.categoryManager.replaceCategory(category),
        new_transaction: (transaction: Transaction): void =>
            this.transactionManager.addTransaction(transaction),
    };
    updateStore(data: commit) {
        const { event, payload } = data;
        const query =
            this.eventHandlers[event as keyof typeof this.eventHandlers];
        if (query) {
            query(payload as any);
        } else {
            throw new Error("INVAILD OP IN LIVE STORE");
        }
    }
}
