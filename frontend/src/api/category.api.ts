import type { CategoryNode } from "../types/category";
import type { CategoryFormValues, OverrideFlags } from "../types/category.form.types";

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

// ---- Helpers ----

type ApiYesNo = "YES" | "NO";
type ApiAdminCurated = "YES" | "NO" | "PARTIAL";
type ApiStatus = "ACTIVE" | "DISABLED";

type ApiTreeNode = {
  id: string | number;
  name_en: string;
  is_parent: boolean;
  status: ApiStatus;
  children: ApiTreeNode[];
};

function mapStatusFromApi(status: ApiStatus): "active" | "disabled" {
  return status === "ACTIVE" ? "active" : "disabled";
}

function mapTreeNode(api: ApiTreeNode): CategoryNode {
  return {
    id: String(api.id),
    name: api.name_en,
    type: api.is_parent ? "parent" : "child",
    status: mapStatusFromApi(api.status),
    children: api.children?.map(mapTreeNode) ?? [],
  };
}

function mapStatusToApi(status: "active" | "disabled"): ApiStatus {
  return status === "active" ? "ACTIVE" : "DISABLED";
}

// ---- API calls ----

export async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const res = await fetch(`${API_BASE}/categories/tree`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to load categories: ${res.status}`);
  }
  const data = (await res.json()) as ApiTreeNode[];
  return data.map(mapTreeNode);
}

function collectParentNodes(nodes: CategoryNode[], acc: CategoryNode[] = []): CategoryNode[] {
  for (const node of nodes) {
    if (node.type === "parent") {
      acc.push(node);
    }
    if (node.children && node.children.length) {
      collectParentNodes(node.children, acc);
    }
  }
  return acc;
}

export async function fetchParentCategories(): Promise<CategoryNode[]> {
  const tree = await fetchCategoryTree();
  return collectParentNodes(tree, []);
}

function collectActiveChildNodes(nodes: CategoryNode[], acc: CategoryNode[] = []): CategoryNode[] {
  for (const node of nodes) {
    if (node.type === "child" && node.status === "active") {
      acc.push(node);
    }
    if (node.children && node.children.length) {
      collectActiveChildNodes(node.children, acc);
    }
  }
  return acc;
}

export async function fetchActiveChildCategories(): Promise<CategoryNode[]> {
  const tree = await fetchCategoryTree();
  return collectActiveChildNodes(tree, []);
}

export async function createCategory(
  values: CategoryFormValues,
  overrides: OverrideFlags
): Promise<void> {
  const isParent = values.kind === "parent";

  const payload = {
    name_en: values.name,
    name_local: null,
    description: values.description || null,
    is_parent: isParent,
    parent_id: isParent ? null : values.parentCategoryId || null,
    claimable_default: values.claimable as ApiYesNo,
    request_allowed_default: values.requestAllowed as ApiYesNo,
    admin_curated_default: values.adminCurated as ApiAdminCurated,
    claimable: !isParent && overrides.claimable ? (values.claimable as ApiYesNo) : null,
    request_allowed:
      !isParent && overrides.requestAllowed ? (values.requestAllowed as ApiYesNo) : null,
    admin_curated:
      !isParent && overrides.adminCurated ? (values.adminCurated as ApiAdminCurated) : null,
    status: mapStatusToApi(values.status),
    display_order: 0,
    notes: null,
  };

  const res = await fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create category: ${res.status}`);
  }
}

export async function updateCategory(
  id: string,
  values: CategoryFormValues,
  overrides: OverrideFlags
): Promise<void> {
  const isParent = values.kind === "parent";

  const payload = {
    name_en: values.name,
    name_local: null,
    description: values.description || null,
    is_parent: isParent,
    parent_id: isParent ? null : values.parentCategoryId || null,
    claimable_default: values.claimable as ApiYesNo,
    request_allowed_default: values.requestAllowed as ApiYesNo,
    admin_curated_default: values.adminCurated as ApiAdminCurated,
    claimable: !isParent && overrides.claimable ? (values.claimable as ApiYesNo) : null,
    request_allowed:
      !isParent && overrides.requestAllowed ? (values.requestAllowed as ApiYesNo) : null,
    admin_curated:
      !isParent && overrides.adminCurated ? (values.adminCurated as ApiAdminCurated) : null,
    status: mapStatusToApi(values.status),
    display_order: 0,
    notes: null,
  };

  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to update category: ${res.status}`);
  }
}
