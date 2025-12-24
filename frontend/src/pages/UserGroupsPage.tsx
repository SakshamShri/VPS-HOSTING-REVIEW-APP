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
  type InviteGroupDTO,
} from "../api/userPoll.api";

export function UserGroupsPage() {
  const [groups, setGroups] = useState<InviteGroupDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

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
    const normalizedMembers: string[] = [];
    for (const m of members) {
      const digits = m.replace(/\D/g, "");
      if (digits.length !== 10) {
        setError("All members must be 10-digit mobile numbers.");
        return;
      }
      normalizedMembers.push(digits);
    }

    try {
      setCreating(true);
      setError(null);

      let updated: InviteGroupDTO;
      if (editingGroupId) {
        updated = await updateInviteGroup(editingGroupId, trimmedName, normalizedMembers);
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        updated = await createInviteGroup(trimmedName, normalizedMembers);
        setGroups((prev) => [updated, ...prev]);
      }

      setName("");
      setMemberInput("");
      setMembers([]);
      setEditingGroupId(null);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to save group");
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (group: InviteGroupDTO) => {
    setEditingGroupId(group.id);
    setName(group.name);
    const normalized = group.members
      .map((m) => m.replace(/\D/g, ""))
      .filter((v) => v.length === 10);
    setMembers(normalized);
    setMemberInput("");
    setError(null);
  };

  const resetForm = () => {
    setEditingGroupId(null);
    setName("");
    setMemberInput("");
    setMembers([]);
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

    if (members.includes(digits)) {
      setError("This mobile number is already in the group.");
      return;
    }

    setMembers((prev) => [...prev, digits]);
    setMemberInput("");
    setError(null);
  };

  const handleRemoveMember = (mobile: string) => {
    setMembers((prev) => prev.filter((m) => m !== mobile));
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
          <Card className="border-none bg-card/95 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
                  <Users className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                    Groups
                  </CardTitle>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    View and manage the groups you can reuse across invite-only polls.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void loadGroups()}
                disabled={loading}
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-[11px] text-muted-foreground">Loading groups…</p>
              ) : groups.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  You don't have any groups yet. Create one on the right to get started.
                </p>
              ) : (
                <ScrollArea className="max-h-[520px] pr-2">
                  <div className="grid gap-3 md:grid-cols-2">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => startEditing(group)}
                        className="flex flex-col justify-between rounded-xl border bg-card px-4 py-3 text-left text-xs shadow-sm transition-colors hover:border-indigo-500 hover:bg-indigo-500/5"
                      >
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2">
                            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                              Group
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {group.members.length} member{group.members.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{group.name}</p>
                        </div>
                        {group.members.length > 0 && (
                          <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                            {group.members.slice(0, 3).join(", ")}
                            {group.members.length > 3
                              ? `, +${group.members.length - 3} more`
                              : ""}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="border-none bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                  {editingGroupId ? "Edit group" : "Create new group"}
                </CardTitle>
                {editingGroupId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={resetForm}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Define a reusable audience. You can select these groups on the final step when
                publishing an invite-only poll. Click a group on the left to edit its details.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1">
                <label htmlFor="group-name" className="text-xs font-medium">
                  Group name
                </label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Team (North)"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="group-member" className="text-xs font-medium">
                  Add member (10-digit mobile)
                </label>
                <div className="flex gap-2">
                  <Input
                    id="group-member"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMember}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Members must be 10-digit mobile numbers. We'll ignore spaces and dashes.
                </p>
              </div>

              {members.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Current members</p>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
                      >
                        {m}
                        <button
                          type="button"
                          className="ml-0.5 text-[11px] text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(m)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-[11px] text-destructive">{error}</p>}

              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={creating}
                  onClick={() => void handleSubmit()}
                >
                  {creating
                    ? editingGroupId
                      ? "Saving…"
                      : "Creating…"
                    : editingGroupId
                    ? "Save changes"
                    : "+ Create group"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
