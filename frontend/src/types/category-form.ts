import type { CategoryNode, CategoryStatus } from "./category";

export type FormMode = "create" | "edit";

export type { CategoryStatus };

export interface CategoryFormValues {
  id?: string;
  name: string;
  description: string;
  type: "parent" | "child";
  parentCategoryId?: string;
  allowPollCreation?: boolean;
  status: CategoryStatus;
}

export interface InheritedField {
  allowPollCreation?: boolean;
  status?: CategoryStatus;
}

export interface OverrideState {
  allowPollCreation: boolean;
  status: boolean;
}

export interface CategoryFormState {
  mode: FormMode;
  values: CategoryFormValues;
  inherited?: InheritedField;
  overrides: OverrideState;
}
