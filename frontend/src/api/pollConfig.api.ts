import type { PollConfig, PollConfigStatus, PollTemplateType, ThemeTone, AccentStyle } from "../types/pollConfig.types";

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

// ---- API types ----

type ApiStatus = "DRAFT" | "ACTIVE" | "DISABLED";

type ApiTemplate =
  | "STANDARD_LIST"
  | "YES_NO"
  | "RATING"
  | "SWIPE"
  | "POINT_ALLOC"
  | "MEDIA_COMPARE";

export interface PollConfigApi {
  id: string | number;
  name: string;
  slug: string;
  status: ApiStatus;
  category_id: string | number;
  ui_template: ApiTemplate;
  theme: any;
  rules: any;
  permissions: any;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PollConfigEditorMeta {
  id?: string;
  categoryId: string;
  rules: any;
  permissions: any;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PollConfigEditorData {
  config: PollConfig;
  meta: PollConfigEditorMeta;
}

export interface PollConfigListItem {
  id: string;
  name: string;
  status: PollConfigStatus;
  template: PollTemplateType;
  updatedAt: string;
}

// ---- Mappers ----

function mapStatusFromApi(status: ApiStatus): PollConfigStatus {
  return status;
}

function mapStatusToApi(status: PollConfigStatus): ApiStatus {
  return status;
}

function mapTemplateFromApi(tpl: ApiTemplate): PollTemplateType {
  switch (tpl) {
    case "YES_NO":
      return "yes-no-cards";
    case "RATING":
      return "rating-bar";
    case "SWIPE":
      return "swipe-deck";
    case "POINT_ALLOC":
      return "point-allocation";
    case "MEDIA_COMPARE":
      return "media-compare";
    case "STANDARD_LIST":
    default:
      return "standard-list";
  }
}

function mapTemplateToApi(tpl: PollTemplateType): ApiTemplate {
  switch (tpl) {
    case "yes-no-cards":
      return "YES_NO";
    case "rating-bar":
      return "RATING";
    case "swipe-deck":
      return "SWIPE";
    case "point-allocation":
      return "POINT_ALLOC";
    case "media-compare":
      return "MEDIA_COMPARE";
    case "standard-list":
    default:
      return "STANDARD_LIST";
  }
}

function mapThemeFromApi(theme: any): { themeTone: ThemeTone; accentStyle: AccentStyle } {
  const tone: ThemeTone | undefined = theme?.themeTone;
  const accent: AccentStyle | undefined = theme?.accentStyle;

  return {
    themeTone: tone ?? "emerald",
    accentStyle: accent ?? "soft",
  };
}

function buildThemePayload(themeTone: ThemeTone, accentStyle: AccentStyle) {
  // Persist both concrete colors and the higher-level tokens so we can
  // round-trip cleanly without schema changes.
  const toneColors: Record<ThemeTone, { primary: string; accent: string }> = {
    emerald: { primary: "#059669", accent: "#ECFDF5" },
    indigo: { primary: "#4F46E5", accent: "#EEF2FF" },
    amber: { primary: "#F59E0B", accent: "#FFFBEB" },
    rose: { primary: "#F43F5E", accent: "#FFF1F2" },
  };

  const colors = toneColors[themeTone];

  return {
    primaryColor: colors.primary,
    accentColor: colors.accent,
    themeTone,
    accentStyle,
  };
}

function mapFromApi(api: PollConfigApi): PollConfigEditorData {
  const { themeTone, accentStyle } = mapThemeFromApi(api.theme ?? {});

  const config: PollConfig = {
    id: String(api.id),
    name: api.name,
    typeId: api.slug,
    status: mapStatusFromApi(api.status),
    template: mapTemplateFromApi(api.ui_template),
    themeTone,
    accentStyle,
    // Title/description are kept frontend-only for live preview.
    title: "",
    description: undefined,
  };

  const meta: PollConfigEditorMeta = {
    id: String(api.id),
    categoryId: String(api.category_id),
    rules: api.rules ?? {},
    permissions: api.permissions ?? {},
    version: api.version,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };

  return { config, meta };
}

function buildApiPayload(
  config: PollConfig,
  meta: PollConfigEditorMeta
): Omit<PollConfigApi, "id" | "created_at" | "updated_at"> {
  return {
    name: config.name,
    slug: config.typeId || config.name,
    status: mapStatusToApi(config.status),
    category_id: meta.categoryId,
    ui_template: mapTemplateToApi(config.template),
    theme: buildThemePayload(config.themeTone, config.accentStyle),
    rules: meta.rules ?? {},
    permissions: meta.permissions ?? {},
    version: meta.version ?? 1,
  } as any;
}

// ---- API calls ----

export async function fetchPollConfigs(): Promise<PollConfigListItem[]> {
  const res = await fetch(`${API_BASE}/poll-configs`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load poll configs: ${res.status}`);
  }
  const data = (await res.json()) as PollConfigApi[];
  return data.map((cfg) => ({
    id: String(cfg.id),
    name: cfg.name,
    status: mapStatusFromApi(cfg.status),
    template: mapTemplateFromApi(cfg.ui_template),
    updatedAt: cfg.updated_at,
  }));
}

export async function fetchPollConfig(id: string): Promise<PollConfigEditorData> {
  const res = await fetch(`${API_BASE}/poll-configs/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load poll config: ${res.status}`);
  }
  const data = (await res.json()) as PollConfigApi;
  return mapFromApi(data);
}

export async function createPollConfig(
  config: PollConfig,
  meta: PollConfigEditorMeta
): Promise<PollConfigEditorData> {
  const payload = buildApiPayload(config, { ...meta, version: 1 });

  const res = await fetch(`${API_BASE}/poll-configs`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      name: payload.name,
      status: payload.status,
      categoryId: String(payload.category_id),
      uiTemplate: payload.ui_template,
      theme: payload.theme,
      rules: payload.rules,
      permissions: payload.permissions,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create poll config: ${res.status}`);
  }

  const data = (await res.json()) as PollConfigApi;
  return mapFromApi(data);
}

export async function updatePollConfig(
  id: string,
  config: PollConfig,
  meta: PollConfigEditorMeta
): Promise<PollConfigEditorData> {
  const payload = buildApiPayload(config, meta);

  const res = await fetch(`${API_BASE}/poll-configs/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      name: payload.name,
      status: payload.status,
      categoryId: meta.categoryId,
      uiTemplate: payload.ui_template,
      theme: payload.theme,
      rules: payload.rules,
      permissions: payload.permissions,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update poll config: ${res.status}`);
  }

  const data = (await res.json()) as PollConfigApi;
  return mapFromApi(data);
}

export async function publishPollConfig(id: string): Promise<PollConfigEditorData> {
  const res = await fetch(`${API_BASE}/poll-configs/${id}/publish`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to publish poll config: ${res.status}`);
  }

  const data = (await res.json()) as PollConfigApi;
  return mapFromApi(data);
}

export async function clonePollConfig(id: string): Promise<PollConfigEditorData> {
  const res = await fetch(`${API_BASE}/poll-configs/${id}/clone`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to clone poll config: ${res.status}`);
  }

  const data = (await res.json()) as PollConfigApi;
  return mapFromApi(data);
}
