import { Account } from "./Account";

//  for live store data
export class AccountManager {
    public accounts: Account[];
    constructor(accounts: Account[]) {
        this.accounts = accounts.map((account) => new Account(account));
    }
    get(id: string): Account | null {
        return this.accounts.find((acc) => acc.id === id) || null;
    }
    nameExists(name: string): boolean {
        return this.accounts.some((acc) => acc.name === name);
    }
    getAll(): Account[] {
        return [...this.accounts];
    }
    replaceAccount(newAccount: Account): void {
        const oldAccount = this.get(newAccount.id);
        if (!oldAccount) throw new Error("Account not found");
        const index = this.accounts.indexOf(oldAccount);
        this.accounts[index] = newAccount;
    }
    addAccount(account: Account): void {
        this.accounts.push(account);
    }
}
