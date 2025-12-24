import type { PollFormValues, PollListItem, PollStatus } from "../types/poll.types";

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

type ApiPollStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

interface PollListItemApi {
  id: string | number;
  title: string;
  status: ApiPollStatus;
  category_path: string;
  poll_config_name: string;
  start_at: string | null;
  end_at: string | null;
}

interface PollDetailApi {
  id: string | number;
  title: string;
  description: string | null;
  status: ApiPollStatus;
  category_id: string | number;
  poll_config_id: string | number;
  category_path: string;
  poll_config_name: string;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapStatusFromApi(status: ApiPollStatus): PollStatus {
  return status;
}

function mapStatusToApi(status: PollStatus): ApiPollStatus {
  return status;
}

function mapListItem(api: PollListItemApi): PollListItem {
  return {
    id: String(api.id),
    title: api.title,
    status: mapStatusFromApi(api.status),
    categoryPath: api.category_path,
    pollConfigName: api.poll_config_name,
    startAt: api.start_at,
    endAt: api.end_at,
  };
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  // Expect ISO string from backend; trim to yyyy-MM-ddTHH:mm
  return value.slice(0, 16);
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function fetchPolls(): Promise<PollListItem[]> {
  const res = await fetch(`${API_BASE}/polls`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load polls: ${res.status}`);
  }
  const data = (await res.json()) as PollListItemApi[];
  return data.map(mapListItem);
}

export interface PollEditorData {
  values: PollFormValues;
}

export async function fetchPoll(id: string): Promise<PollEditorData> {
  const res = await fetch(`${API_BASE}/polls/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load poll: ${res.status}`);
  }
  const api = (await res.json()) as PollDetailApi;

  const values: PollFormValues = {
    title: api.title,
    description: api.description ?? "",
    categoryId: String(api.category_id),
    pollConfigId: String(api.poll_config_id),
    startAt: toDatetimeLocal(api.start_at),
    endAt: toDatetimeLocal(api.end_at),
    status: mapStatusFromApi(api.status),
  };

  return { values };
}

export interface PollTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface PollDetailForVote {
  id: string;
  title: string;
  description: string;
  status: PollStatus;
  startAt: string | null;
  endAt: string | null;
  pollConfig: {
    templateType: string;
    theme: PollTheme;
    rules: any;
  };
}

export async function fetchPollForVote(id: string): Promise<PollDetailForVote> {
  const res = await fetch(`${API_BASE}/polls/${id}/vote-details`);
  if (!res.ok) {
    throw new Error(`Failed to load poll: ${res.status}`);
  }
  const api = (await res.json()) as {
    poll: {
      id: string | number;
      title: string;
      description: string | null;
      status: ApiPollStatus;
      startAt: string | null;
      endAt: string | null;
    };
    pollConfig: {
      templateType: string;
      theme?: Partial<PollTheme> | null;
      rules?: any;
    };
  };

  const theme: Partial<PollTheme> | null | undefined = api.pollConfig?.theme;
  const safeTheme: PollTheme = {
    primaryColor: theme?.primaryColor ?? "#059669",
    accentColor: theme?.accentColor ?? "#ECFDF5",
    backgroundColor: theme?.backgroundColor ?? "#020617",
    textColor: theme?.textColor ?? "#E5E7EB",
  };

  return {
    id: String(api.poll.id),
    title: api.poll.title,
    description: api.poll.description ?? "",
    status: mapStatusFromApi(api.poll.status),
    startAt: api.poll.startAt,
    endAt: api.poll.endAt,
    pollConfig: {
      templateType: api.pollConfig?.templateType ?? "STANDARD_LIST",
      theme: safeTheme,
      rules: api.pollConfig?.rules ?? {},
    },
  };
}

function buildPayload(values: PollFormValues) {
  return {
    title: values.title,
    description: values.description || null,
    categoryId: values.categoryId,
    pollConfigId: values.pollConfigId,
    startAt: fromDatetimeLocal(values.startAt),
    endAt: fromDatetimeLocal(values.endAt),
  };
}

export async function createPoll(values: PollFormValues): Promise<string> {
  const body = buildPayload(values);

  const res = await fetch(`${API_BASE}/polls`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create poll: ${res.status}`);
  }

  const api = (await res.json()) as PollDetailApi;
  return String(api.id);
}

export async function updatePoll(id: string, values: PollFormValues): Promise<void> {
  const body = buildPayload(values);

  const res = await fetch(`${API_BASE}/polls/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update poll: ${res.status}`);
  }
}

export async function publishPoll(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/polls/${id}/publish`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to publish poll: ${res.status}`);
  }
}

export async function closePoll(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/polls/${id}/close`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to close poll: ${res.status}`);
  }
}

export async function submitVote(
  pollId: string,
  response: unknown,
  inviteToken?: string
): Promise<void> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      response,
      invite_token: inviteToken,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to submit vote: ${res.status}`);
  }
}
