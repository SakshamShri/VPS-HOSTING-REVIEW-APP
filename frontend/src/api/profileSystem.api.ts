import type { ProfileAdminCuratedMode, ProfileCategoryLevel, ProfileStatus } from "../types/profileSystem.types";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token =
    localStorage.getItem("adminAuthToken") ?? localStorage.getItem("authToken");
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type TicketStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TicketDocument = {
  id: string;
  fieldKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
};

export type ProfileClaimTicket = {
  id: string;
  status: TicketStatus;
  createdAt: string;
  profileId: string | null;
  profileName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  userId: string;
  userMobile: string | null;
  submittedData: unknown;
  documents: TicketDocument[];
};

export type ProfileRequestTicket = {
  id: string;
  status: TicketStatus;
  createdAt: string;
  requestedName: string;
  categoryId: string | null;
  categoryName: string | null;
  userId: string;
  userMobile: string | null;
  submittedData: unknown;
  approvedProfileId: string | null;
  documents: TicketDocument[];
};

export type ProfileCategoryNode = {
  id: string;
  name: string;
  level: ProfileCategoryLevel;
  status: "ACTIVE" | "DISABLED";
  parentId: string | null;
  claimable: "YES" | "NO";
  requestAllowed: "YES" | "NO";
  adminCurated: ProfileAdminCuratedMode;
  children: ProfileCategoryNode[];
};

export type AdminProfileSummary = {
  id: string;
  name: string;
  status: ProfileStatus;
  isClaimed: boolean;
  claimedByUserId: string | null;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
};

// ----- Category APIs -----

export async function fetchProfileCategoryTreeAdmin(): Promise<ProfileCategoryNode[]> {
  const res = await fetch(`${API_BASE}/profile/categories/tree`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to load profile categories (${res.status})`);
  }

  const data = (await res.json()) as {
    categories: Array<{
      id: string;
      name_en: string;
      level: ProfileCategoryLevel;
      status: "ACTIVE" | "DISABLED";
      parent_id: string | null;
      profile_claimable: "YES" | "NO";
      profile_request_allowed: "YES" | "NO";
      profile_admin_curated: ProfileAdminCuratedMode;
      claim_requirements: unknown;
      request_requirements: unknown;
      children: any[];
    }>;
  };

  function mapNode(node: any): ProfileCategoryNode {
    return {
      id: String(node.id),
      name: node.name_en,
      level: node.level,
      status: node.status,
      parentId: node.parent_id ?? null,
      claimable: node.profile_claimable ?? "NO",
      requestAllowed: node.profile_request_allowed ?? "NO",
      adminCurated: node.profile_admin_curated ?? "NONE",
      children: (node.children ?? []).map(mapNode),
    };
  }

  return (data.categories ?? []).map(mapNode);
}

export async function createProfileCategoryAdmin(payload: {
  name: string;
  description?: string | null;
  level: ProfileCategoryLevel;
  parentId?: string | null;
  status: "ACTIVE" | "DISABLED";
  claimable: "YES" | "NO";
  requestAllowed: "YES" | "NO";
  adminCurated: ProfileAdminCuratedMode;
  claimRequirements?: unknown;
  requestRequirements?: unknown;
}): Promise<void> {
  const body = {
    name_en: payload.name,
    description: payload.description ?? null,
    level: payload.level,
    parent_id: payload.parentId ?? null,
    status: payload.status,
    claimable: payload.claimable,
    request_allowed: payload.requestAllowed,
    admin_curated: payload.adminCurated,
    claim_requirements: payload.claimRequirements,
    request_requirements: payload.requestRequirements,
  };

  const res = await fetch(`${API_BASE}/profile/categories`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to create profile category (${res.status})`);
  }
}

// ----- Profile APIs -----

