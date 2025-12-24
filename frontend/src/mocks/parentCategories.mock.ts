import type { CategoryNode } from "../types/category";
import { categoryTreeMock } from "./categories.mock";

// Parent categories derived from the shared category tree mock.
export const parentCategoriesMock: CategoryNode[] = categoryTreeMock.filter(
  (node) => node.type === "parent"
);
