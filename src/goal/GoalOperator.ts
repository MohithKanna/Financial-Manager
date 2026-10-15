import { IdGenerator } from "../utilities/IdGenerator";
import { Goal, type CreateGoalInput } from "./Goal";
import type { GoalManager } from "./GoalManager";

export default class GoalOperator {
    constructor(private readonly manager: GoalManager) {}

    create(input: CreateGoalInput): Goal {
        const validationError = this.validate(input);
        if (validationError) {
            throw new Error(validationError);
        }

        const now = new Date();
        return new Goal({
            id: IdGenerator.generate("goal"),
            name: input.name.trim(),
            targetAmount: input.targetAmount,
            targetDate: input.targetDate,
            currentAmount: input.currentAmount,
            createdOn: now,
            updatedAt: now,
            status:
                input.currentAmount >= input.targetAmount ? "achieved" : "active",
        });
    }

    validate(input: CreateGoalInput): string | null {
        const name = input.name.trim();
        if (name.length < 3) {
            return "Goal name must be at least 3 characters";
        }

        if (this.manager.nameExists(name)) {
            return "A goal with this name already exists";
        }

        if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0) {
            return "Target amount must be a valid number greater than zero";
        }

        if (!Number.isFinite(input.currentAmount) || input.currentAmount < 0) {
            return "Current amount must be a valid number zero or greater";
        }

        if (
            input.targetDate !== undefined &&
            !Number.isFinite(input.targetDate)
        ) {
            return "Enter a valid target date";
        }

        return null;
    }

    archive(id: string): Goal {
        return this.get(id).withChangeStatus("archived");
    }

    restore(id: string): Goal {
        const goal = this.get(id);
        return goal.withChangeStatus(
            goal.currentAmount >= goal.targetAmount ? "achieved" : "active",
        );
    }

    updateAmount(id: string, currentAmount: number): Goal {
        if (!Number.isFinite(currentAmount) || currentAmount < 0) {
            throw new Error("Current amount must be a valid number zero or greater");
        }

        const goal = this.get(id);
        const updatedGoal = goal.withChangeCurrentAmount(currentAmount);
        if (goal.status === "archived") {
            return updatedGoal;
        }

        return updatedGoal.withChangeStatus(
            currentAmount >= goal.targetAmount ? "achieved" : "active",
        );
    }

    changeName(id: string, name: string): Goal {
        const normalizedName = name.trim();
        if (normalizedName.length < 3) {
            throw new Error("Goal name must be at least 3 characters");
        }

        if (
            this.manager
                .getAll()
                .some(
                    (goal) =>
                        goal.id !== id &&
                        goal.name.trim().toLocaleLowerCase() ===
                            normalizedName.toLocaleLowerCase(),
                )
        ) {
            throw new Error("A goal with this name already exists");
        }

        return this.get(id).withChangeName(normalizedName);
    }

    private get(id: string): Goal {
        const goal = this.manager.get(id);
        if (!goal) {
            throw new Error("Goal not found");
        }
        return goal;
    }
}
