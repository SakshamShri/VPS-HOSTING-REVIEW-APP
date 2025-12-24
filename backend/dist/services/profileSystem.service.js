"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSystemService = exports.ProfileSystemService = void 0;
const db_1 = require("../utils/db");
const profileRequirements_1 = require("../utils/profileRequirements");
function parseBigIntId(value) {
    try {
        return BigInt(value);
    }
    catch {
        const err = new Error("INVALID_ID");
        err.code = "INVALID_ID";
        throw err;
    }
}
async function assertUserIdentityVerifiedOrThrow(userId) {
    const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const err = new Error("USER_NOT_FOUND");
        err.code = "USER_NOT_FOUND";
        throw err;
    }
    if (!user.identity_verified) {
        const err = new Error("IDENTITY_NOT_VERIFIED");
        err.code = "IDENTITY_NOT_VERIFIED";
        throw err;
    }
}
function normalizeLevel(level) {
    if (level === "PROFILE_PARENT")
        return { is_parent: false };
    return { is_parent: true };
}
async function getProfileCategoryOrThrow(id) {
    const category = await db_1.prisma.category.findUnique({ where: { id } });
    if (!category) {
        const err = new Error("CATEGORY_NOT_FOUND");
        err.code = "CATEGORY_NOT_FOUND";
        throw err;
    }
    return category;
}
async function assertProfileCategoryHierarchyOrThrow(input) {
    if (input.level === "ROOT") {
        if (input.parentId != null) {
            const err = new Error("INVALID_PARENT");
            err.code = "INVALID_PARENT";
            throw err;
        }
        return;
    }
    if (input.parentId == null) {
        const err = new Error("INVALID_PARENT");
        err.code = "INVALID_PARENT";
        throw err;
    }
    const parent = await getProfileCategoryOrThrow(input.parentId);
    const parentLevel = parent.profile_level;
    if (input.level === "SUB") {
        if (parentLevel !== "ROOT") {
            const err = new Error("INVALID_PARENT");
            err.code = "INVALID_PARENT";
            throw err;
        }
        return;
    }
    if (input.level === "PROFILE_PARENT") {
        if (parentLevel !== "SUB") {
            const err = new Error("INVALID_PARENT");
            err.code = "INVALID_PARENT";
            throw err;
        }
        return;
    }
    const err = new Error("INVALID_LEVEL");
    err.code = "INVALID_LEVEL";
    throw err;
}
class ProfileSystemService {
    async listProfileCategoryTreeAdmin() {
        const flat = await db_1.prisma.category.findMany({
            where: { domain: "PROFILE" },
            orderBy: { display_order: "asc" },
        });
        const nodes = new Map();
        const roots = [];
        for (const c of flat) {
            nodes.set(c.id, {
                id: c.id.toString(),
                name_en: c.name_en,
                level: c.profile_level,
                status: c.status,
                parent_id: c.parent_id ? c.parent_id.toString() : null,
                profile_claimable: c.profile_claimable,
                profile_request_allowed: c.profile_request_allowed,
                profile_admin_curated: c.profile_admin_curated,
                claim_requirements: c.claim_requirements,
                request_requirements: c.request_requirements,
                children: [],
            });
        }
        for (const c of flat) {
            const node = nodes.get(c.id);
            if (c.parent_id && nodes.has(c.parent_id)) {
                nodes.get(c.parent_id).children.push(node);
            }
            else {
                roots.push(node);
            }
        }
        return roots;
    }
    async createProfileCategoryAdmin(input) {
        const parentId = input.parent_id ? parseBigIntId(input.parent_id) : null;
        await assertProfileCategoryHierarchyOrThrow({
            level: input.level,
            parentId,
        });
        const { is_parent } = normalizeLevel(input.level);
        const created = await db_1.prisma.category.create({
            data: {
                name_en: input.name_en,
                name_local: null,
                description: input.description ?? null,
                domain: "PROFILE",
                profile_level: input.level,
                profile_claimable: input.claimable,
                profile_request_allowed: input.request_allowed,
                profile_admin_curated: input.admin_curated,
                claim_requirements: input.claim_requirements ?? { fields: [] },
                request_requirements: input.request_requirements ?? { fields: [] },
                is_parent,
                parent_id: parentId,
                claimable_default: "NO",
                request_allowed_default: "NO",
                admin_curated_default: "NO",
                claimable: null,
                request_allowed: null,
                admin_curated: null,
                status: input.status,
                display_order: 0,
                notes: null,
            },
        });
        return created;
    }
    async updateProfileCategoryAdmin(id, patch) {
        const categoryId = parseBigIntId(id);
        const existing = await getProfileCategoryOrThrow(categoryId);
        const nextLevel = (patch.level ?? existing.profile_level);
        const nextParentIdRaw = patch.parent_id === undefined ? (existing.parent_id ? existing.parent_id.toString() : null) : patch.parent_id;
        const nextParentId = nextParentIdRaw ? parseBigIntId(nextParentIdRaw) : null;
        await assertProfileCategoryHierarchyOrThrow({
            level: nextLevel,
            parentId: nextParentId,
        });
        if (nextLevel === "PROFILE_PARENT") {
            const childCount = await db_1.prisma.category.count({ where: { parent_id: categoryId } });
            if (childCount > 0) {
                const err = new Error("CATEGORY_HAS_CHILDREN");
                err.code = "CATEGORY_HAS_CHILDREN";
                throw err;
            }
        }
        const { is_parent } = normalizeLevel(nextLevel);
        const updated = await db_1.prisma.category.update({
            where: { id: categoryId },
            data: {
                name_en: patch.name_en ?? undefined,
                description: patch.description ?? undefined,
                profile_level: patch.level ?? undefined,
                parent_id: patch.parent_id === undefined ? undefined : nextParentId,
                status: patch.status ?? undefined,
                profile_claimable: patch.claimable ?? undefined,
                profile_request_allowed: patch.request_allowed ?? undefined,
                profile_admin_curated: patch.admin_curated ?? undefined,
                claim_requirements: patch.claim_requirements ?? undefined,
                request_requirements: patch.request_requirements ?? undefined,
                is_parent,
            },
        });
        return updated;
    }
    async listProfilesAdmin(params = {}) {
        const where = {};
        if (params.category_id) {
            where.category_id = parseBigIntId(params.category_id);
        }
        const items = await db_1.prisma.profile.findMany({
            where,
            include: {
                category: true,
                claimed_by_user: true,
            },
            orderBy: { created_at: "desc" },
        });
        return items.map((p) => ({
            id: p.id.toString(),
            name: p.name,
            status: p.status,
            is_claimed: p.is_claimed,
            claimed_by_user_id: p.claimed_by_user_id ? p.claimed_by_user_id.toString() : null,
            category_id: p.category_id.toString(),
            category_name: p.category?.name_en ?? "",
            created_at: p.created_at,
            updated_at: p.updated_at,
        }));
    }
    async createProfileAdmin(input) {
        const categoryId = parseBigIntId(input.category_id);
        const category = await getProfileCategoryOrThrow(categoryId);
        const domain = category.domain;
        // For legacy PROFILE-domain categories, enforce profile_level = PROFILE_PARENT.
        if (domain === "PROFILE") {
            if (category.profile_level !== "PROFILE_PARENT") {
                const err = new Error("INVALID_PROFILE_CATEGORY");
                err.code = "INVALID_PROFILE_CATEGORY";
                throw err;
            }
        }
        else {
            // For POLL categories, allow profiles only on child categories (sub categories),
            // i.e. categories where is_parent = false.
            if (category.is_parent) {
                const err = new Error("INVALID_PROFILE_CATEGORY");
                err.code = "INVALID_PROFILE_CATEGORY";
                throw err;
            }
        }
        const created = await db_1.prisma.profile.create({
            data: {
                name: input.name,
                category_id: categoryId,
                status: input.status ?? "ACTIVE",
            },
        });
        return created;
    }
    async updateProfileAdmin(id, patch) {
        const profileId = parseBigIntId(id);
        const data = {
            status: patch.status ?? undefined,
        };
        if (patch.about !== undefined) {
            data.about = patch.about;
        }
        if (patch.photo_url !== undefined) {
            data.photo_url = patch.photo_url;
        }
        const updated = await db_1.prisma.profile.update({
            where: { id: profileId },
            data,
        });
        return updated;
    }
    async listUserProfileCategoryTree() {
        const flat = await db_1.prisma.category.findMany({
            where: { domain: "PROFILE", status: "ACTIVE" },
            orderBy: { display_order: "asc" },
        });
        const nodes = new Map();
        const roots = [];
        for (const c of flat) {
            nodes.set(c.id, {
                id: c.id.toString(),
                name: c.name_en,
                level: c.profile_level,
                status: c.status === "ACTIVE" ? "active" : "disabled",
                children: [],
            });
        }
        for (const c of flat) {
            const node = nodes.get(c.id);
            if (c.parent_id && nodes.has(c.parent_id)) {
                nodes.get(c.parent_id).children.push(node);
            }
            else {
                roots.push(node);
            }
        }
        return roots;
    }
    async listUserProfilesInCategory(categoryIdRaw) {
        const categoryId = parseBigIntId(categoryIdRaw);
        const category = await getProfileCategoryOrThrow(categoryId);
        if (category.profile_level !== "PROFILE_PARENT") {
            const err = new Error("INVALID_PROFILE_CATEGORY");
            err.code = "INVALID_PROFILE_CATEGORY";
            throw err;
        }
        const profiles = await db_1.prisma.profile.findMany({
            where: {
                category_id: categoryId,
                status: "ACTIVE",
            },
            orderBy: { name: "asc" },
        });
        return {
            category: {
                id: category.id.toString(),
                name: category.name_en,
                claimable: category.profile_claimable ?? "NO",
                request_allowed: category.profile_request_allowed ?? "NO",
                admin_curated: category.profile_admin_curated ?? "NONE",
            },
            profiles: profiles.map((p) => ({
                id: p.id.toString(),
                name: p.name,
                status: p.status,
                is_claimed: p.is_claimed,
            })),
        };
    }
    async submitProfileClaim(params) {
        // Only fully identity-verified users can submit profile claims.
        await assertUserIdentityVerifiedOrThrow(params.userId);
        const profileId = parseBigIntId(params.profileId);
        const profile = await db_1.prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                category: true,
            },
        });
        if (!profile) {
            const err = new Error("PROFILE_NOT_FOUND");
            err.code = "PROFILE_NOT_FOUND";
            throw err;
        }
        const category = profile.category;
        if (!category) {
            const err = new Error("PROFILE_NOT_FOUND");
            err.code = "PROFILE_NOT_FOUND";
            throw err;
        }
        if (profile.status !== "ACTIVE") {
            const err = new Error("PROFILE_DISABLED");
            err.code = "PROFILE_DISABLED";
            throw err;
        }
        if (profile.is_claimed) {
            const err = new Error("ALREADY_CLAIMED");
            err.code = "ALREADY_CLAIMED";
            throw err;
        }
        if (category.profile_admin_curated === "FULL") {
            const err = new Error("CLAIM_NOT_ALLOWED");
            err.code = "CLAIM_NOT_ALLOWED";
            throw err;
        }
        if ((category.profile_claimable ?? "NO") !== "YES") {
            const err = new Error("CLAIM_NOT_ALLOWED");
            err.code = "CLAIM_NOT_ALLOWED";
            throw err;
        }
        const uploadedDocKeys = new Set(params.uploadedFiles.map((f) => f.fieldname));
        (0, profileRequirements_1.validateSubmittedDataOrThrow)({
            requirements: category.claim_requirements,
            submittedData: params.submittedData,
            uploadedDocumentFieldKeys: uploadedDocKeys,
        });
        const created = await db_1.prisma.$transaction(async (tx) => {
            const claim = await tx.profileClaim.create({
                data: {
                    profile_id: profileId,
                    user_id: params.userId,
                    submitted_data: (params.submittedData ?? {}),
                    status: "PENDING",
                },
            });
            if (params.uploadedFiles.length > 0) {
                await tx.profileSubmissionDocument.createMany({
                    data: params.uploadedFiles.map((f) => ({
                        claim_id: claim.id,
                        request_id: null,
                        field_key: f.fieldname,
                        original_name: f.originalname,
                        mime_type: f.mimetype,
                        size_bytes: f.size,
                        storage_path: f.path,
                    })),
                });
            }
            return claim;
        });
        return { id: created.id.toString(), status: created.status };
    }
    async submitProfileRequest(params) {
        // Only fully identity-verified users can submit profile requests.
        await assertUserIdentityVerifiedOrThrow(params.userId);
        const categoryId = parseBigIntId(params.categoryId);
        const category = await getProfileCategoryOrThrow(categoryId);
        if (category.profile_level !== "PROFILE_PARENT") {
            const err = new Error("INVALID_PROFILE_CATEGORY");
            err.code = "INVALID_PROFILE_CATEGORY";
            throw err;
        }
        if (category.profile_admin_curated === "FULL") {
            const err = new Error("REQUEST_NOT_ALLOWED");
            err.code = "REQUEST_NOT_ALLOWED";
            throw err;
        }
        if ((category.profile_request_allowed ?? "NO") !== "YES") {
            const err = new Error("REQUEST_NOT_ALLOWED");
            err.code = "REQUEST_NOT_ALLOWED";
            throw err;
        }
        const existingProfile = await db_1.prisma.profile.findFirst({
            where: {
                category_id: categoryId,
                name: params.requestedName,
            },
        });
        if (existingProfile) {
            const err = new Error("PROFILE_ALREADY_EXISTS");
            err.code = "PROFILE_ALREADY_EXISTS";
            throw err;
        }
        const uploadedDocKeys = new Set(params.uploadedFiles.map((f) => f.fieldname));
        (0, profileRequirements_1.validateSubmittedDataOrThrow)({
            requirements: category.request_requirements,
            submittedData: params.submittedData,
            uploadedDocumentFieldKeys: uploadedDocKeys,
        });
        const created = await db_1.prisma.$transaction(async (tx) => {
            const reqRow = await tx.profileRequest.create({
                data: {
                    parent_category_id: categoryId,
                    requested_name: params.requestedName,
                    user_id: params.userId,
                    submitted_data: (params.submittedData ?? {}),
                    status: "PENDING",
                },
            });
            if (params.uploadedFiles.length > 0) {
                await tx.profileSubmissionDocument.createMany({
                    data: params.uploadedFiles.map((f) => ({
                        claim_id: null,
                        request_id: reqRow.id,
                        field_key: f.fieldname,
                        original_name: f.originalname,
                        mime_type: f.mimetype,
                        size_bytes: f.size,
                        storage_path: f.path,
                    })),
                });
            }
            return reqRow;
        });
        return { id: created.id.toString(), status: created.status };
    }
    async listUserSubmissions(userId) {
        const [claims, requests] = await Promise.all([
            db_1.prisma.profileClaim.findMany({
                where: { user_id: userId },
                include: {
                    profile: { include: { category: true } },
                },
                orderBy: { created_at: "desc" },
            }),
            db_1.prisma.profileRequest.findMany({
                where: { user_id: userId },
                include: {
                    parent_category: true,
                    approved_profile: true,
                },
                orderBy: { created_at: "desc" },
            }),
        ]);
        return {
            claims: claims.map((c) => ({
                id: c.id.toString(),
                status: c.status,
                created_at: c.created_at,
                profile: {
                    id: c.profile?.id?.toString(),
                    name: c.profile?.name,
                },
                category: {
                    id: c.profile?.category?.id?.toString(),
                    name: c.profile?.category?.name_en,
                },
            })),
            requests: requests.map((r) => ({
                id: r.id.toString(),
                status: r.status,
                created_at: r.created_at,
                requested_name: r.requested_name,
                category: {
                    id: r.parent_category?.id?.toString(),
                    name: r.parent_category?.name_en,
                },
                approved_profile_id: r.approved_profile_id ? r.approved_profile_id.toString() : null,
            })),
        };
    }
    // Public profile listing for users (used by /profiles UI)
    async listPublicProfilesForUser() {
        const profiles = await db_1.prisma.profile.findMany({
            where: {
                status: "ACTIVE",
            },
            include: {
                category: true,
            },
            orderBy: {
                created_at: "desc",
            },
        });
        return profiles.map((p) => ({
            id: p.id.toString(),
            name: p.name,
            is_claimed: p.is_claimed,
            claimed_by_user_id: p.claimed_by_user_id ? p.claimed_by_user_id.toString() : null,
            category: p.category
                ? {
                    id: p.category.id.toString(),
                    name: p.category.name_en,
                }
                : null,
            created_at: p.created_at,
            photo_url: p.photo_url ?? null,
            about: p.about ?? null,
        }));
    }
    async getPublicProfileForUser(profileIdRaw) {
        const profileId = parseBigIntId(profileIdRaw);
        const profile = await db_1.prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                category: true,
            },
        });
        if (!profile) {
            const err = new Error("PROFILE_NOT_FOUND");
            err.code = "PROFILE_NOT_FOUND";
            throw err;
        }
        const followerCount = await db_1.prisma.profileFollower.count({
            where: { profile_id: profile.id },
        });
        return {
            id: profile.id.toString(),
            name: profile.name,
            is_claimed: profile.is_claimed,
            claimed_by_user_id: profile.claimed_by_user_id
                ? profile.claimed_by_user_id.toString()
                : null,
            category: profile.category
                ? {
                    id: profile.category.id.toString(),
                    name: profile.category.name_en,
                }
                : null,
            created_at: profile.created_at,
            status: profile.status,
            follower_count: followerCount,
            photo_url: profile.photo_url ?? null,
            about: profile.about ?? null,
        };
    }
    async getPublicProfileForUserWithFollow(userId, profileIdRaw) {
        const base = await this.getPublicProfileForUser(profileIdRaw);
        let isFollowing = false;
        if (userId) {
            const profileId = parseBigIntId(profileIdRaw);
            const existing = await db_1.prisma.profileFollower.findFirst({
                where: { profile_id: profileId, user_id: userId },
            });
            isFollowing = !!existing;
        }
        return {
            ...base,
            is_following: isFollowing,
        };
    }
    async followProfile(userId, profileIdRaw) {
        const profileId = parseBigIntId(profileIdRaw);
        const profile = await db_1.prisma.profile.findUnique({ where: { id: profileId } });
        if (!profile) {
            const err = new Error("PROFILE_NOT_FOUND");
            err.code = "PROFILE_NOT_FOUND";
            throw err;
        }
        if (profile.status !== "ACTIVE") {
            const err = new Error("PROFILE_DISABLED");
            err.code = "PROFILE_DISABLED";
            throw err;
        }
        try {
            await db_1.prisma.profileFollower.create({
                data: {
                    profile_id: profileId,
                    user_id: userId,
                },
            });
        }
        catch (err) {
            // Ignore unique constraint violations so follow is idempotent
            if (err?.code !== "P2002") {
                throw err;
            }
        }
        const count = await db_1.prisma.profileFollower.count({ where: { profile_id: profileId } });
        return { follower_count: count };
    }
    async unfollowProfile(userId, profileIdRaw) {
        const profileId = parseBigIntId(profileIdRaw);
        const profile = await db_1.prisma.profile.findUnique({ where: { id: profileId } });
        if (!profile) {
            const err = new Error("PROFILE_NOT_FOUND");
            err.code = "PROFILE_NOT_FOUND";
            throw err;
        }
        await db_1.prisma.profileFollower.deleteMany({
            where: {
                profile_id: profileId,
                user_id: userId,
            },
        });
        const count = await db_1.prisma.profileFollower.count({ where: { profile_id: profileId } });
        return { follower_count: count };
    }
    async listPendingClaimsAdmin(status) {
        const where = {};
        if (status)
            where.status = status;
        const claims = await db_1.prisma.profileClaim.findMany({
            where,
            include: {
                profile: { include: { category: true } },
                user: true,
                documents: true,
            },
            orderBy: { created_at: "asc" },
        });
        return claims.map((c) => ({
            id: c.id.toString(),
            status: c.status,
            created_at: c.created_at,
            profile: {
                id: c.profile?.id?.toString(),
                name: c.profile?.name,
            },
            category: {
                id: c.profile?.category?.id?.toString(),
                name: c.profile?.category?.name_en,
            },
            user: {
                id: c.user_id.toString(),
                mobile: c.user?.mobile ?? null,
            },
            submitted_data: c.submitted_data,
            documents: (c.documents ?? []).map((d) => ({
                id: d.id.toString(),
                field_key: d.field_key,
                original_name: d.original_name,
                mime_type: d.mime_type,
                size_bytes: d.size_bytes,
                download_url: `/profile/review/documents/${d.id.toString()}/download`,
            })),
        }));
    }
    async approveClaimAdmin(params) {
        const claimId = parseBigIntId(params.claimId);
        const result = await db_1.prisma.$transaction(async (tx) => {
            const claim = await tx.profileClaim.findUnique({
                where: { id: claimId },
                include: { profile: true },
            });
            if (!claim) {
                const err = new Error("CLAIM_NOT_FOUND");
                err.code = "CLAIM_NOT_FOUND";
                throw err;
            }
            if (claim.status !== "PENDING") {
                const err = new Error("INVALID_STATUS");
                err.code = "INVALID_STATUS";
                throw err;
            }
            const profile = await tx.profile.findUnique({ where: { id: claim.profile_id } });
            if (!profile) {
                const err = new Error("PROFILE_NOT_FOUND");
                err.code = "PROFILE_NOT_FOUND";
                throw err;
            }
            if (profile.is_claimed) {
                const err = new Error("ALREADY_CLAIMED");
                err.code = "ALREADY_CLAIMED";
                throw err;
            }
            await tx.profile.update({
                where: { id: profile.id },
                data: {
                    is_claimed: true,
                    claimed_by_user_id: claim.user_id,
                },
            });
            await tx.profileClaim.updateMany({
                where: {
                    profile_id: profile.id,
                    status: "PENDING",
                    id: { not: claim.id },
                },
                data: {
                    status: "REJECTED",
                    reviewed_at: new Date(),
                    reviewed_by_admin_id: params.adminId,
                    review_reason: "Profile already claimed",
                },
            });
            const updated = await tx.profileClaim.update({
                where: { id: claim.id },
                data: {
                    status: "APPROVED",
                    reviewed_at: new Date(),
                    reviewed_by_admin_id: params.adminId,
                    review_reason: null,
                },
            });
            return updated;
        });
        return result;
    }
    async rejectClaimAdmin(params) {
        const claimId = parseBigIntId(params.claimId);
        const claim = await db_1.prisma.profileClaim.findUnique({ where: { id: claimId } });
        if (!claim) {
            const err = new Error("CLAIM_NOT_FOUND");
            err.code = "CLAIM_NOT_FOUND";
            throw err;
        }
        if (claim.status !== "PENDING") {
            const err = new Error("INVALID_STATUS");
            err.code = "INVALID_STATUS";
            throw err;
        }
        const updated = await db_1.prisma.profileClaim.update({
            where: { id: claimId },
            data: {
                status: "REJECTED",
                reviewed_at: new Date(),
                reviewed_by_admin_id: params.adminId,
                review_reason: params.reason,
            },
        });
        return updated;
    }
    async listPendingRequestsAdmin(status) {
        const where = {};
        if (status)
            where.status = status;
        const requests = await db_1.prisma.profileRequest.findMany({
            where,
            include: {
                parent_category: true,
                user: true,
                documents: true,
                approved_profile: true,
            },
            orderBy: { created_at: "asc" },
        });
        return requests.map((r) => ({
            id: r.id.toString(),
            status: r.status,
            created_at: r.created_at,
            requested_name: r.requested_name,
            category: {
                id: r.parent_category_id.toString(),
                name: r.parent_category?.name_en ?? "",
            },
            user: {
                id: r.user_id.toString(),
                mobile: r.user?.mobile ?? null,
            },
            submitted_data: r.submitted_data,
            approved_profile_id: r.approved_profile_id ? r.approved_profile_id.toString() : null,
            documents: (r.documents ?? []).map((d) => ({
                id: d.id.toString(),
                field_key: d.field_key,
                original_name: d.original_name,
                mime_type: d.mime_type,
                size_bytes: d.size_bytes,
                download_url: `/profile/review/documents/${d.id.toString()}/download`,
            })),
        }));
    }
    async getSubmissionDocumentForAdmin(documentId) {
        const id = parseBigIntId(documentId);
        const doc = await db_1.prisma.profileSubmissionDocument.findUnique({ where: { id } });
        if (!doc) {
            const err = new Error("DOC_NOT_FOUND");
            err.code = "DOC_NOT_FOUND";
            throw err;
        }
        return doc;
    }
    async getSubmissionDocumentForUser(userId, documentId) {
        const id = parseBigIntId(documentId);
        const doc = await db_1.prisma.profileSubmissionDocument.findUnique({
            where: { id },
            include: {
                claim: { select: { user_id: true } },
                request: { select: { user_id: true } },
            },
        });
        if (!doc) {
            const err = new Error("DOC_NOT_FOUND");
            err.code = "DOC_NOT_FOUND";
            throw err;
        }
        const ownerId = doc.claim?.user_id ?? doc.request?.user_id ?? null;
        if (!ownerId || ownerId !== userId) {
            const err = new Error("FORBIDDEN");
            err.code = "FORBIDDEN";
            throw err;
        }
        return doc;
    }
    async approveRequestAdmin(params) {
        const requestId = parseBigIntId(params.requestId);
        const result = await db_1.prisma.$transaction(async (tx) => {
            const reqRow = await tx.profileRequest.findUnique({
                where: { id: requestId },
            });
            if (!reqRow) {
                const err = new Error("REQUEST_NOT_FOUND");
                err.code = "REQUEST_NOT_FOUND";
                throw err;
            }
            if (reqRow.status !== "PENDING") {
                const err = new Error("INVALID_STATUS");
                err.code = "INVALID_STATUS";
                throw err;
            }
            const category = await getProfileCategoryOrThrow(reqRow.parent_category_id);
            if (category.profile_level !== "PROFILE_PARENT") {
                const err = new Error("INVALID_PROFILE_CATEGORY");
                err.code = "INVALID_PROFILE_CATEGORY";
                throw err;
            }
            const existingProfile = await tx.profile.findFirst({
                where: {
                    category_id: reqRow.parent_category_id,
                    name: reqRow.requested_name,
                },
            });
            if (existingProfile) {
                const err = new Error("PROFILE_ALREADY_EXISTS");
                err.code = "PROFILE_ALREADY_EXISTS";
                throw err;
            }
            const createdProfile = await tx.profile.create({
                data: {
                    name: reqRow.requested_name,
                    category_id: reqRow.parent_category_id,
                    status: "ACTIVE",
                },
            });
            const updated = await tx.profileRequest.update({
                where: { id: reqRow.id },
                data: {
                    status: "APPROVED",
                    approved_profile_id: createdProfile.id,
                    reviewed_at: new Date(),
                    reviewed_by_admin_id: params.adminId,
                    review_reason: null,
                },
            });
            return { request: updated, profile: createdProfile };
        });
        return result;
    }
    async rejectRequestAdmin(params) {
        const requestId = parseBigIntId(params.requestId);
        const reqRow = await db_1.prisma.profileRequest.findUnique({ where: { id: requestId } });
        if (!reqRow) {
            const err = new Error("REQUEST_NOT_FOUND");
            err.code = "REQUEST_NOT_FOUND";
            throw err;
        }
        if (reqRow.status !== "PENDING") {
            const err = new Error("INVALID_STATUS");
            err.code = "INVALID_STATUS";
            throw err;
        }
        const updated = await db_1.prisma.profileRequest.update({
            where: { id: requestId },
            data: {
                status: "REJECTED",
                reviewed_at: new Date(),
                reviewed_by_admin_id: params.adminId,
                review_reason: params.reason,
            },
        });
        return updated;
    }
}
exports.ProfileSystemService = ProfileSystemService;
exports.profileSystemService = new ProfileSystemService();
