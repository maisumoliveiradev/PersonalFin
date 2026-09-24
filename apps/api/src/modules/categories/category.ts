export const CATEGORY_KINDS = ['expense', 'income'] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export interface Category {
  id: string;
  financialSpaceId: string;
  parentCategoryId: string | null;
  kind: CategoryKind;
  name: string;
  position: number;
  defaultKey: string | null;
}

export interface CategoryTreeNode {
  category: Category;
  subcategories: Category[];
}

export function buildCategoryTree(categories: readonly Category[]): CategoryTreeNode[] {
  const byPosition = (left: Category, right: Category) => left.position - right.position;
  return categories
    .filter((category) => category.parentCategoryId === null)
    .sort(byPosition)
    .map((category) => ({
      category,
      subcategories: categories
        .filter((candidate) => candidate.parentCategoryId === category.id)
        .sort(byPosition),
    }));
}
