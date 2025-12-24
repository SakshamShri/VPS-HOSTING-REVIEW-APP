export type CategoryStatus = "active" | "disabled";

export type CategoryType = "parent" | "child";

export interface CategoryNode {
  id: string;
  name: string;
  type: CategoryType;
  status: CategoryStatus;
  children?: CategoryNode[];
}
