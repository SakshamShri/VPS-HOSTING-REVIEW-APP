import { useEffect, useState } from "react";

import { BarChart3 } from "lucide-react";
import { UserLayout } from "../layout/UserLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  fetchMyPolls,
  endUserPoll,
  extendUserPoll,
  fetchMyPollDetail,
  type MyPollSummary,
  type MyPollDetail,
  type UserPollInviteSummary,
} from "../api/userPoll.api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function UserMyPollsPage() {
  const [polls, setPolls] = useState<MyPollSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [expandedPollDetail, setExpandedPollDetail] = useState<MyPollDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [extendingPollId, setExtendingPollId] = useState<string | null>(null);
  const [extendEndAtLocal, setExtendEndAtLocal] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchMyPolls();
      setPolls(items);
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message || "Failed to load polls";
      if (msg.startsWith("AUTH_REQUIRED:")) {
        setError(msg.replace("AUTH_REQUIRED:", ""));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async (id: string) => {
    if (!window.confirm("End this poll now? It will stop accepting new responses.")) return;
    try {
      setActionLoadingId(id);
      const updated = await endUserPoll(id);
      setPolls((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message || "Failed to end poll";
      setError(msg.startsWith("AUTH_REQUIRED:") ? msg.replace("AUTH_REQUIRED:", "") : msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleDetail = async (id: string) => {
    if (expandedPollId === id) {
      setExpandedPollId(null);
      setExpandedPollDetail(null);
      return;
    }

    try {
      setDetailLoading(true);
      setExpandedPollId(id);
      setExpandedPollDetail(null);
      const detail = await fetchMyPollDetail(id);
      setExpandedPollDetail(detail);
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message || "Failed to load poll details";
      setError(msg.startsWith("AUTH_REQUIRED:") ? msg.replace("AUTH_REQUIRED:", "") : msg);
      setExpandedPollId(null);
      setExpandedPollDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExtend = async (id: string) => {
    const current = polls.find((p) => p.id === id) ?? null;
    const baseIso = current?.end_at ?? new Date().toISOString();
    const d = new Date(baseIso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;

    setExtendingPollId(id);
    setExtendEndAtLocal(local);
  };

  const handleConfirmExtend = async () => {
    if (!extendingPollId || !extendEndAtLocal) return;

    const parsed = new Date(extendEndAtLocal);
    if (Number.isNaN(parsed.getTime())) {
      setError("Please choose a valid date and time.");
      return;
    }

    const id = extendingPollId;

    try {
      setActionLoadingId(id);
      setError(null);
      const updated = await extendUserPoll(id, parsed.toISOString());
      setPolls((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setExtendingPollId(null);
      setExtendEndAtLocal("");
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message || "Failed to extend poll";
      setError(msg.startsWith("AUTH_REQUIRED:") ? msg.replace("AUTH_REQUIRED:", "") : msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
            My campaigns
          </p>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">My Polls</h1>
            <span className="hidden items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-700 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live insights
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage the polls you have created, end or extend them, and quickly scan participation
            trends. Participant identities are never shown here.
          </p>
        </div>

        <Card className="overflow-hidden border border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-emerald-500/10 shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <BarChart3 className="h-4 w-4" />
              </span>
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Poll overview
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] border-indigo-500/60 bg-background/70 text-indigo-700 hover:bg-background"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 bg-card/95 p-4 text-xs">
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            {loading && <p className="text-[11px] text-muted-foreground">Loading polls…</p>}

            {!loading && polls.length === 0 && !error && (
              <p className="text-[11px] text-muted-foreground">
                You have not created any polls yet. Use the Poll Management entry in the sidebar to
                create your first poll.
              </p>
            )}

            {!loading && polls.length > 0 && (
              <div className="space-y-2">
                {polls.map((poll) => {
                  const total = poll.total_invites || 0;
                  const accepted = poll.accepted_count || 0;
                  const pending = poll.pending_count || 0;
                  const rejected = poll.rejected_count || 0;
                  const live = poll.status === "LIVE";
                  const scheduled = poll.status === "SCHEDULED";
                  const closed = poll.status === "CLOSED";

                  const acceptedPct = total ? Math.round((accepted / total) * 100) : 0;
                  const pendingPct = total ? Math.round((pending / total) * 100) : 0;
                  const rejectedPct = total ? 100 - acceptedPct - pendingPct : 0;

                  const badgeText = live
                    ? "Live"
                    : scheduled
                    ? "Scheduled"
                    : closed
                    ? "Closed"
                    : "Draft";

                  const isExpanded = expandedPollId === poll.id;

                  return (
                    <div
                      key={poll.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100 px-3 py-2 text-xs shadow-sm"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground line-clamp-1">
                              {poll.title}
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                live
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/40"
                                  : scheduled
                                  ? "bg-amber-500/10 text-amber-700 border border-amber-500/40"
                                  : closed
                                  ? "bg-slate-500/10 text-slate-700 border border-slate-500/40"
                                  : "bg-muted text-muted-foreground border border-muted-foreground/40"
                              }`}
                            >
                              {badgeText}
                            </span>
                          </div>
                          {poll.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {poll.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                            <span>Type: {poll.type.replace(/_/g, " ")}</span>
                            <span>•</span>
                            <span>Start: {formatDate(poll.start_at)}</span>
                            <span>•</span>
                            <span>End: {formatDate(poll.end_at)}</span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 sm:mt-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={actionLoadingId === poll.id || closed}
                            onClick={() => void handleEnd(poll.id)}
                          >
                            {actionLoadingId === poll.id ? "Working…" : closed ? "Closed" : "End now"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            disabled={actionLoadingId === poll.id || closed}
                            onClick={() => void handleExtend(poll.id)}
                          >
                            Extend
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => void handleToggleDetail(poll.id)}
                          >
                            {expandedPollId === poll.id ? "Hide invites" : "View invites"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Total invites: {total}</span>
                          <span>
                            {accepted} accepted · {pending} pending · {rejected} rejected
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="flex h-full w-full">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${acceptedPct}%` }}
                            />
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${pendingPct}%` }}
                            />
                            <div
                              className="h-full bg-slate-400"
                              style={{ width: `${rejectedPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {extendingPollId === poll.id && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/70 p-2 text-[11px]">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-700">Extend until</p>
                            <input
                              type="datetime-local"
                              value={extendEndAtLocal}
                              onChange={(e) => setExtendEndAtLocal(e.target.value)}
                              className="h-8 rounded-md border px-2 text-[11px] text-slate-800"
                            />
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                setExtendingPollId(null);
                                setExtendEndAtLocal("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => void handleConfirmExtend()}
                              disabled={actionLoadingId === poll.id}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="mt-2 rounded-lg bg-white/60 p-2 text-[11px] text-slate-700">
                          {detailLoading && (
                            <p className="text-[11px] text-muted-foreground">Loading invite details…</p>
                          )}
                          {!detailLoading && expandedPollDetail && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Invitees ({expandedPollDetail.invites.length})
                              </p>
                              {expandedPollDetail.invites.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground">
                                  No invites have been created for this poll yet.
                                </p>
                              ) : (
                                <div className="max-h-40 overflow-auto rounded border bg-slate-50">
                                  <table className="w-full border-collapse text-[10px]">
                                    <thead className="bg-slate-100 text-slate-600">
                                      <tr>
                                        <th className="px-2 py-1 text-left font-medium">Name</th>
                                        <th className="px-2 py-1 text-left font-medium">Mobile</th>
                                        <th className="px-2 py-1 text-left font-medium">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {expandedPollDetail.invites.map((inv: UserPollInviteSummary) => {
                                        const statusLabel =
                                          inv.status === "ACCEPTED"
                                            ? "Accepted"
                                            : inv.status === "PENDING"
                                            ? "Pending"
                                            : "Rejected";
                                        const statusClass =
                                          inv.status === "ACCEPTED"
                                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/60"
                                            : inv.status === "PENDING"
                                            ? "bg-amber-500/10 text-amber-700 border-amber-400/60"
                                            : "bg-slate-500/10 text-slate-700 border-slate-400/60";

                                        return (
                                          <tr key={`${inv.mobile}-${inv.status}`} className="border-t border-slate-100">
                                            <td className="px-2 py-1 align-top">
                                              <div className="flex flex-col">
                                                <span className="font-medium">
                                                  {inv.name || "Unnamed"}
                                                </span>
                                                {inv.bio && (
                                                  <span className="text-[9px] text-slate-500 line-clamp-2">
                                                    {inv.bio}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-2 py-1 align-top text-slate-600">{inv.mobile}</td>
                                            <td className="px-2 py-1 align-top">
                                              <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${statusClass}`}
                                              >
                                                {statusLabel}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <p className="pt-1 text-[9px] text-slate-500">
                                Only invite acceptance is shown here. Individual vote choices stay
                                anonymous.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
