"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inheritanceService = exports.InheritanceService = void 0;
const category_repository_1 = require("../repositories/category.repository");
function resolveYesNo(childValue, parentDefault) {
    return childValue ?? parentDefault;
}
function resolveAdminCurated(childValue, parentDefault) {
    return childValue ?? parentDefault;
}
function resolveStatus(category, parent) {
    if (parent && parent.status === "DISABLED") {
        return "DISABLED";
    }
    return category.status;
}
class InheritanceService {
    async resolveEffectiveCategory(categoryId) {
        const category = await category_repository_1.categoryRepository.findByIdWithParent(categoryId);
        if (!category)
            return null;
        if (category.domain && category.domain !== "POLL") {
            return null;
        }
        const parent = category.parent ?? undefined;
        if (category.is_parent) {
            return {
                categoryId,
                effectiveClaimable: category.claimable_default,
                effectiveRequestAllowed: category.request_allowed_default,
                effectiveAdminCurated: category.admin_curated_default,
                effectiveStatus: resolveStatus(category, parent),
            };
        }
        if (!parent) {
            // Orphaned child; fall back to own overrides or safe defaults
            return {
                categoryId,
                effectiveClaimable: category.claimable ?? "NO",
                effectiveRequestAllowed: category.request_allowed ?? "NO",
                effectiveAdminCurated: category.admin_curated ?? "NO",
                effectiveStatus: category.status,
            };
        }
        const effectiveClaimable = resolveYesNo(category.claimable, parent.claimable_default);
        const effectiveRequestAllowed = resolveYesNo(category.request_allowed, parent.request_allowed_default);
        const effectiveAdminCurated = resolveAdminCurated(category.admin_curated, parent.admin_curated_default);
        const effectiveStatus = resolveStatus(category, parent);
        return {
            categoryId,
            effectiveClaimable,
            effectiveRequestAllowed,
            effectiveAdminCurated,
            effectiveStatus,
        };
    }
    async previewCategoryImpact(parentCategoryId, newDefaults) {
        const children = await category_repository_1.categoryRepository.findActiveChildrenForImpact(parentCategoryId, "POLL");
        // Mock-ish logic: any child inheriting a field (null override) is considered impacted
        const impacted = [];
        for (const child of children) {
            const inheritsClaimable = child.claimable == null;
            const inheritsRequest = child.request_allowed == null;
            const inheritsAdminCurated = child.admin_curated == null;
            if (inheritsClaimable || inheritsRequest || inheritsAdminCurated) {
                impacted.push(child.id);
            }
        }
        return {
            parentId: parentCategoryId,
            affectedChildCount: impacted.length,
            affectedChildIds: impacted.slice(0, 10),
        };
    }
}
exports.InheritanceService = InheritanceService;
exports.inheritanceService = new InheritanceService();
