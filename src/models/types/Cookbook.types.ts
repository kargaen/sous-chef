export interface Cookbook {
  id: string;
  title: string;
  description?: string;
  parentId?: string | null;
  recipeIds: string[];
}

export interface CookbookInput {
  title: string;
  description?: string;
  parentId?: string | null;
  recipeIds: string[];
}
