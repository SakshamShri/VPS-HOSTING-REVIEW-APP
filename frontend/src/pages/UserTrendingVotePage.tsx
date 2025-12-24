import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Users } from "lucide-react";

import { UserLayout } from "../layout/UserLayout";
import { Button } from "../components/ui/button";
import {
  fetchPublicProfileDetail,
  submitPsiVote,
  type PublicProfileDetail,
  type ProfilePsiSummary,
} from "../api/publicProfile.api";

const PSI_PARAMETERS = [
  "Trust & Integrity",
  "Performance / Delivery",
  "Responsiveness",
  "Leadership Ability",
];

export function UserTrendingVotePage() {
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<PublicProfileDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [psiSnapshot, setPsiSnapshot] = useState<ProfilePsiSummary | null>(null);

  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const key of PSI_PARAMETERS) {
      // UI scale: -100..+100 (0 = neutral). We will map this to 0..100 for backend.
      initial[key] = 0;
    }
    return initial;
  });

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicProfileDetail(id);
        setProfile(data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setSubmitted(false);
    setError(null);
    try {
      const toBackendScale = (value: number | undefined): number => {
        const v = typeof value === "number" ? value : 0; // -100..+100
        // Map -100..+100 → 0..100 where 0 → 50 (neutral)
        return Math.round((v + 100) / 2);
      };

      const payload = {
        trustIntegrity: toBackendScale(ratings["Trust & Integrity"]),
        performanceDelivery: toBackendScale(ratings["Performance / Delivery"]),
        responsiveness: toBackendScale(ratings["Responsiveness"]),
        leadershipAbility: toBackendScale(ratings["Leadership Ability"]),
      };

      const result = await submitPsiVote(id, payload);
      setPsiSnapshot(result);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      const message = (err as Error).message || "Failed to submit vote";
      if (message.startsWith("AUTH_REQUIRED:")) {
        setError(message.replace("AUTH_REQUIRED:", ""));
      } else if (message.startsWith("NOT_FOUND:")) {
        setError(message.replace("NOT_FOUND:", ""));
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          {loading && <p className="text-xs text-muted-foreground">Loading profile…</p>}
          {error && !loading && <p className="text-xs text-destructive">{error}</p>}

          {!loading && !error && profile && (
            <div className="space-y-5">
              {/* Header with sentiment snapshot */}
              <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-emerald-500/10">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-emerald-600">
                        <Users className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-base font-semibold tracking-tight text-foreground">
                      {profile.name}
                    </h1>
                    {profile.categoryName && (
                      <p className="text-xs text-muted-foreground">{profile.categoryName}</p>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="text-[10px] uppercase tracking-wide">Public Sentiment Snapshot</p>
                  <p
                    className={`text-xl font-semibold ${
                      (psiSnapshot?.overallScore ?? 0) >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {psiSnapshot && psiSnapshot.overallScore >= 0 ? "+" : ""}
                    {psiSnapshot?.overallScore ?? 0}
                  </p>
                  {psiSnapshot && (
                    <p className="mt-1 text-[10px]">
                      Based on {psiSnapshot.voteCount} vote
                      {psiSnapshot.voteCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </div>

              {/* Parameter breakdown using current PSI snapshot */}
              {psiSnapshot && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-[11px]">
                  <p className="font-semibold text-foreground">Parameter breakdown</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[{
                      key: "trustIntegrity" as const,
                      label: "Trust & Integrity",
                    }, {
                      key: "performanceDelivery" as const,
                      label: "Performance / Delivery",
                    }, {
                      key: "responsiveness" as const,
                      label: "Responsiveness",
                    }, {
                      key: "leadershipAbility" as const,
                      label: "Leadership Ability",
                    }].map((item) => {
                      const raw = psiSnapshot.parameters[item.key] ?? 0; // 0..100
                      const mapped = Math.round((raw - 50) * 2); // -100..+100
                      const sign = mapped > 0 ? "+" : "";
                      return (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded-md border bg-white px-2 py-1"
                        >
                          <span className="mr-2 text-[10px] font-medium text-muted-foreground line-clamp-2">
                            {item.label}
                          </span>
                          <span
                            className={
                              "ml-2 text-[11px] font-semibold " +
                              (mapped > 20
                                ? "text-emerald-600"
                                : mapped < -20
                                ? "text-red-600"
                                : "text-amber-600")
                            }
                          >
                            {sign}
                            {mapped}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live index line */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Live Index</span>
                  <span>Experimental</span>
                </div>
                <div className="h-10 w-full rounded-xl bg-gradient-to-r from-red-100 via-slate-100 to-emerald-100 px-4 py-2">
                  <div className="relative h-1.5 w-full rounded-full bg-slate-300/80">
                    <div
                      className="absolute inset-y-0 rounded-full bg-emerald-500"
                      style={{
                        left: "0%",
                        width: `${Math.min(
                          100,
                          Math.max(0, (psiSnapshot?.overallScore ?? 0) + 100) / 2,
                        )}%`,
                      }}
                    />
                    <div
                      className="absolute -top-1 h-3 w-3 rounded-full bg-slate-800"
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(0, (psiSnapshot?.overallScore ?? 0) + 100) / 2,
                        )}%`,
                        transform: "translateX(-50%)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* PSI sliders */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Rate on parameters
                </p>
                <div className="space-y-4">
                  {PSI_PARAMETERS.map((param) => {
                    const value = ratings[param] ?? 0; // -100..+100
                    const isNegative = value < -20;
                    const isPositive = value > 20;

                    return (
                      <div key={param} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-foreground">{param}</span>
                          <span className="text-muted-foreground">
                            {value > 0 ? "+" : ""}
                            {value}
                          </span>
                        </div>
                        <div className="relative h-6 w-full rounded-full bg-slate-100 px-3">
                          <div className="absolute inset-y-2 left-3 right-3 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" />
                          <div
                            className="absolute inset-y-1 w-full"
                            style={{}}
                          >
                            <input
                              type="range"
                              min={-100}
                              max={100}
                              value={value}
                              onChange={(e) => handleChange(param, Number(e.target.value))}
                              className="h-6 w-full cursor-pointer appearance-none bg-transparent"
                            />
                          </div>
                        </div>
                        <p
                          className={`text-[10px] ${
                            isPositive
                              ? "text-emerald-600"
                              : isNegative
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {isPositive
                            ? "Strong positive rating"
                            : isNegative
                            ? "Needs improvement"
                            : "Neutral / mixed"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="border-t pt-4">
                {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
                {submitted && !error && psiSnapshot && (
                  <p className="mb-2 text-xs text-emerald-600">
                    Your PSI vote has been recorded. Updated score: {psiSnapshot.overallScore >= 0 ? "+" : ""}
                    {psiSnapshot.overallScore} based on {psiSnapshot.voteCount} vote
                    {psiSnapshot.voteCount === 1 ? "" : "s"}.
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full bg-blue-600 text-[13px] font-semibold hover:bg-blue-700"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? "Submitting…" : "Submit Vote"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  );
}
