import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Users } from "lucide-react";

import { UserLayout } from "../layout/UserLayout";
import { Button } from "../components/ui/button";
import {
  fetchPsiTrendingProfiles,
  type TrendingProfileWithPsi,
} from "../api/publicProfile.api";

function sentimentLabel(score: number): { label: string; tone: string } {
  if (score >= 20) return { label: "Mostly Positive", tone: "positive" };
  if (score <= -20) return { label: "Negative Trend", tone: "negative" };
  return { label: "Mixed Sentiment", tone: "mixed" };
}

export function UserTrendingPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<TrendingProfileWithPsi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await fetchPsiTrendingProfiles();
        setProfiles(items);
      } catch (err) {
        console.error(err);
        const message = (err as Error).message || "Failed to load trending profiles";
        if (message.startsWith("AUTH_REQUIRED:")) {
          setError(message.replace("AUTH_REQUIRED:", ""));
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-foreground">
                  Top Trending Profiles
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vote on key PSI parameters for leaders and entities that are trending right now.
                </p>
              </div>
            </div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">
              Live public sentiment module (beta)
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {loading && <p className="text-xs text-muted-foreground">Loading trending profiles…</p>}
          {error && !loading && <p className="text-xs text-destructive">{error}</p>}

          {!loading && !error && profiles.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No profiles are trending yet. Once profiles start getting votes, they will appear here.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => {
              const isPositive = profile.psiScore > 0;
              const isNegative = profile.psiScore < 0;
              const sentiment = sentimentLabel(profile.psiScore);

              return (
                <article
                  key={profile.id}
                  className="flex h-full flex-col justify-between rounded-2xl border bg-card p-4 text-xs shadow-sm hover:border-emerald-500/60 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-emerald-500/10">
                        {profile.photoUrl ? (
                          <img
                            src={profile.photoUrl}
                            alt={profile.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-emerald-600">
                            <Users className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-sm font-semibold text-foreground line-clamp-2">
                          {profile.name}
                        </h2>
                        {profile.categoryName && (
                          <p className="text-[11px] text-muted-foreground">
                            {profile.categoryName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-lg font-semibold ${
                            isPositive
                              ? "text-emerald-600"
                              : isNegative
                              ? "text-red-600"
                              : "text-slate-700"
                          }`}
                        >
                          {profile.psiScore >= 0 ? "+" : ""}
                          {profile.psiScore}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          PSI trend · {profile.voteCount} vote
                          {profile.voteCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            sentiment.tone === "positive"
                              ? "bg-emerald-500"
                              : sentiment.tone === "negative"
                              ? "bg-red-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.abs(profile.psiScore) + 10)}%` }}
                        />
                      </div>
                      <p
                        className={`text-[11px] font-medium ${
                          sentiment.tone === "positive"
                            ? "text-emerald-600"
                            : sentiment.tone === "negative"
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}
                      >
                        {sentiment.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-600 text-[11px] font-semibold hover:bg-blue-700"
                      onClick={() => navigate(`/user/trending/${profile.id}/vote`)}
                    >
                      Vote
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-[11px]"
                      onClick={() => navigate(`/profiles/${profile.id}`)}
                    >
                      View profile
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
