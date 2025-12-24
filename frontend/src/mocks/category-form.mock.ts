import type { CategoryFormState, FormMode } from "../types/category-form";

export const mockCreateState: CategoryFormState = {
  mode: "create",
  values: {
    name: "",
    description: "",
    type: "parent",
    parentCategoryId: "",
    allowPollCreation: true,
    status: "active",
  },
  overrides: {
    allowPollCreation: false,
    status: false,
  },
};

export const mockEditParentState: CategoryFormState = {
  mode: "edit",
  values: {
    id: "engagement",
    name: "Engagement",
    description: "All engagement and satisfaction related polls",
    type: "parent",
    allowPollCreation: true,
    status: "active",
  },
  overrides: {
    allowPollCreation: false,
    status: false,
  },
};

export const mockEditChildState: CategoryFormState = {
  mode: "edit",
  values: {
    id: "nps",
    name: "Net Promoter Score",
    description: "Customer loyalty and recommendation metrics",
    type: "child",
    parentCategoryId: "engagement",
    allowPollCreation: true,
    status: "active",
  },
  inherited: {
    allowPollCreation: true,
    status: "active",
  },
  overrides: {
    allowPollCreation: false,
    status: false,
  },
};
