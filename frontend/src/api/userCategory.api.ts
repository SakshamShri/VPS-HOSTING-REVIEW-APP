const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export type UserCategoryType = "parent" | "child";
export type UserCategoryStatus = "active" | "disabled";

export interface UserCategoryNode {
  id: string;
  name: string;
  type: UserCategoryType;
  status: UserCategoryStatus;
  children?: UserCategoryNode[];
}

interface UserCategoryResponse {
  categories: UserCategoryNode[];
}

export async function fetchUserClaimableCategories(): Promise<UserCategoryNode[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/categories/claimable`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load categories (${res.status})`);
  }

  const data = (await res.json()) as UserCategoryResponse;
  return data.categories ?? [];
}
