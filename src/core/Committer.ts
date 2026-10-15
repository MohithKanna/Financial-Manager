import type { Account } from "../account/Account";
import type { Category } from "../category/Category";
import { Goal } from "../goal/Goal";
import StorageManager from "../storage/StorageManager";
import type Transaction from "../transaction/Transaction";
import EventEmitter from "../utilities/EventEmitter";

export type commit = {
    event: string;
    payload: unknown;
};

export class Committer {
    public eventEmitter: EventEmitter<object> = new EventEmitter();
    private storageManager: StorageManager;
    constructor(payload: { storageManager: StorageManager }) {
        this.storageManager = payload.storageManager;
    }

    async accountChanges(data: commit) {
        try {
            await this.storageManager.saveAccount(data.payload as Account);
            this.eventEmitter.notify(data);
        } catch (error) {
            console.error(error);
        }
    }
    async goalChanges(data: commit) {
        try {
            await this.storageManager.saveGoal(data.payload as Goal);
            this.eventEmitter.notify(data);
        } catch (error) {
            console.error(error);
        }
    }
    async categoryChanges(data: commit) {
        try {
            await this.storageManager.saveCategory(data.payload as Category);
            this.eventEmitter.notify(data);
        } catch (error) {
            console.error(error);
        }
    }
    async transactionChanges(data: commit) {
        try {
            await this.storageManager.saveTransaction(
                data.payload as Transaction,
            );
            this.eventEmitter.notify(data);
        } catch (error) {
            console.error(error);
        }
    }
}
