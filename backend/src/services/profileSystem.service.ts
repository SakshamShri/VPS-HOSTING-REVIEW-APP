import { prisma } from "../utils/db";
import { validateSubmittedDataOrThrow } from "../utils/profileRequirements";
import path from "path";

type CategoryStatus = "ACTIVE" | "DISABLED";
type ProfileAdminCuratedMode = "FULL" | "PARTIAL" | "NONE";
type ProfileCategoryLevel = "ROOT" | "SUB" | "PROFILE_PARENT";
type ProfileStatus = "ACTIVE" | "DISABLED";
type ProfileClaimStatus = "PENDING" | "APPROVED" | "REJECTED";
type ProfileRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type UploadedFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

function parseBigIntId(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    const err = new Error("INVALID_ID");
    (err as any).code = "INVALID_ID";
    throw err;
  }
}

async function assertUserIdentityVerifiedOrThrow(userId: bigint) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    (err as any).code = "USER_NOT_FOUND";
    throw err;
  }
  if (!user.identity_verified) {
    const err = new Error("IDENTITY_NOT_VERIFIED");
    (err as any).code = "IDENTITY_NOT_VERIFIED";
    throw err;
  }
}

function normalizeLevel(level: ProfileCategoryLevel): { is_parent: boolean } {
  if (level === "PROFILE_PARENT") return { is_parent: false };
  return { is_parent: true };
}

async function getProfileCategoryOrThrow(id: bigint) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    const err = new Error("CATEGORY_NOT_FOUND");
    (err as any).code = "CATEGORY_NOT_FOUND";
    throw err;
  }
  return category as any;
}

async function assertProfileCategoryHierarchyOrThrow(input: {
  level: ProfileCategoryLevel;
  parentId: bigint | null;
}) {
  if (input.level === "ROOT") {
    if (input.parentId != null) {
      const err = new Error("INVALID_PARENT");
      (err as any).code = "INVALID_PARENT";
      throw err;
    }
    return;
  }

  if (input.parentId == null) {
    const err = new Error("INVALID_PARENT");
    (err as any).code = "INVALID_PARENT";
    throw err;
  }

  const parent = await getProfileCategoryOrThrow(input.parentId);

  const parentLevel = parent.profile_level as ProfileCategoryLevel | null;

  if (input.level === "SUB") {
    if (parentLevel !== "ROOT") {
      const err = new Error("INVALID_PARENT");
      (err as any).code = "INVALID_PARENT";
      throw err;
    }
    return;
  }

  if (input.level === "PROFILE_PARENT") {
    if (parentLevel !== "SUB") {
      const err = new Error("INVALID_PARENT");
      (err as any).code = "INVALID_PARENT";
      throw err;
    }
    return;
  }

  const err = new Error("INVALID_LEVEL");
  (err as any).code = "INVALID_LEVEL";
  throw err;
}

