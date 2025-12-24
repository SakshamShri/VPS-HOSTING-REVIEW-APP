import type { AdminCuratedLevel, CategoryStatus, YesNo } from "@prisma/client";

export type CategoryId = bigint;

export interface CategoryCreateDTO {
  name_en: string;
  name_local?: string | null;
  description?: string | null;
  is_parent: boolean;
  parent_id?: CategoryId;
  claimable_default: YesNo;
  request_allowed_default: YesNo;
  admin_curated_default: AdminCuratedLevel;
  claimable?: YesNo | null;
  request_allowed?: YesNo | null;
  admin_curated?: AdminCuratedLevel | null;
  status: CategoryStatus;
  display_order?: number;
  notes?: string | null;
  claim_requirements?: unknown | null;
  request_requirements?: unknown | null;
  psi_parameters?: unknown | null;
}

export type CategoryUpdateDTO = Partial<CategoryCreateDTO>;

export interface CategoryTreeNodeDTO {
  id: CategoryId;
  name_en: string;
  is_parent: boolean;
  status: CategoryStatus;
  children: CategoryTreeNodeDTO[];
}

export interface EffectiveCategoryValues {
  categoryId: CategoryId;
  effectiveClaimable: YesNo;
  effectiveRequestAllowed: YesNo;
  effectiveAdminCurated: AdminCuratedLevel;
  effectiveStatus: CategoryStatus;
}

export interface ParentDefaultsInput {
  claimable_default: YesNo;
  request_allowed_default: YesNo;
  admin_curated_default: AdminCuratedLevel;
  status?: CategoryStatus;
}

export interface ImpactPreviewResult {
  parentId: CategoryId;
  affectedChildCount: number;
  affectedChildIds: CategoryId[];
}
