export type AccountType = "cash" | "wallet" | "bank" | "credit" | "loan";
export type AccountStatus = "active" | "archived";
export type OwnershipType = "owned" | "borrowed";

export interface AccountOptions {
    id: string;
    name: string;
    openingBalance: number;
    currentBalance: number;
    type: AccountType;
    status: AccountStatus;
    ownerShip: OwnershipType;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateAccountInput {
    name: string;
    balance: number;
    type: AccountType; // may lock type changing
    status: AccountStatus;
    ownerShip: OwnershipType;
}
export class Account {
    public readonly id: string;
    public name: string;
    public type: AccountType;
    public status: AccountStatus;
    public currentBalance: number;
    public updatedAt: Date;
    public readonly ownerShip: OwnershipType;
    public readonly openingBalance: number;
    public readonly createdAt: Date;

    constructor(options: AccountOptions) {
        this.id = options.id;
        this.name = options.name;
        this.type = options.type;
        this.status = options.status;
        this.openingBalance = options.openingBalance;
        this.currentBalance = options.currentBalance;
        this.createdAt = options.createdAt;
        this.updatedAt = options.updatedAt;
        this.ownerShip = options.ownerShip;
    }
    withChangeStatus(newStatus: AccountStatus): Account {
        return new Account({
            ...this,
            status: newStatus,
            updatedAt: new Date(),
        });
    }
    withChangeType(newType: AccountType): Account {
        return new Account({
            ...this,
            type: newType,
            updatedAt: new Date(),
        });
    }
    withChangeOwnership(newOwnership: OwnershipType): Account {
        return new Account({
            ...this,
            ownerShip: newOwnership,
            updatedAt: new Date(),
        });
    }

    withChangeName(newName: string): Account {
        return new Account({
            ...this,
            name: newName,
            updatedAt: new Date(),
        });
    }
    withChangeBalance(newBalance: number): Account {
        return new Account({
            ...this,
            currentBalance: newBalance,
            updatedAt: new Date(),
        });
    }
}
