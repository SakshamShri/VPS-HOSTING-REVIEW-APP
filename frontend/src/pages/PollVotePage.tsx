import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { ListChecks } from "lucide-react";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import type { PollStatus } from "../types/poll.types";
import { fetchPollForVote, submitVote } from "../api/poll.api";
import { createOwnerInvite } from "../api/userPoll.api";
import { VoteRenderer } from "../components/vote/VoteRenderer";

export function PollVotePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [answer, setAnswer] = useState("");
  const [poll, setPoll] = useState<{
    title: string;
    description: string;
    status: PollStatus;
    startAt: string | null;
    endAt: string | null;
    theme: {
      primaryColor: string;
      accentColor: string;
      backgroundColor: string;
      textColor: string;
    };
    templateType: string;
    rules: any;
  } | null>(null);
  const [votePayload, setVotePayload] = useState<any>({});

  useEffect(() => {
    if (!id) return;

    const ref = searchParams.get("ref");
    if (ref === "owner") {
      let cancelled = false;
      (async () => {
        try {
          setLoading(true);
          setError(null);
          const { token } = await createOwnerInvite(id);
          if (cancelled) return;
          navigate(`/invites/${token}`, { replace: true });
        } catch (err) {
          console.error(err);
          if (!cancelled) {
            const message = (err as Error).message || "Failed to open poll invite.";
            if (message.startsWith("AUTH_REQUIRED:")) {
              setError(message.replace("AUTH_REQUIRED:", ""));
              navigate("/login", { replace: true });
            } else {
              setError(message);
            }
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchPollForVote(id);
        if (!isMounted) return;
        setPoll({
          title: data.title,
          description: data.description,
          status: data.status,
          startAt: data.startAt,
          endAt: data.endAt,
          theme: data.pollConfig.theme,
          templateType: data.pollConfig.templateType,
          rules: data.pollConfig.rules,
        });
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to load poll.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id, navigate, searchParams]);

  const handleSubmit = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const knownTemplates = ["YES_NO", "STANDARD_LIST", "RATING"] as const;
      const useTemplatePayload =
        !!poll && knownTemplates.includes(poll.templateType as (typeof knownTemplates)[number]);
      const response = useTemplatePayload ? votePayload : { text: answer };
      const invite = searchParams.get("invite") ?? undefined;
      await submitVote(id, response, invite);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to submit vote.");
    } finally {
      setSaving(false);
    }
  };

  let voteState: "not-started" | "live" | "ended" = "live";
  if (poll) {
    const now = new Date();
    const start = poll.startAt ? new Date(poll.startAt) : null;
    const end = poll.endAt ? new Date(poll.endAt) : null;

    if (poll.status !== "PUBLISHED") {
      voteState = poll.status === "DRAFT" ? "not-started" : "ended";
    } else if (start && now < start) {
      voteState = "not-started";
    } else if (end && now >= end) {
      voteState = "ended";
    } else {
      voteState = "live";
    }
  }

  const disabled = saving || loading || success || !poll || voteState !== "live";

  const defaultTheme = {
    primaryColor: "#059669",
    accentColor: "#ECFDF5",
    backgroundColor: "#020617",
    textColor: "#E5E7EB",
  };

  const activeTheme = poll?.theme ?? defaultTheme;
  const themeVars: any = {
    "--primary": activeTheme.primaryColor,
    "--accent": activeTheme.accentColor,
    "--bg": activeTheme.backgroundColor,
    "--text": activeTheme.textColor,
  };

  const knownTemplates = ["YES_NO", "STANDARD_LIST", "RATING"] as const;
  const isTemplateSupported =
    !!poll && knownTemplates.includes(poll.templateType as (typeof knownTemplates)[number]);

  const statusPillClasses =
    voteState === "live"
      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
      : voteState === "not-started"
      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
      : "bg-[var(--text)]/10 text-[var(--text)]";

  const statusText =
    voteState === "live"
      ? "Live now"
      : voteState === "not-started"
      ? "Not started"
      : "Ended";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-4 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Secure poll
        </p>

        <div
          className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border bg-gradient-to-b from-slate-900/80 to-slate-950 shadow-xl"
          style={{
            ...themeVars,
            borderColor: "var(--accent)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3 text-[11px]"
            style={{
              borderColor: "var(--accent)",
              color: "var(--text)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--primary)",
                }}
              >
                <ListChecks className="h-3 w-3" />
              </span>
              <span className="font-medium">Invite-only poll</span>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusPillClasses}`}
            >
              {statusText}
            </span>
          </div>

          <div className="space-y-4 px-4 pb-5 pt-4 text-slate-50">
            {loading && <p className="text-xs text-muted-foreground">Loading poll…</p>}

            {!loading && poll && (
              <>
                <div className="mb-3 space-y-1">
                  <h1 className="text-sm font-semibold tracking-tight text-foreground">
                    {poll.title}
                  </h1>
                  {poll.description && (
                    <p className="text-[11px] text-muted-foreground">{poll.description}</p>
                  )}

                  {voteState === "not-started" && (
                    <p className="text-[11px] text-muted-foreground">
                      This poll has not started yet.
                    </p>
                  )}
                  {voteState === "live" && (
                    <p className="text-[11px] text-[var(--primary)]">
                      This poll is live. You can vote once.
                    </p>
                  )}
                  {voteState === "ended" && (
                    <p className="text-[11px] text-muted-foreground">
                      This poll has ended and is no longer accepting votes.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                    <span>Anonymous vote</span>
                    <span>•</span>
                    <span>One response per person</span>
                  </div>
                  {success && (
                    <p className="mt-1 text-[11px] font-medium text-[var(--accent)]">
                      Your response has been recorded.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="answer" className="text-[11px] text-slate-100">
                      Your response
                    </Label>
                    {isTemplateSupported && poll ? (
                      <VoteRenderer
                        templateType={poll.templateType}
                        rules={poll.rules}
                        disabled={disabled}
                        value={votePayload}
                        onChange={setVotePayload}
                      />
                    ) : (
                      <Textarea
                        id="answer"
                        rows={3}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        disabled={disabled}
                        placeholder="Share your perspective…"
                        className="border-slate-700 bg-slate-900/60 text-xs text-slate-50 placeholder:text-slate-500"
                      />
                    )}
                  </div>

                  {error && <p className="text-xs text-destructive">{error}</p>}

                  <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
                    <Button
                      className="w-full bg-[var(--primary)] text-xs text-emerald-50 hover:opacity-90 sm:w-auto"
                      size="sm"
                      disabled={disabled}
                      onClick={() => void handleSubmit()}
                    >
                      {saving ? "Submitting…" : success ? "Vote submitted" : "Submit vote"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-slate-200 hover:bg-slate-800 sm:w-auto"
                      onClick={() => navigate(-1)}
                    >
                      Back
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!loading && !poll && !error && (
              <p className="text-xs text-muted-foreground">Poll not found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

