const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:4000";

export type UserPollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "RATING" | "YES_NO";

export interface CreateUserPollRequest {
  category_id: string;
  type: UserPollType;
  title: string;
  description?: string | null;
  options: {
    label: string;
    image_url?: string | null;
  }[];
  start_mode: "INSTANT" | "SCHEDULED";
  start_at?: string | null;
  end_at?: string | null;
  source_info?: string | null;
  mode?: "INVITE_ONLY" | "OPEN";
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

export async function joinOpenUserPoll(
  pollId: string
): Promise<{ token: string; status: UserPollInviteStatus }> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/open-polls/${pollId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to join open poll (${res.status})`);
  }

  const data = (await res.json()) as { token: string; status: UserPollInviteStatus };
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

export interface MyPollSummary {
  id: string;
  title: string;
  description: string | null;
  type: UserPollType;
  status: "DRAFT" | "LIVE" | "SCHEDULED" | "CLOSED";
  start_at: string | null;
  end_at: string | null;
  total_invites: number;
  accepted_count: number;
  pending_count: number;
  rejected_count: number;
}

export type UserPollInviteStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface UserPollInviteSummary {
  mobile: string;
  name: string | null;
  bio: string | null;
  status: UserPollInviteStatus;
}

export interface MyPollDetail extends MyPollSummary {
  invites: UserPollInviteSummary[];
}

export async function fetchMyPolls(): Promise<MyPollSummary[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load polls (${res.status})`);
  }

  const data = (await res.json()) as { polls: MyPollSummary[] };
  return data.polls ?? [];
}

export async function endUserPoll(id: string): Promise<MyPollSummary> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls/${id}/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to end poll (${res.status})`);
  }

  const data = (await res.json()) as { poll: MyPollSummary };
  return data.poll;
}

export async function uploadUserPollOptionImage(file: File): Promise<string> {
  const token = localStorage.getItem("authToken");

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE}/user/poll-option-images`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to upload option image (${res.status})`);
  }

  const data = (await res.json()) as { image_url: string };
  const raw = data.image_url;
  if (!raw) return raw;
  // If backend returned a relative /uploads path, convert it to a full URL on the API base
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  const base = API_BASE.replace(/\/$/, "");
  return `${base}${raw}`;
}

export async function fetchMyPollDetail(id: string): Promise<MyPollDetail> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls/${id}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load poll details (${res.status})`);
  }

  const data = (await res.json()) as { poll: MyPollDetail };
  return data.poll;
}

export type UserPollInvitationSummary = {
  pollId: string;
  title: string;
  description: string | null;
  pollStatus: "DRAFT" | "LIVE" | "SCHEDULED" | "CLOSED";
  start_at: string | null;
  end_at: string | null;
  inviteStatus: UserPollInviteStatus;
  state: "ONGOING" | "FUTURE" | "EXPIRED";
  token: string;
};

export async function fetchMyPollInvitations(): Promise<UserPollInvitationSummary[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/poll-invitations`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load poll invitations (${res.status})`);
  }

  const data = (await res.json()) as { invites: UserPollInvitationSummary[] };
  return data.invites ?? [];
}

export async function extendUserPoll(id: string, endAtIso: string): Promise<MyPollSummary> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls/${id}/extend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ end_at: endAtIso }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to extend poll (${res.status})`);
  }

  const data = (await res.json()) as { poll: MyPollSummary };
  return data.poll;
}

export interface InviteGroupMemberDTO {
  mobile: string;
  name: string | null;
  bio: string | null;
}

export interface InviteGroupDTO {
  id: string;
  name: string;
  tags?: string[];
  photo_url?: string | null;
  members: InviteGroupMemberDTO[];
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
  members: InviteGroupMemberDTO[],
  tags: string[]
): Promise<InviteGroupDTO> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, tags, members }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to create group (${res.status})`);
  }

  const data = (await res.json()) as { group: InviteGroupDTO };
  return data.group;
}

export async function uploadInviteGroupPhoto(id: string, file: File): Promise<string> {
  const token = localStorage.getItem("authToken");

  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`${API_BASE}/user/groups/${id}/photo`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to upload group photo (${res.status})`);
  }

  const data = (await res.json()) as { photo_url: string };
  const raw = data.photo_url;
  if (!raw) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  const base = API_BASE.replace(/\/$/, "");
  return `${base}${raw}`;
}

export async function updateInviteGroup(
  id: string,
  name: string,
  members: InviteGroupMemberDTO[],
  tags: string[]
): Promise<InviteGroupDTO> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/groups/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, tags, members }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to update group (${res.status})`);
  }

  const data = (await res.json()) as { group: InviteGroupDTO };
  return data.group;
}