export async function fetchProfilesAdmin(categoryId?: string): Promise<AdminProfileSummary[]> {
  const url = new URL(`${API_BASE}/profile/profiles`);
  if (categoryId) {
    url.searchParams.set("category_id", categoryId);
  }

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to load profiles (${res.status})`);
  }

  const data = (await res.json()) as {
    profiles: Array<{
      id: string;
      name: string;
      status: ProfileStatus;
      is_claimed: boolean;
      claimed_by_user_id: string | null;
      category_id: string;
      category_name: string;
      created_at: string;
      updated_at: string;
    }>;
  };

  return (data.profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    isClaimed: p.is_claimed,
    claimedByUserId: p.claimed_by_user_id,
    categoryId: p.category_id,
    categoryName: p.category_name,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function createProfileAdmin(payload: {
  name: string;
  categoryId: string;
  status?: ProfileStatus;
}): Promise<void> {
  const body = {
    name: payload.name,
    category_id: payload.categoryId,
    status: payload.status,
  };

  const res = await fetch(`${API_BASE}/profile/profiles`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to create profile (${res.status})`);
  }
}

export async function updateProfileStatusAdmin(id: string, status: ProfileStatus): Promise<void> {
  const body = { status };

  const res = await fetch(`${API_BASE}/profile/profiles/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to update profile (${res.status})`);
  }
}

// ----- Ticket Center (claims and requests) -----

export async function fetchClaimTicketsAdmin(): Promise<ProfileClaimTicket[]> {
  const res = await fetch(`${API_BASE}/profile/review/claims`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to load claim tickets (${res.status})`);
  }

  const data = (await res.json()) as {
    claims: Array<{
      id: string;
      status: TicketStatus;
      created_at: string;
      profile: { id?: string; name?: string } | null;
      category: { id?: string; name?: string } | null;
      user: { id: string; mobile: string | null };
      submitted_data: unknown;
      documents: Array<{
        id: string;
        field_key: string;
        original_name: string;
        mime_type: string;
        size_bytes: number;
        download_url: string;
      }>;
    }>;
  };

  return (data.claims ?? []).map((c) => ({
    id: c.id,
    status: c.status,
    createdAt: c.created_at,
    profileId: c.profile?.id ?? null,
    profileName: c.profile?.name ?? null,
    categoryId: c.category?.id ?? null,
    categoryName: c.category?.name ?? null,
    userId: c.user.id,
    userMobile: c.user.mobile ?? null,
    submittedData: c.submitted_data,
    documents: (c.documents ?? []).map((d) => ({
      id: d.id,
      fieldKey: d.field_key,
      originalName: d.original_name,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      downloadUrl: `${API_BASE}${d.download_url}`,
    })),
  }));
}

export async function fetchRequestTicketsAdmin(): Promise<ProfileRequestTicket[]> {
  const res = await fetch(`${API_BASE}/profile/review/requests`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to load request tickets (${res.status})`);
  }

  const data = (await res.json()) as {
    requests: Array<{
      id: string;
      status: TicketStatus;
      created_at: string;
      requested_name: string;
      category: { id?: string; name?: string } | null;
      user: { id: string; mobile: string | null };
      submitted_data: unknown;
      approved_profile_id: string | null;
      documents: Array<{
        id: string;
        field_key: string;
        original_name: string;
        mime_type: string;
        size_bytes: number;
        download_url: string;
      }>;
    }>;
  };

  return (data.requests ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    requestedName: r.requested_name,
    categoryId: r.category?.id ?? null,
    categoryName: r.category?.name ?? null,
    userId: r.user.id,
    userMobile: r.user.mobile ?? null,
    submittedData: r.submitted_data,
    approvedProfileId: r.approved_profile_id,
    documents: (r.documents ?? []).map((d) => ({
      id: d.id,
      fieldKey: d.field_key,
      originalName: d.original_name,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      downloadUrl: `${API_BASE}${d.download_url}`,
    })),
  }));
}

export async function approveClaimTicketAdmin(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/profile/review/claims/${id}/approve`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to approve claim (${res.status})`);
  }
}

export async function rejectClaimTicketAdmin(id: string, reason?: string): Promise<void> {
  const body = reason ? { reason } : {};

  const res = await fetch(`${API_BASE}/profile/review/claims/${id}/reject`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to reject claim (${res.status})`);
  }
}

export async function approveRequestTicketAdmin(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/profile/review/requests/${id}/approve`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to approve request (${res.status})`);
  }
}

export async function rejectRequestTicketAdmin(id: string, reason?: string): Promise<void> {
  const body = reason ? { reason } : {};

  const res = await fetch(`${API_BASE}/profile/review/requests/${id}/reject`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to reject request (${res.status})`);
  }
}
