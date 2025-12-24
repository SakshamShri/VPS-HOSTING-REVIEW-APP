import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { profileSystemService } from "../services/profileSystem.service";

type ProfileClaimStatus = "PENDING" | "APPROVED" | "REJECTED";
type ProfileRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

const idParamSchema = z.object({ id: z.string().min(1) });

const yesNoEnum = z.enum(["YES", "NO"]);
const statusEnum = z.enum(["ACTIVE", "DISABLED"]);
const profileLevelEnum = z.enum(["ROOT", "SUB", "PROFILE_PARENT"]);
const profileAdminCuratedEnum = z.enum(["FULL", "PARTIAL", "NONE"]);

const createProfileCategorySchema = z.object({
  name_en: z.string().min(1),
  description: z.string().optional().nullable(),
  level: profileLevelEnum,
  parent_id: z.string().optional().nullable(),
  status: statusEnum,
  claimable: yesNoEnum,
  request_allowed: yesNoEnum,
  admin_curated: profileAdminCuratedEnum,
  claim_requirements: z.unknown().optional(),
  request_requirements: z.unknown().optional(),
});

const updateProfileCategorySchema = createProfileCategorySchema.partial();

const createProfileSchema = z.object({
  name: z.string().min(1),
  category_id: z.string().min(1),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

const updateProfileSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  about: z.string().max(5000).optional().nullable(),
  photo_url: z.string().max(2048).optional().nullable(),
});

const approveRejectSchema = z.object({
  reason: z.string().min(1).optional(),
});

const userClaimSchema = z.object({
  submitted_data: z.string().min(1),
});

const userRequestSchema = z.object({
  requested_name: z.string().min(1),
  submitted_data: z.string().min(1),
});

type UploadedFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

function parseId(req: Request): string {
  return idParamSchema.parse(req.params).id;
}

function getFiles(req: Request): UploadedFile[] {
  const files = (req as any).files;
  if (!files) return [];
  if (Array.isArray(files)) return files as UploadedFile[];
  return [];
}

export class ProfileSystemController {
  async adminListCategories(_req: AuthenticatedRequest, res: Response) {
    const tree = await profileSystemService.listProfileCategoryTreeAdmin();
    res.json({ categories: tree });
  }

  async adminCreateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const body = createProfileCategorySchema.parse(req.body);
      const created = await profileSystemService.createProfileCategoryAdmin({
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
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
      if (code === "INVALID_PARENT" || code === "INVALID_LEVEL" || code === "CATEGORY_HAS_CHILDREN") {
        res.status(400).json({ message: "Invalid category hierarchy" });
        return;
      }
      if ((err as any)?.code === "P2002") {
        res.status(409).json({ message: "Category name must be unique in this domain" });
        return;
      }
      throw err;
    }
  }

