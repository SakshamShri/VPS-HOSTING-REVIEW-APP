import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { fetchPolls, closePoll, publishPoll } from "../api/poll.api";
import type { PollListItem } from "../types/poll.types";

export function PollListPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<PollListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchPolls();
        if (isMounted) setItems(data);
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to load polls.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const refresh = async () => {
    try {
      const data = await fetchPolls();
      setItems(data);
    } catch (err) {
      console.error(err);
      setError("Failed to refresh polls.");
    }
  };

  const handlePublish = async (id: string) => {
    setActioningId(id);
    setError(null);
    try {
      await publishPoll(id);
      await refresh();
    } catch (err) {
      console.error(err);
      setError("Failed to publish poll.");
    } finally {
      setActioningId(null);
    }
  };

  const handleClose = async (id: string) => {
    setActioningId(id);
    setError(null);
    try {
      await closePoll(id);
      await refresh();
    } catch (err) {
      console.error(err);
      setError("Failed to close poll.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Poll Instances</h2>
          <p className="text-xs text-muted-foreground">
            Manage individual poll runs created from Poll Config blueprints.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/admin/polls/new")}>
          + New Poll
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <Card className="flex items-center justify-center py-10 text-xs text-muted-foreground">
          Loading polls…
        </Card>
      ) : items.length === 0 ? (
        <Card className="flex items-center justify-center py-10 text-xs text-muted-foreground">
          No polls have been created yet.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((poll) => {
            const isActing = actioningId === poll.id;
            const canPublish = poll.status === "DRAFT";
            const canClose = poll.status === "PUBLISHED";
            const scheduleLabel = poll.startAt
              ? poll.endAt
                ? `${poll.startAt} → ${poll.endAt}`
                : `${poll.startAt} → open`
              : "Unscheduled";

            return (
              <Card
                key={poll.id}
                className="flex h-full flex-col justify-between border bg-card/60 p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-foreground hover:text-primary hover:underline"
                      onClick={() => navigate(`/admin/polls/${poll.id}/edit`)}
                    >
                      {poll.title}
                    </button>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] font-medium uppercase"
                    >
                      {poll.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{poll.categoryPath}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Config: <span className="font-medium">{poll.pollConfigName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Schedule: {scheduleLabel}</p>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canPublish || isActing}
                    onClick={() => handlePublish(poll.id)}
                  >
                    Publish
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canClose || isActing}
                    onClick={() => handleClose(poll.id)}
                  >
                    Close
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
