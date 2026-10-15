import { Goal } from "./Goal";

export class GoalManager {
    public goals: Goal[];

    constructor(goals: Goal[]) {
        this.goals = goals.map((goal) => new Goal(goal));
    }

    get(id: string): Goal | null {
        return this.goals.find((goal) => goal.id === id) ?? null;
    }

    nameExists(name: string): boolean {
        const normalizedName = name.trim().toLocaleLowerCase();
        return this.goals.some(
            (goal) => goal.name.trim().toLocaleLowerCase() === normalizedName,
        );
    }

    getAll(): Goal[] {
        return [...this.goals];
    }

    replaceGoal(newGoal: Goal): void {
        const oldGoal = this.get(newGoal.id);
        if (!oldGoal) {
            throw new Error("Goal not found");
        }
        this.goals[this.goals.indexOf(oldGoal)] = newGoal;
    }

    addGoal(goal: Goal): void {
        this.goals.push(goal);
    }
}
