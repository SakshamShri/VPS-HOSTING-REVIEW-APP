const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface PublicProfileSummary {
  id: string;
  name: string;
  isClaimed: boolean;
  isVerified: boolean;
  categoryName: string | null;
  photoUrl?: string | null;
}

export interface PublicProfileDetail extends PublicProfileSummary {
  status: "ACTIVE" | "DISABLED";
  followerCount: number;
  isFollowing: boolean;
  about?: string | null;
}

export interface PsiParameters {
  trustIntegrity: number;
  performanceDelivery: number;
  responsiveness: number;
  leadershipAbility: number;
}

export interface ProfilePsiSummary {
  profileId: string;
  voteCount: number;
  overallScore: number;
  parameters: PsiParameters;
}

export interface TrendingProfileWithPsi {
  id: string;
  name: string;
  categoryName: string | null;
  photoUrl: string | null;
  psiScore: number;
  voteCount: number;
  parameters: PsiParameters;
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
      photo_url?: string | null;
      about?: string | null;
    }>;
  };

  return (data.profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    isClaimed: p.is_claimed,
    isVerified: p.is_claimed, // in this phase, claimed == verified via manual admin approval
    categoryName: p.category?.name ?? null,
    photoUrl: p.photo_url ?? null,
    about: p.about ?? null,
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
      photo_url?: string | null;
      about?: string | null;
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
    photoUrl: p.photo_url ?? null,
    about: p.about ?? null,
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

export async function fetchPsiTrendingProfiles(): Promise<TrendingProfileWithPsi[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/psi/trending`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error(
        "AUTH_REQUIRED:" + (data.message || "Please log in to view trending PSI profiles"),
      );
    }
    throw new Error(
      data.message || `Failed to load PSI trending profiles (${res.status})`,
    );
  }

  const data = (await res.json()) as {
    profiles: Array<{
      profileId: string;
      overallScore: number;
      voteCount: number;
      parameters: PsiParameters;
      profile: {
        id: string;
        name: string;
        categoryName: string | null;
        photoUrl: string | null;
      } | null;
    }>;
  };

  return (data.profiles ?? []).map((item) => {
    const base = item.profile;
    return {
      id: base?.id ?? item.profileId,
      name: base?.name ?? "Unknown profile",
      categoryName: base?.categoryName ?? null,
      photoUrl: resolvePhotoUrl(base?.photoUrl ?? null),
      psiScore: item.overallScore,
      voteCount: item.voteCount,
      parameters: item.parameters,
    };
  });
}

export async function submitPsiVote(
  profileId: string,
  ratings: PsiParameters,
): Promise<ProfilePsiSummary> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/psi/profiles/${profileId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(ratings),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error(
        "AUTH_REQUIRED:" + (data.message || "Please log in to submit a PSI vote"),
      );
    }
    if (res.status === 404) {
      throw new Error("NOT_FOUND:" + (data.message || "Profile not found"));
    }
    throw new Error(data.message || `Failed to submit PSI vote (${res.status})`);
  }

  const body = (await res.json()) as ProfilePsiSummary;
  return body;
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
