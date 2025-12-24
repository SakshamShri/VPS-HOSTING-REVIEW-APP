const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface InvitePollSummary {
  pollId: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO";
  title: string;
  description: string | null;
  status: "LIVE" | "SCHEDULED" | "DRAFT" | "CLOSED";
  start_at: string | null;
  end_at: string | null;
}

export async function validateInvite(token: string): Promise<InvitePollSummary> {
  const res = await fetch(`${API_BASE}/invites/validate?token=${encodeURIComponent(token)}`);

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to validate invite (${res.status})`);
  }

  const data = (await res.json()) as { poll: InvitePollSummary };
  return data.poll;
}

export async function acceptInvite(token: string): Promise<void> {
  const authToken = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/invites/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to accept invite (${res.status})`);
  }
}

export async function rejectInvite(token: string): Promise<void> {
  const authToken = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/invites/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to reject invite (${res.status})`);
  }
}
