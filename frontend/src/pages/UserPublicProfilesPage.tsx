import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import { UserLayout } from "../layout/UserLayout";
import { fetchPublicProfiles, type PublicProfileSummary } from "../api/publicProfile.api";
import { Button } from "../components/ui/button";

export function UserPublicProfilesPage() {
  const [profiles, setProfiles] = useState<PublicProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await fetchPublicProfiles();
        setProfiles(items);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load public profiles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return ( 
    <UserLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Public Profiles
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Discover public profiles like CM, MP, Mayor. Claimed and verified ones are
                explicitly marked.
              </p>
            </div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">
              Manual verification, claim-only access
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Directory
          </p>

          {loading && <p className="text-xs text-muted-foreground">Loading profiles…</p>}

          {error && !loading && <p className="text-xs text-destructive">{error}</p>}

          {!loading && !error && profiles.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No public profiles are available yet. Check back later.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((profile) => {
              const claimedLabel = profile.isClaimed ? "CLAIMED" : "UNCLAIMED";
              const verifiedLabel = profile.isVerified ? "VERIFIED" : "UNVERIFIED";

              return (
                <article
                  key={profile.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 text-xs shadow-sm hover:border-emerald-500/60 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h2 className="text-sm font-semibold text-foreground line-clamp-2">
                        {profile.name}
                      </h2>
                      {profile.categoryName && (
                        <p className="text-[11px] text-muted-foreground">
                          {profile.categoryName}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            profile.isClaimed
                              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/40"
                              : "bg-muted text-muted-foreground border border-muted-foreground/30"
                          }`}
                        >
                          {claimedLabel}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            profile.isVerified
                              ? "bg-blue-500/10 text-blue-700 border border-blue-500/40"
                              : "bg-muted text-muted-foreground border border-muted-foreground/30"
                          }`}
                        >
                          {verifiedLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px]"
                      onClick={() => {
                        window.location.href = `/profiles/${profile.id}`;
                      }}
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