  async adminUploadProfilePhoto(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseId(req);
      const file = (req as any).file as { path: string } | undefined;
      if (!file) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      // Store as a relative URL under /uploads so frontend can render directly
      const relativePath = `/uploads/profile-photos/${file.path.split("profile-photos").pop()}`;

      const updated = await profileSystemService.updateProfileAdmin(id, {
        photo_url: relativePath,
      });

      res.json({ photo_url: updated.photo_url });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
      if (code === "PROFILE_NOT_FOUND") {
        res.status(404).json({ message: "Profile not found" });
        return;
      }
      throw err;
    }
  }

  async adminUpdateCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseId(req);
      const body = updateProfileCategorySchema.parse(req.body);
      const updated = await profileSystemService.updateProfileCategoryAdmin(id, {
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
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
      if (code === "CATEGORY_NOT_FOUND") {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      if (code === "INVALID_PARENT" || code === "INVALID_LEVEL" || code === "CATEGORY_HAS_CHILDREN") {
        res.status(400).json({ message: "Invalid category hierarchy" });
        return;
      }
      if ((err as any)?.code === "P2002") {
        res.status(409).json({ message: "Category name must be unique in this domain" });
        return;
      }
      throw err;
    }
  }

  async adminListProfiles(req: AuthenticatedRequest, res: Response) {
    const category_id = typeof req.query.category_id === "string" ? req.query.category_id : null;
    const items = await profileSystemService.listProfilesAdmin({ category_id });
    res.json({ profiles: items });
  }

  async adminCreateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const body = createProfileSchema.parse(req.body);
      const created = await profileSystemService.createProfileAdmin({
        name: body.name,
        category_id: body.category_id,
        status: body.status,
      });
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
      if (code === "INVALID_PROFILE_CATEGORY") {
        res.status(400).json({ message: "Profiles can only be created under PROFILE_PARENT categories" });
        return;
      }
      if (code === "CATEGORY_NOT_FOUND") {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      if ((err as any)?.code === "P2002") {
        res.status(409).json({ message: "Profile already exists in this category" });
        return;
      }
      throw err;
    }
  }

  async adminUpdateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseId(req);
      const body = updateProfileSchema.parse(req.body);
      const updated = await profileSystemService.updateProfileAdmin(id, {
        status: body.status,
        about: body.about ?? undefined,
        photo_url: body.photo_url ?? undefined,
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      if ((err as any)?.code === "P2025") {
        res.status(404).json({ message: "Profile not found" });
        return;
      }
      throw err;
    }
  }

  async adminListClaims(req: AuthenticatedRequest, res: Response) {
    const status = typeof req.query.status === "string" ? (req.query.status as ProfileClaimStatus) : undefined;
    const items = await profileSystemService.listPendingClaimsAdmin(status);
    res.json({ claims: items });
  }

  async adminApproveClaim(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const id = parseId(req);
      const updated = await profileSystemService.approveClaimAdmin({
        adminId: req.user.id,
        claimId: id,
      });
      res.json(updated);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
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

  async adminRejectClaim(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const id = parseId(req);
      const body = approveRejectSchema.parse(req.body);
      const updated = await profileSystemService.rejectClaimAdmin({
        adminId: req.user.id,
        claimId: id,
        reason: body.reason ?? "Rejected",
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
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

  async adminListRequests(req: AuthenticatedRequest, res: Response) {
    const status = typeof req.query.status === "string" ? (req.query.status as ProfileRequestStatus) : undefined;
    const items = await profileSystemService.listPendingRequestsAdmin(status);
    res.json({ requests: items });
  }

  async adminApproveRequest(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const id = parseId(req);
      const result = await profileSystemService.approveRequestAdmin({
        adminId: req.user.id,
        requestId: id,
      });
      res.json(result);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
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

  async adminRejectRequest(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const id = parseId(req);
      const body = approveRejectSchema.parse(req.body);
      const updated = await profileSystemService.rejectRequestAdmin({
        adminId: req.user.id,
        requestId: id,
        reason: body.reason ?? "Rejected",
      });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
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

  async userListCategories(_req: AuthenticatedRequest, res: Response) {
    const tree = await profileSystemService.listUserProfileCategoryTree();
    res.json({ categories: tree });
  }

  async userListProfilesInCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseId(req);
      const result = await profileSystemService.listUserProfilesInCategory(id);
      res.json(result);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
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

  async userSubmitClaim(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const profileId = parseId(req);
      const parsed = userClaimSchema.parse(req.body);
      const submitted = JSON.parse(parsed.submitted_data);
      const files = getFiles(req);

      const created = await profileSystemService.submitProfileClaim({
        userId: req.user.id,
        profileId,
        submittedData: submitted,
        uploadedFiles: files,
      });

      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }

      const code = (err as any)?.code as string | undefined;
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
      if ((err as any)?.code === "P2002") {
        res.status(409).json({ message: "A claim already exists" });
        return;
      }
      throw err;
    }
  }

  async userSubmitRequest(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const categoryId = parseId(req);
      const parsed = userRequestSchema.parse(req.body);
      const submitted = JSON.parse(parsed.submitted_data);
      const files = getFiles(req);

      const created = await profileSystemService.submitProfileRequest({
        userId: req.user.id,
        categoryId,
        requestedName: parsed.requested_name,
        submittedData: submitted,
        uploadedFiles: files,
      });

      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid payload", issues: err.errors });
        return;
      }
      const code = (err as any)?.code as string | undefined;
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

  async userListSubmissions(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const result = await profileSystemService.listUserSubmissions(req.user.id);
    res.json(result);
  }

  async userListPublicProfiles(_req: AuthenticatedRequest, res: Response) {
    const profiles = await profileSystemService.listPublicProfilesForUser();
    res.json({ profiles });
  }

  async userGetPublicProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseId(req);
      const userId = req.user ? req.user.id : null;
      const profile = await profileSystemService.getPublicProfileForUserWithFollow(userId, id);
      res.json({ profile });
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === "PROFILE_NOT_FOUND") {
        res.status(404).json({ message: "Profile not found" });
        return;
      }
      throw err;
    }
  }

  async userFollowProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const id = parseId(req);
      const result = await profileSystemService.followProfile(req.user.id, id);
      res.json(result);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
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

  async userUnfollowProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const id = parseId(req);
      const result = await profileSystemService.unfollowProfile(req.user.id, id);
      res.json(result);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === "PROFILE_NOT_FOUND") {
        res.status(404).json({ message: "Profile not found" });
        return;
      }
      throw err;
    }
  }

  async adminDownloadDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const id = parseId(req);
      const doc = await profileSystemService.getSubmissionDocumentForAdmin(id);
      res.download(doc.storage_path, doc.original_name);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
      if (code === "DOC_NOT_FOUND") {
        res.status(404).json({ message: "Document not found" });
        return;
      }
      throw err;
    }
  }

  async userDownloadDocument(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const id = parseId(req);
      const doc = await profileSystemService.getSubmissionDocumentForUser(req.user.id, id);
      res.download(doc.storage_path, doc.original_name);
    } catch (err) {
      const code = (err as any)?.code as string | undefined;
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

export const profileSystemController = new ProfileSystemController();
