import { Account, type CreateAccountInput } from "./Account";
import type { AccountManager } from "./AccountManager";
import { IdGenerator } from "../utilities/IdGenerator";

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
}

export default AccountOperator;
