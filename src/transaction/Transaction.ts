interface TransactionData {
    readonly id: string;
    type: TransactionType;
    readonly amount: number;
    readonly date: string;
    note?: string;
    srcAccountId: string;
    dstAccountId?: string;
    categoryId: string;
    readonly createdAt: string;
    updatedAt: string;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface CreateTransactionInput {
    type: TransactionType;
    amount: number;
    date: string;
    note?: string;
    srcAccountId: string;
    dstAccountId?: string;
    categoryId: string;
}

class Transaction {
    // all readonly
    readonly id: string;
    readonly type: TransactionType;
    readonly amount: number;
    readonly date: string;
    readonly note?: string;
    readonly srcAccountId: string;
    readonly dstAccountId?: string;
    readonly categoryId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    constructor(data: TransactionData) {
        this.id = data.id;
        this.type = data.type;
        this.amount = data.amount;
        this.date = data.date;
        this.note = data.note;
        this.srcAccountId = data.srcAccountId;
        this.dstAccountId = data.dstAccountId;
        this.categoryId = data.categoryId;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }
    withChangeNote(note: string): Transaction {
        return new Transaction({
            ...this,
            note,
            updatedAt: new Date().toISOString(),
        });
    }
    withChangeCategory(categoryId: string): Transaction {
        return new Transaction({
            ...this,
            categoryId,
            updatedAt: new Date().toISOString(),
        });
    }
    withChangeDate(date: string): Transaction {
        return new Transaction({
            ...this,
            date,
            updatedAt: new Date().toISOString(),
        });
    }
    withChangeAmount(amount: number): Transaction {
        return new Transaction({
            ...this,
            amount,
            updatedAt: new Date().toISOString(),
        });
    }
    withChangeSrcAccountId(srcAccountId: string): Transaction {
        return new Transaction({
            ...this,
            srcAccountId,
            updatedAt: new Date().toISOString(),
        });
    }
    withChangeDstAccountId(dstAccountId: string): Transaction {
        return new Transaction({
            ...this,
            dstAccountId,
            updatedAt: new Date().toISOString(),
        });
    }
    withChangeType(type: TransactionType): Transaction {
        return new Transaction({
            ...this,
            type,
            updatedAt: new Date().toISOString(),
        });
    }
}

export default Transaction;
