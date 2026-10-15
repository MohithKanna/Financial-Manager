import type { Account } from "../account/Account";
import type { Category } from "../category/Category";
import type { Goal } from "../goal/Goal";
import type Transaction from "../transaction/Transaction";
import IndexedDBService from "./IndexedDB";

export default class StorageManager {
    private storage: IndexedDBService;
    constructor() {
        this.storage = new IndexedDBService("FMA", 2);
    }
    saveGoal(goal: Goal): Promise<IDBValidKey> {
        return this.storage.put("goals", goal);
    }
    getAllGoals(): Promise<Goal[]> {
        return this.storage.getAll<Goal>("goals");
    }
    saveAccount(account: Account): void {
        this.storage.put("accounts", account);
    }
    getAllAccounts(): Promise<Account[]> {
        return this.storage.getAll<Account>("accounts");
    }
    saveCategory(category: Category): void {
        this.storage.put("categories", category);
    }
    getAllCategories(): Promise<Category[]> {
        return this.storage.getAll<Category>("categories");
    }
    getAllTransactions(): Promise<Transaction[]> {
        return this.storage.getAll<Transaction>("transactions");
    }
    saveTransaction(transaction: Transaction): Promise<IDBValidKey> {
        return this.storage.put("transactions", transaction);
    }
}
