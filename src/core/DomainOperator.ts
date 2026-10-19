import type LiveStore from "./LiveStore";
import AccountOperator from "../account/AccountOperator";
import type { CreateAccountInput } from "../account/Account";
import type { CreateCategoryInput } from "../category/Category";
import CategoryOperator from "../category/CategoryOperator";
import type { CreateGoalInput } from "../goal/Goal";
import GoalOperator from "../goal/GoalOperator";
import type { BatchCommit, Committer } from "./Committer";
import TransactionOperator from "../transaction/TransactionOperator";
import type { CreateTransactionInput } from "../transaction/Transaction";
import type { ToastManager } from "../utilities/ToastManager";
import type Transaction from "../transaction/Transaction";

export default class DomainOperator {
    private store: LiveStore;
    private committer: Committer;
    private accountOperator: AccountOperator;
    private categoryOperator: CategoryOperator;
    private goalOperator: GoalOperator;
    private transactionOperator: TransactionOperator;
    private toastManager: ToastManager;
    constructor(
        liveStore: LiveStore,
        committer: Committer,
        toastManager: ToastManager,
    ) {
        this.store = liveStore;
        this.committer = committer;
        this.transactionOperator = new TransactionOperator(
            this.store.transactionManager,
        );
        this.accountOperator = new AccountOperator(this.store.accountManager);
        this.categoryOperator = new CategoryOperator(
            this.store.categoryManager,
        );
        this.toastManager = toastManager;
        this.goalOperator = new GoalOperator(this.store.goalManager);
    }
    createGoal(input: CreateGoalInput) {
        try {
            const goal = this.goalOperator.create(input);
            void this.committer.goalChanges({
                event: "new_goal",
                payload: goal,
            });
        } catch (error) {
            console.error("Error creating goal:", error);
        }
    }
    createAccount(input: CreateAccountInput) {
        try {
            const account = this.accountOperator.create(input);
            this.committer.accountChanges({
                event: "new_account",
                payload: account,
            });
        } catch (error) {
            console.error("Error creating account:", error);
        }
    }
    createCategory(input: CreateCategoryInput) {
        try {
            const category = this.categoryOperator.create(input);
            void this.committer.categoryChanges({
                event: "new_category",
                payload: category,
            });
        } catch (error) {
            console.error("Error creating category:", error);
        }
    }
    async createTransaction(input: CreateTransactionInput) {
        try {
            this.accountOperator.checkAccounts(input);
            const transaction = this.transactionOperator.create(input);
            await this.processTrasactionChanges(transaction);
            this.toastManager.success("Transaction Created", {
                action: {
                    label: "undo",
                    onClick: () => {
                        console.log("undoing", transaction.id);
                    },
                },
            });
        } catch (error: any) {
            this.toastManager.error(error.message);
            throw error;
        }
    }
    async processTrasactionChanges(tnx: Transaction) {
        let batch: BatchCommit[] = [
            { entity: "transaction", event: "new_transaction", payload: tnx },
        ];
        if (tnx.type === "income") {
            batch.push({
                entity: "account",
                event: "update_account",
                payload: this.accountOperator.updateAccountBalance(
                    tnx.fromAccountId,
                    tnx.amount,
                    "credit",
                ),
            });
        } else if (tnx.type === "expense") {
            batch.push({
                entity: "account",
                event: "update_account",
                payload: this.accountOperator.updateAccountBalance(
                    tnx.fromAccountId,
                    tnx.amount,
                    "debit",
                ),
            });
        } else {
            if (!tnx.toAccountId) {
                throw new Error("Destination account is required");
            }
            batch.push(
                {
                    entity: "account",
                    event: "update_account",
                    payload: this.accountOperator.updateAccountBalance(
                        tnx.fromAccountId,
                        tnx.amount,
                        "debit",
                    ),
                },
                {
                    entity: "account",
                    event: "update_account",
                    payload: this.accountOperator.updateAccountBalance(
                        tnx.toAccountId,
                        tnx.amount,
                        "credit",
                    ),
                },
            );
        }
        await this.committer.batchChanges(batch);
    }

    archiveAccount(id: string) {
        try {
            const account = this.accountOperator.archive(id);
            this.committer.accountChanges({
                event: "update_account",
                payload: account,
            });
        } catch (error) {
            console.error("Error archiving account:", error);
        }
    }
    archiveGoal(id: string) {
        try {
            const goal = this.goalOperator.archive(id);
            void this.committer.goalChanges({
                event: "update_goal",
                payload: goal,
            });
        } catch (error) {
            console.error("Error archiving goal:", error);
        }
    }
    restoreGoal(id: string) {
        try {
            const goal = this.goalOperator.restore(id);
            void this.committer.goalChanges({
                event: "update_goal",
                payload: goal,
            });
        } catch (error) {
            console.error("Error restoring goal:", error);
        }
    }
    updateGoalAmount(id: string, currentAmount: number) {
        try {
            const goal = this.goalOperator.updateAmount(id, currentAmount);
            void this.committer.goalChanges({
                event: "update_goal",
                payload: goal,
            });
        } catch (error) {
            console.error("Error updating goal progress:", error);
        }
    }
    changeGoalName(id: string, name: string) {
        try {
            const goal = this.goalOperator.changeName(id, name);
            void this.committer.goalChanges({
                event: "update_goal",
                payload: goal,
            });
        } catch (error) {
            console.error("Error changing goal name:", error);
        }
    }
    restoreAccount(id: string) {
        try {
            const account = this.accountOperator.restore(id);
            this.committer.accountChanges({
                event: "update_account",
                payload: account,
            });
        } catch (error) {
            console.error("Error restoring account:", error);
        }
    }

    checkTransactionInput(input: CreateTransactionInput): string | null {
        return this.transactionOperator.validate(input);
    }
    checkAccountInput(input: CreateAccountInput): string | null {
        return this.accountOperator.validate(input);
    }
    checkCategoryInput(input: CreateCategoryInput): string | null {
        return this.categoryOperator.validate(input);
    }
    checkGoalInput(input: CreateGoalInput): string | null {
        return this.goalOperator.validate(input);
    }
}
// "active" to "archive" can be decided by caller, simplifies into one method not two
