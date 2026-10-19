import TransactionManager from "./TransactionManager";
import Transaction from "./Transaction";
import type { CreateTransactionInput, TransactionType } from "./Transaction";
import { IdGenerator } from "../utilities/IdGenerator";
class TransactionOperator {
    private manager: TransactionManager;
    constructor(manager: TransactionManager) {
        this.manager = manager;
    }
    create(input: CreateTransactionInput): Transaction {
        const validationError = this.validate(input);
        if (validationError) {
            throw new Error(validationError);
        }
        const now = new Date();
        const id = IdGenerator.generate("txn");

        return new Transaction({
            id,
            type: input.type,
            amount: input.amount,
            date: input.date,
            note: input.note,
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            categoryId: input.categoryId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        });
    }
    validate(input: CreateTransactionInput): string | null {
        if (!Number.isFinite(input.amount) || input.amount <= 0) {
            return "Amount must be a valid number greater than zero";
        }

        if (!input.date || Number.isNaN(Date.parse(input.date))) {
            return "Enter a valid transaction date";
        }

        if (!input.categoryId) {
            return "Category is required";
        }

        return null;
    }
    changeNote(id: string, note: string): Transaction {
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        return transaction.withChangeNote(note);
    }
    changeCategory(id: string, categoryId: string): Transaction {
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        return transaction.withChangeCategory(categoryId);
    }
    changeDate(id: string, date: string): Transaction {
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        return transaction.withChangeDate(date);
    }
    changeAmount(id: string, amount: number): Transaction {
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        return transaction.withChangeAmount(amount);
    }
    changeFromAccountId(id: string, fromAccountId: string): Transaction {
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        return transaction.withChangeFromAccountId(fromAccountId);
    }
    changeToAccountId(id: string, toAccountId: string): Transaction {
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }

        return transaction.withChangeToAccountId(toAccountId);
    }
    changeType(id: string, type: TransactionType): Transaction {
        return this.get(id).withChangeType(type);
    }
    get(id: string): Transaction {
        //consider using
        const transaction = this.manager?.getTransaction(id);
        if (!transaction) {
            throw new Error("Transaction not found");
        }
        return transaction;
    }
}

export default TransactionOperator;
