import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  createProfileAdmin,
  fetchProfilesAdmin,
  type AdminProfileSummary,
  updateProfileStatusAdmin,
} from "../api/profileSystem.api";
import { fetchCategoryTree } from "../api/category.api";
import type { CategoryNode } from "../types/category";
import type { ProfileStatus } from "../types/profileSystem.types";

// ----- Helpers -----

type FlatCategory = {
  id: string;
  name: string;
  type: "parent" | "child";
  path: string;
};

function flattenCategories(tree: CategoryNode[]): FlatCategory[] {
  const result: FlatCategory[] = [];

  function walk(node: CategoryNode, ancestors: string[]) {
    const pathParts = [...ancestors, node.name];
    const path = pathParts.join(" > ");
    result.push({ id: node.id, name: node.name, type: node.type, path });
    for (const child of node.children ?? []) {
      walk(child, pathParts);
    }
  }

  for (const root of tree) {
    walk(root, []);
  }

  return result;
}

function CategoryTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: CategoryNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const renderNodes = (items: CategoryNode[], depth: number) => {
    return items.map((node) => {
      const isSelected = node.id === selectedId;
      return (
        <div key={node.id} className="space-y-1">
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={
              "flex w-full items-center justify-between rounded-md px-2 py-1 text-xs " +
              (isSelected
                ? "bg-primary/10 text-primary-foreground border border-primary/60"
                : "hover:bg-muted text-foreground")
            }
          >
            <span className="flex-1 truncate" style={{ paddingLeft: depth * 12 }}>
              {node.name}
            </span>
            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              {node.type === "parent" ? "POLL PARENT" : "SUB"}
            </span>
          </button>
          {(node.children?.length ?? 0) > 0 && (
            <div className="ml-2 border-l border-dashed border-muted-foreground/40 pl-2">
              {renderNodes(node.children ?? [], depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!nodes.length) {
    return (
      <p className="text-[11px] text-muted-foreground">
        No profile categories yet. Create a top-level directory on the right.
      </p>
    );
  }

  return <div className="space-y-1">{renderNodes(nodes, 0)}</div>;
}

// ----- Page -----

export function ProfileAdminPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<AdminProfileSummary[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [newProfileName, setNewProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategory = useMemo(
    () => flatCategories.find((c) => c.id === selectedCategoryId) ?? null,
    [flatCategories, selectedCategoryId]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTree(true);
        setError(null);
        const tree = await fetchCategoryTree();
        setCategories(tree);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load profile categories");
      } finally {
        setLoadingTree(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setProfiles([]);
      return;
    }
    const loadProfiles = async () => {
      try {
        setLoadingProfiles(true);
        setError(null);
        const items = await fetchProfilesAdmin(selectedCategoryId);
        setProfiles(items);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load profiles");
      } finally {
        setLoadingProfiles(false);
      }
    };
    void loadProfiles();
  }, [selectedCategoryId]);

  const handleRefreshTree = async () => {
    try {
      setLoadingTree(true);
      const tree = await fetchCategoryTree();
      setCategories(tree);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to refresh profile categories");
    } finally {
      setLoadingTree(false);
    }
  };

  const handleCreateProfile = async () => {
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      setError("Profile name is required");
      return;
    }
    if (!selectedCategory || selectedCategory.type !== "child") {
      setError("Select a sub (child) category on the left before creating a profile");
      return;
    }

    try {
      setSavingProfile(true);
      setError(null);
      await createProfileAdmin({ name: trimmed, categoryId: selectedCategory.id, status: "ACTIVE" });
      setNewProfileName("");
      const items = await fetchProfilesAdmin(selectedCategory.id);
      setProfiles(items);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to create profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStatusChange = async (id: string, status: ProfileStatus) => {
    try {
      setLoadingProfiles(true);
      setError(null);
      await updateProfileStatusAdmin(id, status);
      if (selectedCategory) {
        const items = await fetchProfilesAdmin(selectedCategory.id);
        setProfiles(items);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to update profile status");
    } finally {
      setLoadingProfiles(false);
    }
  };

  const canCreateProfileHere = selectedCategory?.type === "child";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Profile Directory</h2>
        <p className="text-xs text-muted-foreground">
          Use the Poll Category Master to create parent and sub categories. Then attach public profiles
          to a sub (child) category here.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)]">
        <Card className="border-none bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Profile Categories
              </CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => void handleRefreshTree()}
                disabled={loadingTree}
              >
                {loadingTree ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {loadingTree ? (
              <p className="text-[11px] text-muted-foreground">Loading categories...</p>
            ) : (
              <ScrollArea className="max-h-80 pr-2">
                <CategoryTree
                  nodes={categories}
                  selectedId={selectedCategoryId}
                  onSelect={(id) => setSelectedCategoryId(id)}
                />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-card/95 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Profiles
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-2">
              <label htmlFor="new-profile-name" className="text-xs font-medium">
                New profile name
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-profile-name"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Chief Minister of Rajasthan"
                  className="text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleCreateProfile()}
                  disabled={savingProfile || !canCreateProfileHere}
                >
                  {savingProfile ? "Creating..." : "Create"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Profiles can only be created under a sub (child) category. Select one in the tree on the
                left.
              </p>
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <div className="pt-1">
              {loadingProfiles ? (
                <p className="text-[11px] text-muted-foreground">Loading profiles...</p>
              ) : profiles.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  {canCreateProfileHere
                    ? "No profiles found in this category yet. Create one above."
                    : "Select a sub (child) category in the tree to view its profiles."}
                </p>
              ) : (
                <ScrollArea className="max-h-[420px] pr-2">
                  <div className="space-y-2">
                    {profiles.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.categoryName}  b7 {p.status === "ACTIVE" ? "Active" : "Disabled"}
                            {p.isClaimed ? "  b7 Claimed" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={p.status === "ACTIVE" ? "outline" : "ghost"}
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() =>
                              void handleStatusChange(
                                p.id,
                                p.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
                              )
                            }
                          >
                            {p.status === "ACTIVE" ? "Disable" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
