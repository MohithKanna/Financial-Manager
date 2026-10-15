import type LiveStore from "./LiveStore";
import AccountOperator from "../account/AccountOperator";
import type { CreateAccountInput } from "../account/Account";
import type { CreateCategoryInput } from "../category/Category";
import CategoryOperator from "../category/CategoryOperator";
import type { CreateGoalInput } from "../goal/Goal";
import GoalOperator from "../goal/GoalOperator";
import type { Committer } from "./Committer";
import TransactionOperator from "../transaction/TransactionOperator";
import type { CreateTransactionInput } from "../transaction/Transaction";

export default class DomainOperator {
    private store: LiveStore;
    private committer: Committer;
    private accountOperator: AccountOperator;
    private categoryOperator: CategoryOperator;
    private goalOperator: GoalOperator;
    private transactionOperator: TransactionOperator;
    constructor(liveStore: LiveStore, committer: Committer) {
        this.store = liveStore;
        this.committer = committer;
        this.transactionOperator = new TransactionOperator(
            this.store.transactionManager,
        );
        this.accountOperator = new AccountOperator(this.store.accountManager);
        this.categoryOperator = new CategoryOperator(
            this.store.categoryManager,
        );
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
    createTransaction(input: CreateTransactionInput) {
        try {
            const transaction = this.transactionOperator.create(input);
            void this.committer.transactionChanges({
                event: "new_transaction",
                payload: transaction,
            });
        } catch (error) {
            console.error("Error creating transaction:", error);
        }
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
