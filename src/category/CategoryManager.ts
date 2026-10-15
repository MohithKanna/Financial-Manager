import { Category, type CategoryType } from "./Category";

export class CategoryManager {
    public categories: Category[];

    constructor(categories: Category[]) {
        this.categories = categories.map((category) => new Category(category));
    }

    get(id: string): Category | null {
        return this.categories.find((category) => category.id === id) || null;
    }

    nameExists(name: string): boolean {
        return this.categories.some((category) => category.name === name);
    }

    getAll(): Category[] {
        return [...this.categories];
    }
    getAllByCategory(categoryType: CategoryType): Category[] {
        if (categoryType === "income") {
            return this.categories.filter((cat) => cat.type === categoryType);
        } else if (categoryType === "expense") {
            return this.categories.filter((cat) => cat.type === categoryType);
        } else if (categoryType === "transfer") {
            return this.categories.filter((cat) => cat.type === categoryType);
        } else {
            console.warn("Getting categories without type");
            return [...this.categories];
        }
    }

    replaceCategory(newCategory: Category): void {
        const oldCategory = this.get(newCategory.id);
        if (!oldCategory) throw new Error("Category not found");
        const index = this.categories.indexOf(oldCategory);
        this.categories[index] = newCategory;
    }

    addCategory(category: Category): void {
        this.categories.push(category);
    }
}

export default CategoryManager;
