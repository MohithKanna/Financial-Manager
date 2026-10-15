import Transaction from "./Transaction";

class TransactionManager {
    public transactions: Transaction[];

    constructor(transactions: Transaction[]) {
        this.transactions = transactions.map(
            (transaction) => new Transaction(transaction),
        );
    }

    getTransaction(id: string): Transaction | null {
        this.transactions;
        return this.transactions.find((txn) => txn.id === id) || null;
    }

    addTransaction(transaction: Transaction): void {
        this.transactions.push(transaction);
    }

    replaceTransaction(newTransaction: Transaction): void {
        const oldTransaction = this.getTransaction(newTransaction.id);
        if (!oldTransaction) throw new Error("Transaction not found");
        const index = this.transactions.indexOf(oldTransaction);
        this.transactions[index] = newTransaction;
    }
    getAllTransactions(): Transaction[] {
        return [...this.transactions];
    }
}

export default TransactionManager;
