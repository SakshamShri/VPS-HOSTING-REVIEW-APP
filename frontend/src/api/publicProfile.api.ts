const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface PublicProfileSummary {
  id: string;
  name: string;
  isClaimed: boolean;
  isVerified: boolean;
  categoryName: string | null;
}

export interface PublicProfileDetail extends PublicProfileSummary {
  status: "ACTIVE" | "DISABLED";
  followerCount: number;
  isFollowing: boolean;
}

export async function fetchPublicProfiles(): Promise<PublicProfileSummary[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/public-profiles`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load public profiles (${res.status})`);
  }

  const data = (await res.json()) as {
    profiles: Array<{
      id: string;
      name: string;
      is_claimed: boolean;
      claimed_by_user_id: string | null;
      category: { id: string; name: string } | null;
    }>;
  };

  return (data.profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    isClaimed: p.is_claimed,
    isVerified: p.is_claimed, // in this phase, claimed == verified via manual admin approval
    categoryName: p.category?.name ?? null,
  }));
}

export async function fetchPublicProfileDetail(id: string): Promise<PublicProfileDetail> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/public-profiles/${id}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 404) {
      throw new Error("NOT_FOUND:Profile not found");
    }
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load profile (${res.status})`);
  }

  const data = (await res.json()) as {
    profile: {
      id: string;
      name: string;
      is_claimed: boolean;
      claimed_by_user_id: string | null;
      category: { id: string; name: string } | null;
      created_at: string;
      status: "ACTIVE" | "DISABLED";
      follower_count: number;
      is_following: boolean;
    };
  };

  const p = data.profile;
  return {
    id: p.id,
    name: p.name,
    isClaimed: p.is_claimed,
    isVerified: p.is_claimed,
    categoryName: p.category?.name ?? null,
    status: p.status,
    followerCount: p.follower_count ?? 0,
    isFollowing: p.is_following ?? false,
  };
}

export async function followPublicProfile(id: string): Promise<{ followerCount: number }> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/public-profiles/${id}/follow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    if (res.status === 404) {
      throw new Error("NOT_FOUND:Profile not found");
    }
    throw new Error(data.message || `Failed to follow profile (${res.status})`);
  }

  const body = (await res.json()) as { follower_count: number };
  return { followerCount: body.follower_count ?? 0 };
}

export async function unfollowPublicProfile(id: string): Promise<{ followerCount: number }> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/public-profiles/${id}/unfollow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    if (res.status === 404) {
      throw new Error("NOT_FOUND:Profile not found");
    }
    throw new Error(data.message || `Failed to unfollow profile (${res.status})`);
  }

  const body = (await res.json()) as { follower_count: number };
  return { followerCount: body.follower_count ?? 0 };
}
