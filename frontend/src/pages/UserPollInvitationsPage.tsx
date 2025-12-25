import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MailOpen } from "lucide-react";
import { UserLayout } from "../layout/UserLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  fetchMyPollInvitations,
  type UserPollInvitationSummary,
} from "../api/userPoll.api";

function groupInvites(invites: UserPollInvitationSummary[]) {
  const ongoing: UserPollInvitationSummary[] = [];
  const future: UserPollInvitationSummary[] = [];
  const expired: UserPollInvitationSummary[] = [];

  for (const inv of invites) {
    if (inv.state === "FUTURE") future.push(inv);
    else if (inv.state === "EXPIRED") expired.push(inv);
    else ongoing.push(inv);
  }

  return { ongoing, future, expired };
}

export function UserPollInvitationsPage() {
  const navigate = useNavigate();

  const [invites, setInvites] = useState<UserPollInvitationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchMyPollInvitations();
      setInvites(items);
    } catch (err) {
      console.error(err);
      const msg = (err as Error).message || "Failed to load invitations";
      if (msg.startsWith("AUTH_REQUIRED:")) {
        setError(msg.replace("AUTH_REQUIRED:", ""));
        navigate("/login");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => groupInvites(invites), [invites]);

  const renderList = (items: UserPollInvitationSummary[], emptyLabel: string) => {
    if (items.length === 0) {
      return <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((inv) => {
          const canOpen = inv.state === "ONGOING" && inv.inviteStatus !== "REJECTED";
          const stateLabel =
            inv.state === "ONGOING" ? "Ongoing" : inv.state === "FUTURE" ? "Upcoming" : "Expired";

          const stateClasses =
            inv.state === "ONGOING"
              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/40"
              : inv.state === "FUTURE"
              ? "bg-amber-500/10 text-amber-700 border border-amber-500/40"
              : "bg-slate-500/10 text-slate-700 border border-slate-500/40";

          const inviteStatusText =
            inv.inviteStatus === "PENDING"
              ? "Pending"
              : inv.inviteStatus === "ACCEPTED"
              ? "Accepted"
              : "Rejected";

          return (
            <div
              key={inv.token}
              className="flex flex-col gap-2 rounded-md border bg-background px-3 py-2 text-xs"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{inv.title}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${stateClasses}`}>
                      {stateLabel}
                    </span>
                  </div>
                  {inv.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {inv.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">Invite status: {inviteStatusText}</p>
                </div>
                <div className="mt-1 flex items-center gap-2 sm:mt-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    disabled={!canOpen}
                    onClick={() => {
                      if (!canOpen) return;
                      navigate(`/polls/${inv.pollId}?invite=${encodeURIComponent(inv.token)}`);
                    }}
                  >
                    {canOpen ? "Open poll" : "Unavailable"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Invite-only polls
          </p>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Poll invitations
            </h1>
            <span className="hidden items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium text-indigo-700 sm:inline-flex">
              <MailOpen className="h-3 w-3" />
              Inbox of polls
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            See every poll you have been invited to, grouped by ongoing, upcoming, and expired so you
            dont miss anything.
          </p>
        </div>

        <Card className="overflow-hidden border border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-emerald-500/10 shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Invitations overview
            </CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-4 bg-card/95 p-4 text-xs">
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            {loading && <p className="text-[11px] text-muted-foreground">Loading invitations…</p>}

            {!loading && invites.length === 0 && !error && (
              <p className="text-[11px] text-muted-foreground">
                You have not been invited to any polls yet.
              </p>
            )}

            {!loading && invites.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-foreground">Ongoing invited polls</p>
                  {renderList(grouped.ongoing, "You have no ongoing invited polls.")}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-foreground">Upcoming polls</p>
                  {renderList(grouped.future, "You have no upcoming invited polls.")}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-foreground">Expired polls</p>
                  {renderList(grouped.expired, "You have no expired invited polls.")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
