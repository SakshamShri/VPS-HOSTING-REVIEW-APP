import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  createProfileAdmin,
  fetchProfilesAdmin,
  type AdminProfileSummary,
  updateProfileStatusAdmin,
  updateProfileAboutAdmin,
  uploadProfilePhotoAdmin,
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
  profilesByCategory,
}: {
  nodes: CategoryNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  profilesByCategory: Record<string, AdminProfileSummary[]>;
}) {
  const renderNodes = (items: CategoryNode[], depth: number) => {
    return items.map((node) => {
      const isSelected = node.id === selectedId;
      const profilesForNode = profilesByCategory[node.id] ?? [];
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
            <span className="flex items-center gap-2 flex-1 truncate" style={{ paddingLeft: depth * 12 }}>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-muted text-[10px]">
                {node.children && node.children.length > 0 ? "\uD83D\uDCC1" : "\uD83D\uDCC2"}
              </span>
              <span className="truncate">{node.name}</span>
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
          {profilesForNode.length > 0 && (
            <div className="ml-8 space-y-1">
              {profilesForNode.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-muted"
                >
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-slate-200">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        <span>{profile.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <span className="truncate">{profile.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const handleSaveAbout = async () => {
    if (!selectedProfileId) return;
    try {
      setSavingAbout(true);
      await updateProfileAboutAdmin(selectedProfileId, aboutDraft.trim() || null);
      if (selectedCategory) {
        const items = await fetchProfilesAdmin(selectedCategory.id);
        setProfiles(items);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to update profile bio");
    } finally {
      setSavingAbout(false);
    }
  };

  const handleUploadExistingPhoto = async (file: File | null) => {
    if (!selectedProfileId || !file) return;
    try {
      setSavingPhoto(true);
      await uploadProfilePhotoAdmin(selectedProfileId, file);
      if (selectedCategory) {
        const items = await fetchProfilesAdmin(selectedCategory.id);
        setProfiles(items);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to update profile photo");
    } finally {
      setSavingPhoto(false);
    }
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
  const location = useLocation();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<AdminProfileSummary[]>([]);
  const [profilesByCategory, setProfilesByCategory] = useState<
    Record<string, AdminProfileSummary[]>
  >({});
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [newProfileName, setNewProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newProfilePhotoFile, setNewProfilePhotoFile] = useState<File | null>(null);

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [aboutDraft, setAboutDraft] = useState<string>("");
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategory = useMemo(
    () => flatCategories.find((c) => c.id === selectedCategoryId) ?? null,
    [flatCategories, selectedCategoryId]
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryId = params.get("categoryId");
    const profileId = params.get("profileId");
    if (categoryId) {
      setSelectedCategoryId(categoryId);
    }
    if (profileId) {
      setSelectedProfileId(profileId);
    }
  }, [location.search]);

  async function refreshAllProfilesForTree() {
    try {
      const all = await fetchProfilesAdmin();
      const grouped: Record<string, AdminProfileSummary[]> = {};
      for (const p of all) {
        if (!grouped[p.categoryId]) {
          grouped[p.categoryId] = [];
        }
        grouped[p.categoryId].push(p);
      }
      setProfilesByCategory(grouped);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingTree(true);
        setError(null);
        const tree = await fetchCategoryTree();
        setCategories(tree);
        await refreshAllProfilesForTree();
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
      await refreshAllProfilesForTree();
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
      const created = await createProfileAdmin({
        name: trimmed,
        categoryId: selectedCategory.id,
        status: "ACTIVE",
      });

      if (newProfilePhotoFile) {
        try {
          await uploadProfilePhotoAdmin(created.id, newProfilePhotoFile);
        } catch (photoErr) {
          console.error(photoErr);
          // Do not block profile creation if photo upload fails
        }
      }

      setNewProfileName("");
      setNewProfilePhotoFile(null);
      const items = await fetchProfilesAdmin(selectedCategory.id);
      setProfiles(items);
      setSelectedProfileId(created.id);
      setAboutDraft("");
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
                  profilesByCategory={profilesByCategory}
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="new-profile-name"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Chief Minister of Rajasthan"
                  className="text-sm"
                />
                <div className="flex flex-col gap-2 sm:w-1/2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="text-xs file:text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setNewProfilePhotoFile(file);
                    }}
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
              </div>
              <p className="text-[11px] text-muted-foreground">
                Profiles can only be created under a sub (child) category. Select one in the tree on the
                left. Optionally upload a display photo; you can also add or change it later.
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
                        className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs cursor-pointer ${
                          selectedProfileId === p.id
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-background hover:bg-muted"
                        }`}
                        onClick={() => {
                          setSelectedProfileId(p.id);
                          setAboutDraft("");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-100">
                            {p.photoUrl ? (
                              <img
                                src={p.photoUrl}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                <span>{p.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {p.categoryName}  b7 {p.status === "ACTIVE" ? "Active" : "Disabled"}
                              {p.isClaimed ? "  b7 Claimed" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={p.status === "ACTIVE" ? "outline" : "ghost"}
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleStatusChange(
                                p.id,
                                p.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
                              );
                            }}
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

            {selectedProfile && (
              <div className="mt-4 space-y-2 rounded-md border bg-background px-3 py-3">
                <p className="text-xs font-semibold text-foreground">
                  Edit profile details
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Update the public bio and display photo for this profile. Name changes can be
                  handled via a separate data correction flow if required.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                    {selectedProfile.photoUrl ? (
                      <img
                        src={selectedProfile.photoUrl}
                        alt={selectedProfile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                        <span>{selectedProfile.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-foreground">{selectedProfile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedProfile.categoryName}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-[11px] font-medium">Bio / About</label>
                  <textarea
                    className="min-h-[72px] w-full rounded-md border bg-background p-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                    placeholder="Short description shown on the public profile."
                    value={aboutDraft}
                    onChange={(e) => setAboutDraft(e.target.value)}
                  />
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-3 text-[11px]"
                      disabled={savingAbout}
                      onClick={() => void handleSaveAbout()}
                    >
                      {savingAbout ? "Saving…" : "Save Bio"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-medium">Change photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="text-[11px]"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleUploadExistingPhoto(file);
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
