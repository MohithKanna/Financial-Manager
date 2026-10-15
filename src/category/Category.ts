export type CategoryStatus = "active" | "archived";
export type CategoryType = "income" | "expense" | "transfer";

export interface CategoryOptions {
    readonly id: string;
    readonly name: string;
    readonly type: CategoryType;
    readonly status: CategoryStatus;
}

export interface CreateCategoryInput {
    name: string;
    type: CategoryType;
    status: CategoryStatus;
}

export class Category {
    public readonly id: string;
    public name: string;
    public type: CategoryType;
    public status: CategoryStatus;

    constructor(data: CategoryOptions) {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.status = data.status;
    }

    withChangeStatus(newStatus: CategoryStatus): Category {
        return new Category({
            ...this,
            status: newStatus,
        });
    }

    withChangeName(newName: string): Category {
        return new Category({
            ...this,
            name: newName,
        });
    }

    withChangeType(newType: CategoryType): Category {
        return new Category({
            ...this,
            type: newType,
        });
    }
}

export default Category;
