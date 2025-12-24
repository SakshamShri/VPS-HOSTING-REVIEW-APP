import type { CategoryStatus } from "./category";

export type CategoryFormMode = "create" | "edit";
export type CategoryKind = "parent" | "child";

export type YesNo = "YES" | "NO";
export type AdminCurated = "YES" | "NO" | "PARTIAL";
export type RegionScope = "ALL" | "COUNTRY" | "STATE" | "CITY";

export interface CategoryFormValues {
  id?: string;
  name: string;
  description: string;
  kind: CategoryKind;
  parentCategoryId?: string;
  allowPollCreation: boolean;
  status: CategoryStatus;
  // Region visibility
  regionScope: RegionScope;
  country?: string;
  state?: string;
  city?: string;
  // Policy controls
  claimable: YesNo;
  requestAllowed: YesNo;
  adminCurated: AdminCurated;
}

export interface InheritedStates {
  allowPollCreation: boolean;
  status: CategoryStatus;
  claimable?: YesNo;
  requestAllowed?: YesNo;
  adminCurated?: AdminCurated;
}

export interface OverrideFlags {
  allowPollCreation: boolean;
  status: boolean;
  claimable: boolean;
  requestAllowed: boolean;
  adminCurated: boolean;
}
