const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export type UserPollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO";

export interface CreateUserPollRequest {
  category_id: string;
  type: UserPollType;
  title: string;
  description?: string | null;
  options: string[];
  start_mode: "INSTANT" | "SCHEDULED";
  start_at?: string | null;
  end_at?: string | null;
  source_info?: string | null;
}

export interface CreateUserPollResponse {
  id: string;
  status: "DRAFT" | "LIVE" | "SCHEDULED" | "CLOSED";
  start_at: string | null;
  end_at: string | null;
}

export async function createUserPoll(
  payload: CreateUserPollRequest
): Promise<CreateUserPollResponse> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to create poll (${res.status})`);
  }

  const data = (await res.json()) as CreateUserPollResponse;
  return data;
}

export interface CreateInvitesRequest {
  mobiles?: string[];
  existing_group_ids?: string[];
  new_group?: {
    name: string;
    mobiles: string[];
  } | null;
}

export interface InviteDTO {
  mobile: string;
  token: string;
  whatsapp_link: string;
}

export async function createOwnerInvite(pollId: string): Promise<{ token: string }> {
	const authToken = localStorage.getItem("authToken");

	const res = await fetch(`${API_BASE}/user/polls/${pollId}/owner-invite`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
		},
	});

	if (!res.ok) {
		const data = (await res.json().catch(() => ({}))) as { message?: string };
		if (res.status === 401) {
			throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
		}
		throw new Error(data.message || `Failed to create owner invite (${res.status})`);
	}

	const data = (await res.json()) as { token: string };
	return data;
}

export async function createUserPollInvites(
  pollId: string,
  payload: CreateInvitesRequest
): Promise<InviteDTO[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls/${pollId}/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to create invites (${res.status})`);
  }

  const data = (await res.json()) as { invites: InviteDTO[] };
  return data.invites;
}

export interface InviteGroupDTO {
  id: string;
  name: string;
  members: string[];
}

export async function fetchInviteGroups(): Promise<InviteGroupDTO[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/groups`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to load groups (${res.status})`);
  }

  const data = (await res.json()) as { groups: InviteGroupDTO[] };
  return data.groups;
}

export async function createInviteGroup(
  name: string,
  mobiles: string[]
): Promise<InviteGroupDTO> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, mobiles }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to create group (${res.status})`);
  }

  const data = (await res.json()) as { group: InviteGroupDTO };
  return data.group;
}

export async function updateInviteGroup(
  id: string,
  name: string,
  mobiles: string[]
): Promise<InviteGroupDTO> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/groups/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, mobiles }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to update group (${res.status})`);
  }

  const data = (await res.json()) as { group: InviteGroupDTO };
  return data.group;
}
