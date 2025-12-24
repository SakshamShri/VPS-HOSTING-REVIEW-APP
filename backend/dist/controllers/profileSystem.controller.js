"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSystemController = exports.ProfileSystemController = void 0;
const zod_1 = require("zod");
const profileSystem_service_1 = require("../services/profileSystem.service");
const idParamSchema = zod_1.z.object({ id: zod_1.z.string().min(1) });
const yesNoEnum = zod_1.z.enum(["YES", "NO"]);
const statusEnum = zod_1.z.enum(["ACTIVE", "DISABLED"]);
const profileLevelEnum = zod_1.z.enum(["ROOT", "SUB", "PROFILE_PARENT"]);
const profileAdminCuratedEnum = zod_1.z.enum(["FULL", "PARTIAL", "NONE"]);
const createProfileCategorySchema = zod_1.z.object({
    name_en: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().nullable(),
    level: profileLevelEnum,
    parent_id: zod_1.z.string().optional().nullable(),
    status: statusEnum,
    claimable: yesNoEnum,
    request_allowed: yesNoEnum,
    admin_curated: profileAdminCuratedEnum,
    claim_requirements: zod_1.z.unknown().optional(),
    request_requirements: zod_1.z.unknown().optional(),
});
const updateProfileCategorySchema = createProfileCategorySchema.partial();
const createProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category_id: zod_1.z.string().min(1),
    status: zod_1.z.enum(["ACTIVE", "DISABLED"]).optional(),
});
const updateProfileSchema = zod_1.z.object({
    status: zod_1.z.enum(["ACTIVE", "DISABLED"]).optional(),
    about: zod_1.z.string().max(5000).optional().nullable(),
    photo_url: zod_1.z.string().max(2048).optional().nullable(),
});
const approveRejectSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).optional(),
});
const userClaimSchema = zod_1.z.object({
    submitted_data: zod_1.z.string().min(1),
});
const userRequestSchema = zod_1.z.object({
    requested_name: zod_1.z.string().min(1),
    submitted_data: zod_1.z.string().min(1),
});
function parseId(req) {
    return idParamSchema.parse(req.params).id;
}
function getFiles(req) {
    const files = req.files;
    if (!files)
        return [];
    if (Array.isArray(files))
        return files;
    return [];
}
class ProfileSystemController {
    async adminListCategories(_req, res) {
        const tree = await profileSystem_service_1.profileSystemService.listProfileCategoryTreeAdmin();
        res.json({ categories: tree });
    }
    async adminCreateCategory(req, res) {
        try {
            const body = createProfileCategorySchema.parse(req.body);
            const created = await profileSystem_service_1.profileSystemService.createProfileCategoryAdmin({
                name_en: body.name_en,
                description: body.description ?? null,
                level: body.level,
                parent_id: body.parent_id ?? null,
                status: body.status,
                claimable: body.claimable,
                request_allowed: body.request_allowed,
                admin_curated: body.admin_curated,
                claim_requirements: body.claim_requirements,
                request_requirements: body.request_requirements,
            });
            res.status(201).json(created);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "INVALID_PARENT" || code === "INVALID_LEVEL" || code === "CATEGORY_HAS_CHILDREN") {
                res.status(400).json({ message: "Invalid category hierarchy" });
                return;
            }
            if (err?.code === "P2002") {
                res.status(409).json({ message: "Category name must be unique in this domain" });
                return;
            }
            throw err;
        }
    }
    async adminUploadProfilePhoto(req, res) {
        try {
            const id = parseId(req);
            const file = req.file;
            if (!file) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            // Store as a relative URL under /uploads so frontend can render directly
            const relativePath = `/uploads/profile-photos/${file.path.split("profile-photos").pop()}`;
            const updated = await profileSystem_service_1.profileSystemService.updateProfileAdmin(id, {
                photo_url: relativePath,
            });
            const updatedAny = updated;
            res.json({ photo_url: updatedAny.photo_url ?? relativePath });
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "PROFILE_NOT_FOUND") {
                res.status(404).json({ message: "Profile not found" });
                return;
            }
            throw err;
        }
    }
    async adminUpdateCategory(req, res) {
        try {
            const id = parseId(req);
            const body = updateProfileCategorySchema.parse(req.body);
            const updated = await profileSystem_service_1.profileSystemService.updateProfileCategoryAdmin(id, {
                name_en: body.name_en,
                description: body.description ?? undefined,
                level: body.level,
                parent_id: body.parent_id ?? undefined,
                status: body.status,
                claimable: body.claimable,
                request_allowed: body.request_allowed,
                admin_curated: body.admin_curated,
                claim_requirements: body.claim_requirements,
                request_requirements: body.request_requirements,
            });
            res.json(updated);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "CATEGORY_NOT_FOUND") {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            if (code === "INVALID_PARENT" || code === "INVALID_LEVEL" || code === "CATEGORY_HAS_CHILDREN") {
                res.status(400).json({ message: "Invalid category hierarchy" });
                return;
            }
            if (err?.code === "P2002") {
                res.status(409).json({ message: "Category name must be unique in this domain" });
                return;
            }
            throw err;
        }
    }
    async adminListProfiles(req, res) {
        const category_id = typeof req.query.category_id === "string" ? req.query.category_id : null;
        const items = await profileSystem_service_1.profileSystemService.listProfilesAdmin({ category_id });
        res.json({ profiles: items });
    }
    async adminCreateProfile(req, res) {
        try {
            const body = createProfileSchema.parse(req.body);
            const created = await profileSystem_service_1.profileSystemService.createProfileAdmin({
                name: body.name,
                category_id: body.category_id,
                status: body.status,
            });
            res.status(201).json(created);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "INVALID_PROFILE_CATEGORY") {
                res.status(400).json({ message: "Profiles can only be created under PROFILE_PARENT categories" });
                return;
            }
            if (code === "CATEGORY_NOT_FOUND") {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            if (err?.code === "P2002") {
                res.status(409).json({ message: "Profile already exists in this category" });
                return;
            }
            throw err;
        }
    }
    async adminUpdateProfile(req, res) {
        try {
            const id = parseId(req);
            const body = updateProfileSchema.parse(req.body);
            const updated = await profileSystem_service_1.profileSystemService.updateProfileAdmin(id, {
                status: body.status,
                about: body.about ?? undefined,
                photo_url: body.photo_url ?? undefined,
            });
            res.json(updated);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            if (err?.code === "P2025") {
                res.status(404).json({ message: "Profile not found" });
                return;
            }
            throw err;
        }
    }
    async adminListClaims(req, res) {
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const items = await profileSystem_service_1.profileSystemService.listPendingClaimsAdmin(status);
        res.json({ claims: items });
    }
    async adminApproveClaim(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const updated = await profileSystem_service_1.profileSystemService.approveClaimAdmin({
                adminId: req.user.id,
                claimId: id,
            });
            res.json(updated);
        }
        catch (err) {
            const code = err?.code;
            if (code === "CLAIM_NOT_FOUND") {
                res.status(404).json({ message: "Claim not found" });
                return;
            }
            if (code === "INVALID_STATUS") {
                res.status(400).json({ message: "Claim is not pending" });
                return;
            }
            if (code === "ALREADY_CLAIMED") {
                res.status(409).json({ message: "Profile is already claimed" });
                return;
            }
            throw err;
        }
    }
    async adminRejectClaim(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const body = approveRejectSchema.parse(req.body);
            const updated = await profileSystem_service_1.profileSystemService.rejectClaimAdmin({
                adminId: req.user.id,
                claimId: id,
                reason: body.reason ?? "Rejected",
            });
            res.json(updated);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "CLAIM_NOT_FOUND") {
                res.status(404).json({ message: "Claim not found" });
                return;
            }
            if (code === "INVALID_STATUS") {
                res.status(400).json({ message: "Claim is not pending" });
                return;
            }
            throw err;
        }
    }
    async adminListRequests(req, res) {
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const items = await profileSystem_service_1.profileSystemService.listPendingRequestsAdmin(status);
        res.json({ requests: items });
    }
    async adminApproveRequest(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const result = await profileSystem_service_1.profileSystemService.approveRequestAdmin({
                adminId: req.user.id,
                requestId: id,
            });
            res.json(result);
        }
        catch (err) {
            const code = err?.code;
            if (code === "REQUEST_NOT_FOUND") {
                res.status(404).json({ message: "Request not found" });
                return;
            }
            if (code === "INVALID_STATUS") {
                res.status(400).json({ message: "Request is not pending" });
                return;
            }
            if (code === "PROFILE_ALREADY_EXISTS") {
                res.status(409).json({ message: "Profile already exists" });
                return;
            }
            throw err;
        }
    }
    async adminRejectRequest(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const body = approveRejectSchema.parse(req.body);
            const updated = await profileSystem_service_1.profileSystemService.rejectRequestAdmin({
                adminId: req.user.id,
                requestId: id,
                reason: body.reason ?? "Rejected",
            });
            res.json(updated);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "REQUEST_NOT_FOUND") {
                res.status(404).json({ message: "Request not found" });
                return;
            }
            if (code === "INVALID_STATUS") {
                res.status(400).json({ message: "Request is not pending" });
                return;
            }
            throw err;
        }
    }
    async userListCategories(_req, res) {
        const tree = await profileSystem_service_1.profileSystemService.listUserProfileCategoryTree();
        res.json({ categories: tree });
    }
    async userListProfilesInCategory(req, res) {
        try {
            const id = parseId(req);
            const result = await profileSystem_service_1.profileSystemService.listUserProfilesInCategory(id);
            res.json(result);
        }
        catch (err) {
            const code = err?.code;
            if (code === "CATEGORY_NOT_FOUND") {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            if (code === "INVALID_PROFILE_CATEGORY") {
                res.status(400).json({ message: "Category is not a profile-parent category" });
                return;
            }
            throw err;
        }
    }
    async userSubmitClaim(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const profileId = parseId(req);
            const parsed = userClaimSchema.parse(req.body);
            const submitted = JSON.parse(parsed.submitted_data);
            const files = getFiles(req);
            const created = await profileSystem_service_1.profileSystemService.submitProfileClaim({
                userId: req.user.id,
                profileId,
                submittedData: submitted,
                uploadedFiles: files,
            });
            res.status(201).json(created);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "PROFILE_NOT_FOUND") {
                res.status(404).json({ message: "Profile not found" });
                return;
            }
            if (code === "IDENTITY_NOT_VERIFIED") {
                res.status(403).json({ message: "Identity verification required to claim a profile" });
                return;
            }
            if (code === "ALREADY_CLAIMED") {
                res.status(409).json({ message: "Profile already claimed" });
                return;
            }
            if (code === "CLAIM_NOT_ALLOWED") {
                res.status(403).json({ message: "Claim not allowed" });
                return;
            }
            if (code === "MISSING_REQUIRED_FIELD" || code === "MISSING_REQUIRED_DOCUMENT" || code === "INVALID_FIELD") {
                res.status(400).json({ message: "Submitted data does not satisfy requirements" });
                return;
            }
            if (err?.code === "P2002") {
                res.status(409).json({ message: "A claim already exists" });
                return;
            }
            throw err;
        }
    }
    async userSubmitRequest(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const categoryId = parseId(req);
            const parsed = userRequestSchema.parse(req.body);
            const submitted = JSON.parse(parsed.submitted_data);
            const files = getFiles(req);
            const created = await profileSystem_service_1.profileSystemService.submitProfileRequest({
                userId: req.user.id,
                categoryId,
                requestedName: parsed.requested_name,
                submittedData: submitted,
                uploadedFiles: files,
            });
            res.status(201).json(created);
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                res.status(400).json({ message: "Invalid payload", issues: err.errors });
                return;
            }
            const code = err?.code;
            if (code === "CATEGORY_NOT_FOUND") {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            if (code === "INVALID_PROFILE_CATEGORY") {
                res.status(400).json({ message: "Category is not a profile-parent category" });
                return;
            }
            if (code === "REQUEST_NOT_ALLOWED") {
                res.status(403).json({ message: "Request not allowed" });
                return;
            }
            if (code === "IDENTITY_NOT_VERIFIED") {
                res.status(403).json({ message: "Identity verification required to request a profile" });
                return;
            }
            if (code === "PROFILE_ALREADY_EXISTS") {
                res.status(409).json({ message: "Profile already exists" });
                return;
            }
            if (code === "MISSING_REQUIRED_FIELD" || code === "MISSING_REQUIRED_DOCUMENT" || code === "INVALID_FIELD") {
                res.status(400).json({ message: "Submitted data does not satisfy requirements" });
                return;
            }
            throw err;
        }
    }
    async userListSubmissions(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const result = await profileSystem_service_1.profileSystemService.listUserSubmissions(req.user.id);
        res.json(result);
    }
    async userListPublicProfiles(_req, res) {
        const profiles = await profileSystem_service_1.profileSystemService.listPublicProfilesForUser();
        res.json({ profiles });
    }
    async userGetPublicProfile(req, res) {
        try {
            const id = parseId(req);
            const userId = req.user ? req.user.id : null;
            const profile = await profileSystem_service_1.profileSystemService.getPublicProfileForUserWithFollow(userId, id);
            res.json({ profile });
        }
        catch (err) {
            const code = err?.code;
            if (code === "PROFILE_NOT_FOUND") {
                res.status(404).json({ message: "Profile not found" });
                return;
            }
            throw err;
        }
    }
    async userFollowProfile(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const result = await profileSystem_service_1.profileSystemService.followProfile(req.user.id, id);
            res.json(result);
        }
        catch (err) {
            const code = err?.code;
            if (code === "PROFILE_NOT_FOUND") {
                res.status(404).json({ message: "Profile not found" });
                return;
            }
            if (code === "PROFILE_DISABLED") {
                res.status(400).json({ message: "Profile is disabled" });
                return;
            }
            throw err;
        }
    }
    async userUnfollowProfile(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const result = await profileSystem_service_1.profileSystemService.unfollowProfile(req.user.id, id);
            res.json(result);
        }
        catch (err) {
            const code = err?.code;
            if (code === "PROFILE_NOT_FOUND") {
                res.status(404).json({ message: "Profile not found" });
                return;
            }
            throw err;
        }
    }
    async adminDownloadDocument(req, res) {
        try {
            const id = parseId(req);
            const doc = await profileSystem_service_1.profileSystemService.getSubmissionDocumentForAdmin(id);
            res.download(doc.storage_path, doc.original_name);
        }
        catch (err) {
            const code = err?.code;
            if (code === "DOC_NOT_FOUND") {
                res.status(404).json({ message: "Document not found" });
                return;
            }
            throw err;
        }
    }
    async userDownloadDocument(req, res) {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        try {
            const id = parseId(req);
            const doc = await profileSystem_service_1.profileSystemService.getSubmissionDocumentForUser(req.user.id, id);
            res.download(doc.storage_path, doc.original_name);
        }
        catch (err) {
            const code = err?.code;
            if (code === "DOC_NOT_FOUND") {
                res.status(404).json({ message: "Document not found" });
                return;
            }
            if (code === "FORBIDDEN") {
                res.status(403).json({ message: "Forbidden" });
                return;
            }
            throw err;
        }
    }
}
exports.ProfileSystemController = ProfileSystemController;
exports.profileSystemController = new ProfileSystemController();
