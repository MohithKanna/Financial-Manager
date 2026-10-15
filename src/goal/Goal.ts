export type GoalStatus = "active" | "archived" | "achieved";

export interface GoalOptions {
    id: string;
    name: string;
    targetAmount: number;
    targetDate?: number;
    currentAmount: number;
    createdOn: Date;
    updatedAt: Date;
    status: GoalStatus;
}

export interface CreateGoalInput {
    name: string;
    targetAmount: number;
    targetDate?: number;
    currentAmount: number;
}

export class Goal {
    public readonly id: string;
    public readonly name: string;
    public readonly targetAmount: number;
    public readonly targetDate?: number;
    public readonly currentAmount: number;
    public readonly createdOn: Date;
    public readonly updatedAt: Date;
    public readonly status: GoalStatus;

    constructor(data: GoalOptions) {
        this.id = data.id;
        this.name = data.name;
        this.targetAmount = data.targetAmount;
        this.targetDate = data.targetDate;
        this.currentAmount = data.currentAmount;
        this.createdOn = data.createdOn;
        this.updatedAt = data.updatedAt;
        this.status = data.status;
    }

    withChangeName(name: string): Goal {
        return this.withChanges({ name });
    }

    withChangeCurrentAmount(currentAmount: number): Goal {
        return this.withChanges({ currentAmount });
    }

    withChangeStatus(status: GoalStatus): Goal {
        return this.withChanges({ status });
    }

    private withChanges(changes: Partial<GoalOptions>): Goal {
        return new Goal({
            ...this,
            ...changes,
            updatedAt: new Date(),
        });
    }
}
