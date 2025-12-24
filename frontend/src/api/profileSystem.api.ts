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
