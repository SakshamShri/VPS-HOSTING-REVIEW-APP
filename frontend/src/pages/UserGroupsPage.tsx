import { useEffect, useState } from "react";

import { Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { UserLayout } from "../layout/UserLayout";
import {
  createInviteGroup,
  fetchInviteGroups,
  updateInviteGroup,
  uploadInviteGroupPhoto,
  type InviteGroupDTO,
  type InviteGroupMemberDTO,
} from "../api/userPoll.api";

export function UserGroupsPage() {
  const [groups, setGroups] = useState<InviteGroupDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"create" | "groups">("create");

  const [name, setName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberBioInput, setMemberBioInput] = useState("");
  const [members, setMembers] = useState<InviteGroupMemberDTO[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupPhotoUploading, setGroupPhotoUploading] = useState(false);

  useEffect(() => {
    void loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInviteGroups();
      setGroups(data);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a group name");
      return;
    }
    if (members.length === 0) {
      setError("Please add at least one member");
      return;
    }

    // Ensure all members are valid 10-digit numbers before submitting
    const normalizedMembers: InviteGroupMemberDTO[] = [];
    for (const m of members) {
      const digits = m.mobile.replace(/\D/g, "");
      if (digits.length !== 10) {
        setError("All members must be 10-digit mobile numbers.");
        return;
      }
      normalizedMembers.push({
        mobile: digits,
        name: m.name?.trim() || null,
        bio: m.bio?.trim() || null,
      });
    }

    const rawTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      setCreating(true);
      setError(null);

      let updated: InviteGroupDTO;
      if (editingGroupId) {
        updated = await updateInviteGroup(editingGroupId, trimmedName, normalizedMembers, rawTags);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        updated = await createInviteGroup(trimmedName, normalizedMembers, rawTags);
        setGroups((prev) => [updated, ...prev]);
      }

      if (groupPhotoFile) {
        try {
          setGroupPhotoUploading(true);
          const photoUrl = await uploadInviteGroupPhoto(updated.id, groupPhotoFile);
          setGroups((prev) =>
            prev.map((g) => (g.id === updated.id ? { ...g, photo_url: photoUrl } : g))
          );
          setGroupPhotoPreview(photoUrl);
        } catch (err) {
          console.error(err);
          const msg = (err as Error).message || "Failed to upload group photo";
          setError((prev) => prev ?? msg);
        } finally {
          setGroupPhotoUploading(false);
          setGroupPhotoFile(null);
        }
      }

      setName("");
      setMemberInput("");
      setMemberNameInput("");
      setMemberBioInput("");
      setMembers([]);
      setTagsInput("");
      setEditingGroupId(null);
      setGroupPhotoPreview(null);
      setGroupPhotoFile(null);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to save group");
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (group: InviteGroupDTO) => {
    setActiveSection("create");
    setEditingGroupId(group.id);
    setName(group.name);
    setMembers(
      (group.members ?? []).map((m) => ({
        mobile: m.mobile,
        name: m.name,
        bio: m.bio,
      }))
    );
    setMemberInput("");
    setMemberNameInput("");
    setMemberBioInput("");
    setTagsInput((group.tags ?? []).join(", "));
    setGroupPhotoPreview(group.photo_url ?? null);
    setGroupPhotoFile(null);
    setError(null);
  };

  const resetForm = () => {
    setEditingGroupId(null);
    setName("");
    setMemberInput("");
    setMemberNameInput("");
    setMemberBioInput("");
    setMembers([]);
    setSelectedMembers([]);
    setDescription("");
    setTagsInput("");
    setGroupPhotoPreview(null);
    setGroupPhotoFile(null);
    setError(null);
  };

  const handleAddMember = () => {
    const raw = memberInput.trim();
    if (!raw) {
      setError("Enter a mobile number before adding");
      return;
    }

    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Mobile numbers must be exactly 10 digits.");
      return;
    }

    if (members.some((m) => m.mobile === digits)) {
      setError("This mobile number is already in the group.");
      return;
    }

    setMembers((prev) => [
      ...prev,
      {
        mobile: digits,
        name: memberNameInput.trim() || null,
        bio: memberBioInput.trim() || null,
      },
    ]);
    setMemberInput("");
    setMemberNameInput("");
    setMemberBioInput("");
    setError(null);
  };

  const handleRemoveMember = (mobile: string) => {
    setMembers((prev) => prev.filter((m) => m.mobile !== mobile));
    setSelectedMembers((prev) => prev.filter((m) => m !== mobile));
  };

  const toggleMemberSelection = (mobile: string) => {
    setSelectedMembers((prev) =>
      prev.includes(mobile) ? prev.filter((m) => m !== mobile) : [...prev, mobile]
    );
  };

  const handleToggleSelectAll = () => {
    if (members.length === 0) return;
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.mobile));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedMembers.length === 0) return;
    setMembers((prev) => prev.filter((m) => !selectedMembers.includes(m.mobile)));
    setSelectedMembers([]);
  };

  return (
    <UserLayout>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex flex-col gap-1 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Invite management
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">My Invitee Groups</h1>
          <p className="text-[12px] text-muted-foreground">
            Organize your participants into reusable groups that you can target when creating polls.
          </p>
        </div>

        {/* Segmented controls */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-violet-500/10 p-1 text-[11px] shadow-sm">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeSection === "create"
                  ? "bg-indigo-500 text-white shadow"
                  : "text-indigo-700/80 hover:bg-indigo-500/10"
              }`}
              onClick={() => setActiveSection("create")}
            >
              Create / Edit group
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeSection === "groups"
                  ? "bg-sky-500 text-white shadow"
                  : "text-sky-700/80 hover:bg-sky-500/10"
              }`}
              onClick={() => setActiveSection("groups")}
            >
              Existing groups
            </button>
          </div>

          {activeSection === "groups" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void loadGroups()}
              disabled={loading}
              className="h-7 px-2 text-[11px]"
            >
              Refresh groups
            </Button>
          )}
        </div>

        {/* Section: Create / Edit Group */}
        {activeSection === "create" && (
          <Card className="mb-8 border border-indigo-100/70 bg-gradient-to-br from-indigo-500/5 via-background to-sky-500/5 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                  {editingGroupId ? "Edit Group" : "Create New Group"}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Define a reusable invitee group. You will be able to choose these groups while
                  publishing an invite-only poll.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={resetForm}
                  disabled={creating && !editingGroupId}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-3 text-[11px]"
                  disabled={creating}
                  onClick={() => void handleSubmit()}
                >
                  {creating ? "Saving…" : "Save Group"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-4 text-xs">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
                {/* Group details */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Group details
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-300 bg-background text-[10px] text-slate-400">
                        {groupPhotoPreview ? (
                          <img
                            src={groupPhotoPreview}
                            alt="Group avatar"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span>{groupPhotoUploading ? "..." : "Photo"}</span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 h-0 w-0 opacity-0"
                          onChange={(e) => {
                            const file = e.target.files ? e.target.files[0] : null;
                            if (!file) return;
                            setGroupPhotoFile(file);
                            const url = URL.createObjectURL(file);
                            setGroupPhotoPreview(url);
                          }}
                        />
                      </label>
                      <div className="space-y-0.5 text-[11px] text-muted-foreground">
                        <p className="font-medium text-foreground">Group photo (optional)</p>
                        <p>Helps you quickly recognise groups when picking them while creating polls.</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="group-name" className="text-xs font-medium">
                        Group title
                      </label>
                      <Input
                        id="group-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter group name"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium" htmlFor="group-tag">
                        Tags (optional)
                      </label>
                      <Input
                        id="group-tag"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="e.g. class-10A, maths, exam-1"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="group-description" className="text-xs font-medium">
                        Description (optional)
                      </label>
                      <Textarea
                        id="group-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="What is this group for?"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                    <p className="font-semibold text-foreground">Poll integration preview</p>
                    <p className="mt-1">
                      When creating an invite-only poll, this group will appear under
                      <span className="font-semibold"> "Choose from My Groups"</span>.
                    </p>
                  </div>
                </div>

                {/* Add participants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Add participants
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Add mobile numbers for the people you want in this group.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-indigo-600 hover:underline"
                      disabled
                    >
                      Bulk upload CSV (coming soon)
                    </button>
                  </div>

                  <div className="space-y-2 rounded-lg border bg-background p-3">
                    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2 text-xs md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto]">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium" htmlFor="group-member-mobile">
                          Mobile number
                        </label>
                        <Input
                          id="group-member-mobile"
                          value={memberInput}
                          onChange={(e) => setMemberInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddMember();
                            }
                          }}
                          placeholder="e.g. 9876543210"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium" htmlFor="group-member-name">
                          Member name
                        </label>
                        <Input
                          id="group-member-name"
                          value={memberNameInput}
                          onChange={(e) => setMemberNameInput(e.target.value)}
                          placeholder="Optional name"
                          className="text-sm"
                        />
                      </div>
                      <div className="hidden space-y-1 md:block">
                        <label className="text-[11px] font-medium" htmlFor="group-member-bio">
                          Member bio
                        </label>
                        <Input
                          id="group-member-bio"
                          value={memberBioInput}
                          onChange={(e) => setMemberBioInput(e.target.value)}
                          placeholder="Short note (optional)"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          &nbsp;
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-[2px] h-9 text-[11px]"
                          onClick={handleAddMember}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Members must be 10-digit mobile numbers. We'll ignore spaces and dashes.
                    </p>
                  </div>

                  {members.length > 0 && (
                    <div className="overflow-hidden rounded-lg border bg-background text-[11px]">
                      <div className="flex items-center justify-between border-b px-3 py-2 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={members.length > 0 && selectedMembers.length === members.length}
                            onChange={handleToggleSelectAll}
                          />
                          <span>Select All</span>
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[11px] text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={handleRemoveSelected}
                          disabled={selectedMembers.length === 0}
                        >
                          Remove Selected
                        </button>
                      </div>
                      <div className="divide-y">
                        {members.map((m) => (
                          <div
                            key={m.mobile}
                            className="flex items-center justify-between px-3 py-1.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={selectedMembers.includes(m.mobile)}
                                onChange={() => toggleMemberSelection(m.mobile)}
                              />
                              <span>{m.name ? `${m.name} (${m.mobile})` : m.mobile}</span>
                            </div>
                            <button
                              type="button"
                              className="text-[11px] text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(m.mobile)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-end border-t px-3 py-1.5 text-[11px] text-muted-foreground">
                        Total: {members.length} participant{members.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p className="pt-1 text-[11px] font-medium text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>
        )}
 
        {/* Section: Existing groups */}
        {activeSection === "groups" && (
          <div className="mb-8 px-1">
            {loading ? (
              <p className="text-[11px] text-muted-foreground">Loading groups…</p>
            ) : groups.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                You don't have any groups yet. Switch to "Create / Edit group" to create your first
                group.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => startEditing(group)}
                    className="flex flex-col justify-between rounded-xl border bg-card px-4 py-3 text-left text-xs shadow-sm ring-indigo-500/0 transition-all hover:border-indigo-500 hover:bg-indigo-500/5 hover:ring-2 hover:ring-indigo-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-sm">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                          Group
                        </p>
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {group.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {group.members.length} member{group.members.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    {group.tags && group.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-700"
                          >
                            #{tag}
                          </span>
                        ))}
                        {group.tags.length > 3 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            +{group.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {group.members.length > 0 && (
                      <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                        {group.members
                          .slice(0, 3)
                          .map((m) => m.name || m.mobile)
                          .join(", ")}
                        {group.members.length > 3
                          ? `, +${group.members.length - 3} more`
                          : ""}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
