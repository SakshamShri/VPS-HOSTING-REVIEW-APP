import type {
  CategoryFormValues,
  CategoryFormMode,
  InheritedStates,
  OverrideFlags,
} from "../types/category.form.types";

export type CategoryEditMock = {
  mode: CategoryFormMode;
  values: CategoryFormValues;
  inherited?: Partial<InheritedStates>;
  overrides: OverrideFlags;
};

export const editParentCategoryMock: CategoryEditMock = {
  mode: "edit",
  values: {
    id: "engagement",
    name: "Engagement",
    description: "All engagement and satisfaction related polls.",
    kind: "parent",
    allowPollCreation: true,
    status: "active",
    regionScope: "ALL",
    country: "INDIA",
    state: "",
    city: "",
    claimable: "YES",
    requestAllowed: "YES",
    adminCurated: "PARTIAL",
  },
  overrides: {
    allowPollCreation: false,
    status: false,
    claimable: false,
    requestAllowed: false,
    adminCurated: false,
  },
};

export const editChildCategoryMock: CategoryEditMock = {
  mode: "edit",
  values: {
    id: "nps",
    name: "Net Promoter Score",
    description: "Customer loyalty and recommendation metrics.",
    kind: "child",
    parentCategoryId: "engagement",
    allowPollCreation: true,
    status: "active",
    regionScope: "STATE",
    country: "INDIA",
    state: "KA",
    city: "",
    claimable: "YES",
    requestAllowed: "YES",
    adminCurated: "PARTIAL",
  },
  inherited: {
    allowPollCreation: true,
    status: "active",
    claimable: "YES",
    requestAllowed: "YES",
    adminCurated: "PARTIAL",
  },
  overrides: {
    allowPollCreation: false,
    status: false,
    claimable: false,
    requestAllowed: false,
    adminCurated: false,
  },
};