export class ProfileSystemService {
  async listProfileCategoryTreeAdmin() {
    const flat = await prisma.category.findMany({
      where: ({ domain: "PROFILE" } as any),
      orderBy: { display_order: "asc" },
    });

    const nodes = new Map<bigint, any>();
    const roots: any[] = [];

    for (const c of flat as any[]) {
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

    for (const c of flat as any[]) {
      const node = nodes.get(c.id)!;
      if (c.parent_id && nodes.has(c.parent_id)) {
        nodes.get(c.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async createProfileCategoryAdmin(input: {
    name_en: string;
    description?: string | null;
    level: ProfileCategoryLevel;
    parent_id?: string | null;
    status: CategoryStatus;
    claimable: "YES" | "NO";
    request_allowed: "YES" | "NO";
    admin_curated: ProfileAdminCuratedMode;
    claim_requirements?: unknown;
    request_requirements?: unknown;
  }) {
    const parentId = input.parent_id ? parseBigIntId(input.parent_id) : null;

    await assertProfileCategoryHierarchyOrThrow({
      level: input.level,
      parentId,
    });

    const { is_parent } = normalizeLevel(input.level);

    const created = await prisma.category.create({
      data: {
        name_en: input.name_en,
        name_local: null,
        description: input.description ?? null,
        domain: "PROFILE" as any,
        profile_level: input.level as any,
        profile_claimable: input.claimable as any,
        profile_request_allowed: input.request_allowed as any,
        profile_admin_curated: input.admin_curated as any,
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
      } as any,
    });

    return created;
  }

  async updateProfileCategoryAdmin(id: string, patch: Partial<{
    name_en: string;
    description: string | null;
    level: ProfileCategoryLevel;
    parent_id: string | null;
    status: CategoryStatus;
    claimable: "YES" | "NO";
    request_allowed: "YES" | "NO";
    admin_curated: ProfileAdminCuratedMode;
    claim_requirements: unknown;
    request_requirements: unknown;
  }>) {
    const categoryId = parseBigIntId(id);
    const existing = await getProfileCategoryOrThrow(categoryId);

    const nextLevel = (patch.level ?? existing.profile_level) as ProfileCategoryLevel;
    const nextParentIdRaw = patch.parent_id === undefined ? (existing.parent_id ? existing.parent_id.toString() : null) : patch.parent_id;
    const nextParentId = nextParentIdRaw ? parseBigIntId(nextParentIdRaw) : null;

    await assertProfileCategoryHierarchyOrThrow({
      level: nextLevel,
      parentId: nextParentId,
    });

    if (nextLevel === "PROFILE_PARENT") {
      const childCount = await prisma.category.count({ where: ({ parent_id: categoryId } as any) });
      if (childCount > 0) {
        const err = new Error("CATEGORY_HAS_CHILDREN");
        (err as any).code = "CATEGORY_HAS_CHILDREN";
        throw err;
      }
    }

    const { is_parent } = normalizeLevel(nextLevel);

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name_en: patch.name_en ?? undefined,
        description: patch.description ?? undefined,
        profile_level: (patch.level as any) ?? undefined,
        parent_id: patch.parent_id === undefined ? undefined : nextParentId,
        status: patch.status ?? undefined,
        profile_claimable: (patch.claimable as any) ?? undefined,
        profile_request_allowed: (patch.request_allowed as any) ?? undefined,
        profile_admin_curated: (patch.admin_curated as any) ?? undefined,
        claim_requirements: patch.claim_requirements ?? undefined,
        request_requirements: patch.request_requirements ?? undefined,
        is_parent,
      } as any,
    });

    return updated;
  }

  async listProfilesAdmin(params: { category_id?: string | null } = {}) {
    const where: any = {};
    if (params.category_id) {
      where.category_id = parseBigIntId(params.category_id);
    }

    const items = await prisma.profile.findMany({
      where,
      include: {
        category: true,
        claimed_by_user: true,
      },
      orderBy: { created_at: "desc" },
    });

    return items.map((p: any) => ({
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

  async createProfileAdmin(input: { name: string; category_id: string; status?: ProfileStatus }) {
    const categoryId = parseBigIntId(input.category_id);
    const category = await getProfileCategoryOrThrow(categoryId);

    const domain = (category as any).domain as string | null;

    // For legacy PROFILE-domain categories, enforce profile_level = PROFILE_PARENT.
    if (domain === "PROFILE") {
      if ((category as any).profile_level !== "PROFILE_PARENT") {
        const err = new Error("INVALID_PROFILE_CATEGORY");
        (err as any).code = "INVALID_PROFILE_CATEGORY";
        throw err;
      }
    } else {
      // For POLL categories, allow profiles only on child categories (sub categories),
      // i.e. categories where is_parent = false.
      if ((category as any).is_parent) {
        const err = new Error("INVALID_PROFILE_CATEGORY");
        (err as any).code = "INVALID_PROFILE_CATEGORY";
        throw err;
      }
    }

    const created = await prisma.profile.create({
      data: {
        name: input.name,
        category_id: categoryId,
        status: input.status ?? "ACTIVE",
      },
    });

    return created;
  }

  async updateProfileAdmin(
    id: string,
    patch: Partial<{ status: ProfileStatus; about: string | null; photo_url: string | null }>
  ) {
    const profileId = parseBigIntId(id);
    const updated = await prisma.profile.update({
      where: { id: profileId },
      data: {
        status: patch.status ?? undefined,
        about: patch.about !== undefined ? patch.about : undefined,
        photo_url: patch.photo_url !== undefined ? patch.photo_url : undefined,
      },
    });
    return updated;
  }

  async listUserProfileCategoryTree() {
    const flat = await prisma.category.findMany({
      where: ({ domain: "PROFILE", status: "ACTIVE" } as any),
      orderBy: { display_order: "asc" },
    });

    const nodes = new Map<bigint, any>();
    const roots: any[] = [];

    for (const c of flat as any[]) {
      nodes.set(c.id, {
        id: c.id.toString(),
        name: c.name_en,
        level: c.profile_level,
        status: c.status === "ACTIVE" ? "active" : "disabled",
        children: [],
      });
    }

    for (const c of flat as any[]) {
      const node = nodes.get(c.id)!;
      if (c.parent_id && nodes.has(c.parent_id)) {
        nodes.get(c.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async listUserProfilesInCategory(categoryIdRaw: string) {
    const categoryId = parseBigIntId(categoryIdRaw);
    const category = await getProfileCategoryOrThrow(categoryId);

    if (category.profile_level !== "PROFILE_PARENT") {
      const err = new Error("INVALID_PROFILE_CATEGORY");
      (err as any).code = "INVALID_PROFILE_CATEGORY";
      throw err;
    }

    const profiles = await prisma.profile.findMany({
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

  async submitProfileClaim(params: {
    userId: bigint;
    profileId: string;
    submittedData: unknown;
    uploadedFiles: UploadedFile[];
  }) {
    // Only fully identity-verified users can submit profile claims.
    await assertUserIdentityVerifiedOrThrow(params.userId);

    const profileId = parseBigIntId(params.profileId);
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        category: true,
      },
    });

    if (!profile) {
      const err = new Error("PROFILE_NOT_FOUND");
      (err as any).code = "PROFILE_NOT_FOUND";
      throw err;
    }

    const category: any = profile.category;
    if (!category) {
      const err = new Error("PROFILE_NOT_FOUND");
      (err as any).code = "PROFILE_NOT_FOUND";
      throw err;
    }

    if (profile.status !== "ACTIVE") {
      const err = new Error("PROFILE_DISABLED");
      (err as any).code = "PROFILE_DISABLED";
      throw err;
    }

    if (profile.is_claimed) {
      const err = new Error("ALREADY_CLAIMED");
      (err as any).code = "ALREADY_CLAIMED";
      throw err;
    }

    if ((category.profile_admin_curated as ProfileAdminCuratedMode | null) === "FULL") {
      const err = new Error("CLAIM_NOT_ALLOWED");
      (err as any).code = "CLAIM_NOT_ALLOWED";
      throw err;
    }

    if ((category.profile_claimable ?? "NO") !== "YES") {
      const err = new Error("CLAIM_NOT_ALLOWED");
      (err as any).code = "CLAIM_NOT_ALLOWED";
      throw err;
    }

    const uploadedDocKeys = new Set<string>(params.uploadedFiles.map((f) => f.fieldname));

    validateSubmittedDataOrThrow({
      requirements: category.claim_requirements,
      submittedData: params.submittedData,
      uploadedDocumentFieldKeys: uploadedDocKeys,
    });

    const created = await prisma.$transaction(async (tx) => {
      const claim = await tx.profileClaim.create({
        data: {
          profile_id: profileId,
          user_id: params.userId,
          submitted_data: (params.submittedData ?? {}) as any,
          status: "PENDING" as ProfileClaimStatus,
        },
      });

      if (params.uploadedFiles.length > 0) {
        await (tx as any).profileSubmissionDocument.createMany({
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

  async submitProfileRequest(params: {
    userId: bigint;
    categoryId: string;
    requestedName: string;
    submittedData: unknown;
    uploadedFiles: UploadedFile[];
  }) {
    // Only fully identity-verified users can submit profile requests.
    await assertUserIdentityVerifiedOrThrow(params.userId);

    const categoryId = parseBigIntId(params.categoryId);
    const category = await getProfileCategoryOrThrow(categoryId);

    if (category.profile_level !== "PROFILE_PARENT") {
      const err = new Error("INVALID_PROFILE_CATEGORY");
      (err as any).code = "INVALID_PROFILE_CATEGORY";
      throw err;
    }

    if ((category.profile_admin_curated as ProfileAdminCuratedMode | null) === "FULL") {
      const err = new Error("REQUEST_NOT_ALLOWED");
      (err as any).code = "REQUEST_NOT_ALLOWED";
      throw err;
    }

    if ((category.profile_request_allowed ?? "NO") !== "YES") {
      const err = new Error("REQUEST_NOT_ALLOWED");
      (err as any).code = "REQUEST_NOT_ALLOWED";
      throw err;
    }

    const existingProfile = await prisma.profile.findFirst({
      where: {
        category_id: categoryId,
        name: params.requestedName,
      },
    });
    if (existingProfile) {
      const err = new Error("PROFILE_ALREADY_EXISTS");
      (err as any).code = "PROFILE_ALREADY_EXISTS";
      throw err;
    }

    const uploadedDocKeys = new Set<string>(params.uploadedFiles.map((f) => f.fieldname));

    validateSubmittedDataOrThrow({
      requirements: category.request_requirements,
      submittedData: params.submittedData,
      uploadedDocumentFieldKeys: uploadedDocKeys,
    });

    const created = await prisma.$transaction(async (tx) => {
      const reqRow = await tx.profileRequest.create({
        data: {
          parent_category_id: categoryId,
          requested_name: params.requestedName,
          user_id: params.userId,
          submitted_data: (params.submittedData ?? {}) as any,
          status: "PENDING" as ProfileRequestStatus,
        },
      });

      if (params.uploadedFiles.length > 0) {
        await (tx as any).profileSubmissionDocument.createMany({
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

  async listUserSubmissions(userId: bigint) {
    const [claims, requests] = await Promise.all([
      prisma.profileClaim.findMany({
        where: { user_id: userId },
        include: {
          profile: { include: { category: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.profileRequest.findMany({
        where: { user_id: userId },
        include: {
          parent_category: true,
          approved_profile: true,
        },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return {
      claims: claims.map((c: any) => ({
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
      requests: requests.map((r: any) => ({
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
    const profiles = await prisma.profile.findMany({
      where: {
        status: "ACTIVE" as ProfileStatus,
      },
      include: {
        category: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return profiles.map((p: any) => ({
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

  async getPublicProfileForUser(profileIdRaw: string) {
    const profileId = parseBigIntId(profileIdRaw);

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        category: true,
      },
    });

    if (!profile) {
      const err = new Error("PROFILE_NOT_FOUND");
      (err as any).code = "PROFILE_NOT_FOUND";
      throw err;
    }
    const followerCount = await (prisma as any).profileFollower.count({
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

  async getPublicProfileForUserWithFollow(userId: bigint | null, profileIdRaw: string) {
    const base = await this.getPublicProfileForUser(profileIdRaw);

    let isFollowing = false;
    if (userId) {
      const profileId = parseBigIntId(profileIdRaw);
      const existing = await (prisma as any).profileFollower.findFirst({
        where: { profile_id: profileId, user_id: userId },
      });
      isFollowing = !!existing;
    }

    return {
      ...base,
      is_following: isFollowing,
    } as any;
  }

  async followProfile(userId: bigint, profileIdRaw: string) {
    const profileId = parseBigIntId(profileIdRaw);

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      const err = new Error("PROFILE_NOT_FOUND");
      (err as any).code = "PROFILE_NOT_FOUND";
      throw err;
    }
    if (profile.status !== "ACTIVE") {
      const err = new Error("PROFILE_DISABLED");
      (err as any).code = "PROFILE_DISABLED";
      throw err;
    }

    try {
      await (prisma as any).profileFollower.create({
        data: {
          profile_id: profileId,
          user_id: userId,
        },
      });
    } catch (err: any) {
      // Ignore unique constraint violations so follow is idempotent
      if (err?.code !== "P2002") {
        throw err;
      }
    }

    const count = await (prisma as any).profileFollower.count({ where: { profile_id: profileId } });
    return { follower_count: count };
  }

  async unfollowProfile(userId: bigint, profileIdRaw: string) {
    const profileId = parseBigIntId(profileIdRaw);

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      const err = new Error("PROFILE_NOT_FOUND");
      (err as any).code = "PROFILE_NOT_FOUND";
      throw err;
    }

    await (prisma as any).profileFollower.deleteMany({
      where: {
        profile_id: profileId,
        user_id: userId,
      },
    });

    const count = await (prisma as any).profileFollower.count({ where: { profile_id: profileId } });
    return { follower_count: count };
  }

  async listPendingClaimsAdmin(status?: ProfileClaimStatus) {
    const where: any = {};
    if (status) where.status = status;

    const claims = await prisma.profileClaim.findMany({
      where,
      include: {
        profile: { include: { category: true } },
        user: true,
        documents: true,
      },
      orderBy: { created_at: "asc" },
    });

    return claims.map((c: any) => ({
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
      documents: (c.documents ?? []).map((d: any) => ({
        id: d.id.toString(),
        field_key: d.field_key,
        original_name: d.original_name,
        mime_type: d.mime_type,
        size_bytes: d.size_bytes,
        download_url: `/profile/review/documents/${d.id.toString()}/download`,
      })),
    }));
  }

  async approveClaimAdmin(params: { adminId: bigint; claimId: string }) {
    const claimId = parseBigIntId(params.claimId);

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.profileClaim.findUnique({
        where: { id: claimId },
        include: { profile: true },
      });

      if (!claim) {
        const err = new Error("CLAIM_NOT_FOUND");
        (err as any).code = "CLAIM_NOT_FOUND";
        throw err;
      }
      if (claim.status !== "PENDING") {
        const err = new Error("INVALID_STATUS");
        (err as any).code = "INVALID_STATUS";
        throw err;
      }

      const profile = await tx.profile.findUnique({ where: { id: claim.profile_id } });
      if (!profile) {
        const err = new Error("PROFILE_NOT_FOUND");
        (err as any).code = "PROFILE_NOT_FOUND";
        throw err;
      }
      if (profile.is_claimed) {
        const err = new Error("ALREADY_CLAIMED");
        (err as any).code = "ALREADY_CLAIMED";
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

  async rejectClaimAdmin(params: { adminId: bigint; claimId: string; reason: string }) {
    const claimId = parseBigIntId(params.claimId);

    const claim = await prisma.profileClaim.findUnique({ where: { id: claimId } });
    if (!claim) {
      const err = new Error("CLAIM_NOT_FOUND");
      (err as any).code = "CLAIM_NOT_FOUND";
      throw err;
    }
    if (claim.status !== "PENDING") {
      const err = new Error("INVALID_STATUS");
      (err as any).code = "INVALID_STATUS";
      throw err;
    }

    const updated = await prisma.profileClaim.update({
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

  async listPendingRequestsAdmin(status?: ProfileRequestStatus) {
    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.profileRequest.findMany({
      where,
      include: {
        parent_category: true,
        user: true,
        documents: true,
        approved_profile: true,
      },
      orderBy: { created_at: "asc" },
    });

    return requests.map((r: any) => ({
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
      documents: (r.documents ?? []).map((d: any) => ({
        id: d.id.toString(),
        field_key: d.field_key,
        original_name: d.original_name,
        mime_type: d.mime_type,
        size_bytes: d.size_bytes,
        download_url: `/profile/review/documents/${d.id.toString()}/download`,
      })),
    }));
  }

  async getSubmissionDocumentForAdmin(documentId: string) {
    const id = parseBigIntId(documentId);
    const doc = await (prisma as any).profileSubmissionDocument.findUnique({ where: { id } });
    if (!doc) {
      const err = new Error("DOC_NOT_FOUND");
      (err as any).code = "DOC_NOT_FOUND";
      throw err;
    }
    return doc;
  }

  async getSubmissionDocumentForUser(userId: bigint, documentId: string) {
    const id = parseBigIntId(documentId);
    const doc: any = await (prisma as any).profileSubmissionDocument.findUnique({
      where: { id },
      include: {
        claim: { select: { user_id: true } },
        request: { select: { user_id: true } },
      },
    });
    if (!doc) {
      const err = new Error("DOC_NOT_FOUND");
      (err as any).code = "DOC_NOT_FOUND";
      throw err;
    }
    const ownerId = doc.claim?.user_id ?? doc.request?.user_id ?? null;
    if (!ownerId || ownerId !== userId) {
      const err = new Error("FORBIDDEN");
      (err as any).code = "FORBIDDEN";
      throw err;
    }
    return doc;
  }

  async approveRequestAdmin(params: { adminId: bigint; requestId: string }) {
    const requestId = parseBigIntId(params.requestId);

    const result = await prisma.$transaction(async (tx) => {
      const reqRow = await tx.profileRequest.findUnique({
        where: { id: requestId },
      });

      if (!reqRow) {
        const err = new Error("REQUEST_NOT_FOUND");
        (err as any).code = "REQUEST_NOT_FOUND";
        throw err;
      }
      if (reqRow.status !== "PENDING") {
        const err = new Error("INVALID_STATUS");
        (err as any).code = "INVALID_STATUS";
        throw err;
      }

      const category = await getProfileCategoryOrThrow(reqRow.parent_category_id);
      if (category.profile_level !== "PROFILE_PARENT") {
        const err = new Error("INVALID_PROFILE_CATEGORY");
        (err as any).code = "INVALID_PROFILE_CATEGORY";
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
        (err as any).code = "PROFILE_ALREADY_EXISTS";
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

  async rejectRequestAdmin(params: { adminId: bigint; requestId: string; reason: string }) {
    const requestId = parseBigIntId(params.requestId);

    const reqRow = await prisma.profileRequest.findUnique({ where: { id: requestId } });
    if (!reqRow) {
      const err = new Error("REQUEST_NOT_FOUND");
      (err as any).code = "REQUEST_NOT_FOUND";
      throw err;
    }
    if (reqRow.status !== "PENDING") {
      const err = new Error("INVALID_STATUS");
      (err as any).code = "INVALID_STATUS";
      throw err;
    }

    const updated = await prisma.profileRequest.update({
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

export const profileSystemService = new ProfileSystemService();
