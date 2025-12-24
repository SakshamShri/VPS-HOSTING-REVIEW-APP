const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface FeedPollItem {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  categoryName: string;
  startAt: string | null;
  endAt: string | null;
}

export interface UserFeedResponse {
  polls: FeedPollItem[];
}

export async function fetchUserFeed(): Promise<FeedPollItem[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/feed`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load user feed: ${res.status}`);
  }

  const data = (await res.json()) as UserFeedResponse;
  return data.polls ?? [];
}
