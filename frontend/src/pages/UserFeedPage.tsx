import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";

import { UserLayout } from "../layout/UserLayout";
import { fetchUserFeed, type FeedPollItem } from "../api/feed.api";

export function UserFeedPage() {
  const [polls, setPolls] = useState<FeedPollItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await fetchUserFeed();
        setPolls(items);
        // Debug-only: confirm data flow during development
        // eslint-disable-next-line no-console
        console.log("User feed polls", items);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load feed");
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
                Feed
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                A quick snapshot of polls you care about. Live status and history will appear
                here as we roll out more features.
              </p>
            </div>
            <div className="hidden text-[11px] text-muted-foreground sm:block">
              Personalized feed Coming soon
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Live polls
          </p>

          {loading && (
            <p className="text-xs text-muted-foreground">Loading your feed…</p>
          )}

          {error && !loading && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {!loading && !error && polls.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No live public polls are available right now. Check back later.
            </p>
          )}

          <div className="space-y-3">
            {polls.map((poll) => (
              <article
                key={poll.id}
                className="rounded-xl border bg-card p-4 text-xs shadow-sm hover:border-emerald-500/60 hover:shadow-md cursor-pointer"
                onClick={() => {
                  window.location.href = `/polls/${poll.id}`;
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                      <ListChecks className="h-4 w-4" />
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Live
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{poll.categoryName}</span>
                </div>

                <p className="mt-2 text-sm font-semibold text-foreground">{poll.title}</p>
                {poll.description && (
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {poll.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
