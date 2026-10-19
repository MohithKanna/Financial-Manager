import { Account, type CreateAccountInput } from "./Account";
import type { AccountManager } from "./AccountManager";
import { IdGenerator } from "../utilities/IdGenerator";
import type { CreateTransactionInput } from "../transaction/Transaction";

class AccountOperator {
    constructor(private manager: AccountManager) {}

    create(input: CreateAccountInput): Account {
        const validationError = this.validate(input);
        if (validationError) {
            throw new Error(validationError);
        }
        const id = IdGenerator.generate("acc");
        const now = new Date();
        return new Account({
            id,
            name: input.name,
            openingBalance: input.balance,
            currentBalance: input.balance,
            type: input.type,
            status: input.status,
            ownerShip: input.ownerShip,
            createdAt: now,
            updatedAt: now,
        });
    }
    validate(input: CreateAccountInput): string | null {
        const name = input.name.trim();

        if (name.length <= 2) {
            return "Name must be at least 3 characters";
        }

        if (this.manager.nameExists(name)) {
            return "An account with this name already exists";
        }

        if (!Number.isFinite(input.balance)) {
            return "Amount must be a valid number";
        }

        return null;
    }
    archive(id: string): Account {
        const account = this.manager.get(id);
        if (!account) throw new Error("Account not found");
        return account.withChangeStatus("archived");
    }
    restore(id: string): Account {
        const account = this.manager.get(id);
        if (!account) throw new Error("Account not found");
        return account.withChangeStatus("active");
    }
    private isActive(id: string): boolean {
        if (!id) return false;
        const account = this.manager.get(id);
        if (!account || account.status !== "active") return false;
        return true;
    }
    checkAccounts(input: CreateTransactionInput): void {
        const { fromAccountId, toAccountId } = input;
        if (!this.isActive(fromAccountId)) {
            throw new Error("Invalid account");
        }
        if (input.type === "transfer") {
            if (!toAccountId || !this.isActive(toAccountId)) {
                throw new Error("Invalid destination account");
            }
            if (fromAccountId === toAccountId) {
                throw new Error(
                    "Source and destination accounts must be different",
                );
            }
        }
    }
    updateAccountBalance(
        id: string,
        amount: number,
        direction: "credit" | "debit",
    ): Account {
        const account = this.manager.get(id);

        if (!account) {
            throw new Error("Account not found");
        }

        const isOweAccount = account.ownerShip === "borrowed";

        const increasesBalance = isOweAccount
            ? direction === "debit"
            : direction === "credit";

        const newBalance = increasesBalance
            ? account.currentBalance + amount
            : account.currentBalance - amount;

        return account.withChangeBalance(newBalance);
    }
}

export default AccountOperator;
