import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

import { ListChecks } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { validateInvite, acceptInvite, rejectInvite, type InvitePollSummary } from "../api/invite.api";

interface CountdownState {
  label: string;
}

function computeCountdown(startAt: string | null): CountdownState | null {
  if (!startAt) return null;
  const start = new Date(startAt).getTime();
  const now = Date.now();
  const diff = start - now;
  if (diff <= 0) return { label: "Starts soon" };

  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return { label: parts.join(" ") };
}

export function InviteLandingPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poll, setPoll] = useState<InvitePollSummary | null>(null);
  const [actionState, setActionState] = useState<"idle" | "accepting" | "rejecting" | "done">(
    "idle"
  );

  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    if (poll && poll.status === "SCHEDULED") {
      const update = () => {
        setCountdown(computeCountdown(poll.start_at));
      };
      update();
      timer = window.setInterval(update, 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [poll]);

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const summary = await validateInvite(token);
        setPoll(summary);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load invite");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token]);

  const isScheduled = poll?.status === "SCHEDULED";

  const handleAccept = async () => {
    if (!token) return;
    try {
      setActionState("accepting");
      setError(null);
      await acceptInvite(token);
      setActionState("done");
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Failed to accept invite";
      if (message.startsWith("AUTH_REQUIRED:")) {
        setError(message.replace("AUTH_REQUIRED:", ""));
      } else {
        setError(message);
      }
      setActionState("idle");
    }
  };

  const handleReject = async () => {
    if (!token) return;
    try {
      setActionState("rejecting");
      setError(null);
      await rejectInvite(token);
      setActionState("done");
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Failed to reject invite";
      if (message.startsWith("AUTH_REQUIRED:")) {
        setError(message.replace("AUTH_REQUIRED:", ""));
      } else {
        setError(message);
      }
      setActionState("idle");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-emerald-950 px-4 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
          Poll invitation
        </p>

        <Card className="w-full overflow-hidden rounded-2xl border border-indigo-500/40 bg-slate-950/90 shadow-xl">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <ListChecks className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-semibold tracking-tight text-slate-50">
                    Youre invited to a poll
                  </CardTitle>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Review the poll details and choose whether to participate.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 bg-slate-950/60 p-4 text-xs">
            {loading && <p className="text-muted-foreground">Loading invitation…</p>}

            {!loading && error && (
              <p className="text-destructive">{error}</p>
            )}

            {!loading && !error && poll && (
              <>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400">Youre invited to answer:</p>
                  <p className="text-sm font-semibold text-slate-50">{poll.title}</p>
                  {poll.description && (
                    <p className="text-[11px] text-slate-400">{poll.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2 text-[11px]">
                  <span className="text-slate-400">Status</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-300">
                    {poll.status === "LIVE" ? "Live" : poll.status === "SCHEDULED" ? "Scheduled" : poll.status}
                  </span>
                </div>

                {isScheduled && countdown && (
                  <div className="rounded-lg bg-card px-3 py-2 text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground">Starts in</p>
                    <p className="mt-1 text-sm font-mono">{countdown.label}</p>
                  </div>
                )}

                {actionState === "done" ? (
                  <p className="text-[11px] text-emerald-700">
                    Your response to this invitation has been recorded. You can close this tab.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-indigo-500 text-[11px] font-medium text-white hover:bg-indigo-400"
                      disabled={actionState === "accepting"}
                      onClick={() => void handleAccept()}
                    >
                      {actionState === "accepting" ? "Accepting…" : "Accept invite"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-slate-700 bg-slate-900/60 text-[11px] text-slate-200 hover:bg-slate-800"
                      disabled={actionState === "rejecting"}
                      onClick={() => void handleReject()}
                    >
                      {actionState === "rejecting" ? "Rejecting…" : "Reject invite"}
                    </Button>
                  </div>
                )}

                {error && !loading && (
                  <p className="text-[11px] text-red-400">{error}</p>
                )}

                <p className="pt-2 text-[10px] text-slate-400">
                  You may be asked to log in before accepting or rejecting, to keep invites tied to
                  your account.
                </p>
                <p className="text-[10px] text-slate-400">
                  Need to log in? {""}
                  <Link to="/login" className="font-medium text-indigo-300 underline underline-offset-2">
                    Go to login
                  </Link>
                  .
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
