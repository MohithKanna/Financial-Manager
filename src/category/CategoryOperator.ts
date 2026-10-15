import { IdGenerator } from "../utilities/IdGenerator";
import { Category, type CreateCategoryInput } from "./Category";
import type CategoryManager from "./CategoryManager";

class CategoryOperator {
    constructor(private manager: CategoryManager) {}

    create(input: CreateCategoryInput): Category {
        const validationError = this.validate(input);
        if (validationError) {
            throw new Error(validationError);
        }

        const id = IdGenerator.generate("cat");

        return new Category({
            id,
            name: input.name.trim(),
            type: input.type,
            status: input.status,
        });
    }

    validate(input: CreateCategoryInput): string | null {
        const name = input.name.trim();

        if (name.length < 3) {
            return "Category name must be at least 3 characters";
        }

        if (this.manager.nameExists(name)) {
            return "A category with this name already exists";
        }

        if (!input.type) {
            return "Category type is required";
        }

        return null;
    }

    archive(category: Category): Category {
        return category.withChangeStatus("archived");
    }

    restore(category: Category): Category {
        return category.withChangeStatus("active");
    }
}

export default CategoryOperator;
