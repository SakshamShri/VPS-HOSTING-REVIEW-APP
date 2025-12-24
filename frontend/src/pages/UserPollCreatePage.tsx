import { useEffect, useState } from "react";

import { ListChecks } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  createUserPoll,
  createUserPollInvites,
  fetchInviteGroups,
  type InviteDTO,
  type InviteGroupDTO,
  type UserPollType,
} from "../api/userPoll.api";
import { fetchUserClaimableCategories, type UserCategoryNode } from "../api/userCategory.api";
import { UserLayout } from "../layout/UserLayout";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const POLL_TYPES: { id: UserPollType; label: string; description: string }[] = [
  { id: "SINGLE_CHOICE", label: "Single choice", description: "Participants pick one option." },
  { id: "MULTIPLE_CHOICE", label: "Multiple choice", description: "Participants can pick many options." },
  { id: "RATING", label: "Rating / NPS", description: "Score-based satisfaction or NPS style." },
  { id: "YES_NO", label: "Yes / No", description: "Simple binary decision poll." },
];

export function UserPollCreatePage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [pollType, setPollType] = useState<UserPollType | null>("SINGLE_CHOICE");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceInfo, setSourceInfo] = useState("");

  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);

  const [startMode, setStartMode] = useState<"INSTANT" | "SCHEDULED">("INSTANT");
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  const [inviteGroups, setInviteGroups] = useState<InviteGroupDTO[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMobiles, setNewGroupMobiles] = useState("");
  const [individualMobiles, setIndividualMobiles] = useState("");

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvites, setCreatedInvites] = useState<InviteDTO[] | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const [categories, setCategories] = useState<UserCategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (step === 1) {
      void loadCategories();
    }
    if (step === 6) {
      void loadGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const nodes = await fetchUserClaimableCategories();
      setCategories(nodes);
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Failed to load categories";
      if (message.startsWith("AUTH_REQUIRED:")) {
        setError(message.replace("AUTH_REQUIRED:", ""));
      } else {
        setError(message);
      }
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const groups = await fetchInviteGroups();
      setInviteGroups(groups);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, `Option ${prev.length + 1}`]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const canGoNext = () => {
    if (step === 1) return !!selectedCategoryId;
    if (step === 2) return !!pollType;
    if (step === 3) return title.trim().length > 0;
    if (step === 4) return options.filter((o) => o.trim().length > 0).length >= 2;
    if (step === 5) {
      const now = new Date();
      if (startMode === "SCHEDULED") {
        if (!startAt) return false;
        const start = new Date(startAt);
        if (!(start.getTime() > now.getTime())) return false;
        if (endAt) {
          const end = new Date(endAt);
          if (!(end.getTime() > start.getTime())) return false;
        }
      } else {
        if (endAt) {
          const end = new Date(endAt);
          if (!(end.getTime() > now.getTime())) return false;
        }
      }
      return true;
    }
    return true;
  };

  const handlePublish = async () => {
    if (!pollType || !selectedCategoryId) return;

    setSubmitting(true);
    setError(null);
    setCreatedInvites(null);

    try {
      const poll = await createUserPoll({
        category_id: selectedCategoryId,
        type: pollType,
        title: title.trim(),
        description: description.trim() || null,
        options: options.map((o) => o.trim()).filter(Boolean),
        start_mode: startMode,
        start_at: startMode === "SCHEDULED" && startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        source_info: sourceInfo.trim() || null,
      });

      const mobilesFromNewGroup = newGroupMobiles
        .split(/\r?\n|,/)
        .map((v) => v.trim())
        .filter(Boolean);

      const mobilesFromIndividuals = individualMobiles
        .split(/\r?\n|,/)
        .map((v) => v.trim())
        .filter(Boolean);

      const invites = await createUserPollInvites(poll.id, {
        mobiles: mobilesFromIndividuals,
        existing_group_ids: selectedGroupIds,
        new_group:
          newGroupName.trim() && mobilesFromNewGroup.length > 0
            ? { name: newGroupName.trim(), mobiles: mobilesFromNewGroup }
            : null,
      });

      setCreatedInvites(invites);

			// Build generic owner share link: /polls/:pollId?ref=owner
			const baseUrl = window.location.origin;
			setShareLink(`${baseUrl}/polls/${poll.id}?ref=owner`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to publish poll");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepHeader = () => {
    const steps: { id: WizardStep; label: string }[] = [
      { id: 1, label: "Category" },
      { id: 2, label: "Type" },
      { id: 3, label: "Details" },
      { id: 4, label: "Options" },
      { id: 5, label: "Timing" },
      { id: 6, label: "Publish" },
    ];

    return (
      <div className="mb-4 flex items-center justify-between gap-2 text-xs">
        {steps.map((s) => (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium ${
                s.id === step
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : s.id < step
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                  : "border-muted bg-background text-muted-foreground"
              }`}
            >
              {s.id}
            </div>
            <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </p>
            <p className="text-[11px] text-muted-foreground">
              Choose where this poll should live. You can only select categories that allow claims
              and user requests.
            </p>
          </div>

          {categoriesLoading ? (
            <p className="text-[11px] text-muted-foreground">Loading categories…</p>
          ) : categories.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No claimable categories are available for end-user polls.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((node) => (
                <div key={node.id} className="space-y-1">
                  {node.type === "parent" && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {node.name}
                    </p>
                  )}
                  <div className="space-y-1">
                    {(node.children && node.children.length ? node.children : [node])
                      .filter((c) => c.type === "child")
                      .map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(child.id)}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            selectedCategoryId === child.id
                              ? "border-indigo-500 bg-indigo-500/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="text-sm font-medium text-foreground">{child.name}</span>
                          {selectedCategoryId === child.id && (
                            <span className="text-[10px] font-medium text-indigo-600">Selected</span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Campaign type
            </p>
            <p className="text-[11px] text-muted-foreground">
              Choose how participants will experience this poll. You can change type before you
              publish.
            </p>
          </div>
          {/* Campaign mode row: Open (disabled) vs Invite-only (active) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col justify-between rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide">Open campaign</p>
                <p>Anyone with the link can vote.</p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                Coming soon – only invite-only polls are available right now.
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-xl border border-indigo-500 bg-indigo-500/5 px-4 py-3 text-xs">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                  Invite-only campaign
                </p>
                <p className="text-foreground">Only invited participants can vote in this poll.</p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-indigo-600">
                Enabled for this version.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Choose poll experience
            </p>
            <p className="text-[11px] text-muted-foreground">
              Select the format that best suits your question.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {POLL_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPollType(t.id)}
                  type="button"
                  className={`flex flex-col items-start rounded-xl border px-3 py-3 text-left text-xs transition-colors ${
                    pollType === t.id
                      ? "border-foreground bg-foreground/5 shadow-sm"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">{t.label}</span>
                  <span className="mt-1 text-[11px] text-muted-foreground">{t.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Poll details
            </p>
            <p className="text-[11px] text-muted-foreground">
              Enter a title and description for your poll.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border bg-card p-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Poll title"
              className="text-sm"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Poll description (optional)"
              className="text-sm"
            />
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Configure the choices participants will see. You need at least two options.
          </p>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={o}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  className="text-sm"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRemoveOption(i)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
            Add option
          </Button>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Timing
            </p>
            <p className="text-[11px] text-muted-foreground">
              Choose when this poll should start. Instant polls go live immediately; scheduled polls
              will start in the future.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border bg-card p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Start mode
            </p>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-left ${
                  startMode === "INSTANT"
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-muted hover:bg-muted"
                }`}
                onClick={() => setStartMode("INSTANT")}
              >
                <p className="text-[11px] font-semibold text-foreground">Instant start</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Poll goes live as soon as you publish.
                </p>
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg border px-3 py-2 text-left ${
                  startMode === "SCHEDULED"
                    ? "border-indigo-500 bg-indigo-500/5"
                    : "border-muted hover:bg-muted"
                }`}
                onClick={() => setStartMode("SCHEDULED")}
              >
                <p className="text-[11px] font-semibold text-foreground">Scheduled start</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Choose a future time to open voting.
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-3">
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="start-at">
                Start time {startMode === "SCHEDULED" && <span className="text-red-500">*</span>}
              </label>
              <Input
                id="start-at"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                disabled={startMode === "INSTANT"}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                For scheduled polls, the start time must be in the future.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="end-at">
                End time (optional)
              </label>
              <Input
                id="end-at"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                If set, the poll will stop accepting votes after this time.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="space-y-5 text-xs">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Targeting
            </p>
            <p className="text-[11px] text-muted-foreground">
              This poll is invite-only. Choose which groups or individuals should receive a unique
              invite link.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-3">
            <p className="font-medium">Existing groups</p>
            {loadingGroups ? (
              <p className="text-[11px] text-muted-foreground">Loading groups…</p>
            ) : inviteGroups.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                You don't have any groups yet. You can still invite people individually below.
              </p>
            ) : (
              <div className="space-y-1">
                {inviteGroups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={() => handleToggleGroup(g.id)}
                    />
                    <span className="text-xs font-medium">{g.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {g.members.length} members
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-3">
            <p className="font-medium">Create new group</p>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="text-sm"
            />
            <Textarea
              value={newGroupMobiles}
              onChange={(e) => setNewGroupMobiles(e.target.value)}
              rows={3}
              placeholder="Enter mobile numbers, separated by commas or new lines"
              className="text-sm"
            />
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-3">
            <p className="font-medium">Individuals</p>
            <Textarea
              value={individualMobiles}
              onChange={(e) => setIndividualMobiles(e.target.value)}
              rows={3}
              placeholder="Invite a few people by entering numbers here"
              className="text-sm"
            />
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-muted-foreground">
              When you publish, the poll will be saved along with options and invites. Status will
              be set based on timing: Instant → LIVE, Scheduled → SCHEDULED.
            </p>

            {shareLink && (
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <p className="text-xs font-semibold">Share poll link</p>
                <p className="text-[11px] text-muted-foreground">
                  Share this poll link anywhere. People will be asked to log in and accept the
                  invitation.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={shareLink} className="text-[11px] font-mono" />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(shareLink).catch(() => {
                        // ignore clipboard errors
                      });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            {createdInvites && createdInvites.length > 0 && (
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <p className="text-xs font-semibold">WhatsApp links</p>
                <p className="text-[11px] text-muted-foreground">
                  Copy and send these links to participants. Each link is unique per mobile number.
                </p>
                <div className="max-h-48 space-y-1 overflow-auto rounded border bg-background p-2 text-[11px] font-mono">
                  {createdInvites.map((i) => (
                    <div key={i.token} className="truncate">
                      {i.mobile}: {i.whatsapp_link}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <UserLayout>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex flex-col gap-1 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Poll management
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Create a new invite-only poll
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Set up your poll category, question, timing, and audience.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 p-[1px] shadow-sm">
          <Card className="rounded-2xl border-none bg-card/95">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                      Invite-only poll
                    </CardTitle>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-500">
                      Step {step} of 6
                    </p>
                  </div>
                </div>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  Invite-only polls require participants to accept a unique invite.
                </p>
              </div>
              {renderStepHeader()}
            </CardHeader>

            <CardContent className="space-y-4">
              {renderStep()}
              {error && <p className="text-[11px] text-destructive">{error}</p>}

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={step === 1}
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
                >
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  {step === 6 ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting}
                      onClick={handlePublish}
                    >
                      {submitting ? "Publishing…" : "Publish poll"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canGoNext()}
                      onClick={() => setStep((s) => (s < 6 ? ((s + 1) as WizardStep) : s))}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}