import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import type { CategoryNode } from "../types/category";
import type { PollFormValues, PollStatus } from "../types/poll.types";
import { fetchActiveChildCategories } from "../api/category.api";
import { fetchPollConfigs } from "../api/pollConfig.api";
import type { PollConfigListItem } from "../api/pollConfig.api";
import { createPoll, fetchPoll, publishPoll, updatePoll } from "../api/poll.api";

interface PollFormPageProps {
  mode: "create" | "edit";
}

const emptyValues: PollFormValues = {
  title: "",
  description: "",
  categoryId: "",
  pollConfigId: "",
  startAt: "",
  endAt: "",
  status: "DRAFT",
};

export function PollFormPage({ mode }: PollFormPageProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const pollId = params.id;

  const [values, setValues] = useState<PollFormValues>(emptyValues);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [configs, setConfigs] = useState<PollConfigListItem[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadOnly = values.status !== "DRAFT";

  const update = <K extends keyof PollFormValues>(key: K, value: PollFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [cats, cfgs] = await Promise.all([
          fetchActiveChildCategories(),
          fetchPollConfigs(),
        ]);
        if (!isMounted) return;
        setCategories(cats);
        setConfigs(cfgs.filter((c) => c.status === "ACTIVE"));
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Failed to load poll metadata.");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !pollId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchPoll(pollId);
        if (!isMounted) return;
        setValues(data.values);
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
  }, [mode, pollId]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const id = await createPoll(values);
        navigate(`/admin/polls/${id}/edit`);
      } else if (mode === "edit" && pollId) {
        await updatePoll(pollId, values);
      }
      navigate("/admin/polls");
    } catch (err) {
      console.error(err);
      setError("Failed to save poll.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pollId) return;
    setPublishing(true);
    setError(null);
    try {
      await publishPoll(pollId);
      const data = await fetchPoll(pollId);
      setValues(data.values);
    } catch (err) {
      console.error(err);
      setError("Failed to publish poll.");
    } finally {
      setPublishing(false);
    }
  };

  const statusLabel = (status: PollStatus) => {
    if (status === "DRAFT") return "Draft";
    if (status === "PUBLISHED") return "Published";
    return "Closed";
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (isReadOnly) return;
        void handleSubmit();
      }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {mode === "create" ? "Create Poll" : "Edit Poll"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure how this poll instance should appear and when it should be active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {statusLabel(values.status)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={mode !== "edit" || values.status !== "DRAFT" || publishing}
            onClick={() => void handlePublish()}
          >
            {publishing ? "Publishing..." : "Publish"}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving || publishing || isReadOnly}
          >
            {saving ? "Saving..." : "Save as Draft"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading poll…</p>
      ) : (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Basic Info</h3>
            <div className="space-y-2">
              <Label htmlFor="poll-title">Poll Title</Label>
              <Input
                id="poll-title"
                value={values.title}
                onChange={(e) => update("title", e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-description">Description</Label>
              <Textarea
                id="poll-description"
                rows={3}
                value={values.description}
                onChange={(e) => update("description", e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Category */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Category</h3>
            <p className="text-xs text-muted-foreground">
              Choose a child category under which this poll will run. Only ACTIVE child categories
              are available.
            </p>
            <div className="space-y-2">
              <Label htmlFor="poll-category">Category</Label>
              <select
                id="poll-category"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                value={values.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">Select category…</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Poll Config */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Poll Config</h3>
            <p className="text-xs text-muted-foreground">
              Select an ACTIVE Poll Config (Poll DNA) that defines behavior and UI. Only active
              configs can be attached.
            </p>
            <div className="space-y-2">
              <Label htmlFor="poll-config">Poll Config</Label>
              <select
                id="poll-config"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                value={values.pollConfigId}
                onChange={(e) => update("pollConfigId", e.target.value)}
                disabled={isReadOnly}
              >
                <option value="">Select Poll Config…</option>
                {configs.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Schedule</h3>
            <p className="text-xs text-muted-foreground">
              Optional start and end times for when this poll should be visible. If omitted, the
              poll can be published immediately.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poll-start">Start time</Label>
                <Input
                  id="poll-start"
                  type="datetime-local"
                  value={values.startAt}
                  onChange={(e) => update("startAt", e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-end">End time</Label>
                <Input
                  id="poll-end"
                  type="datetime-local"
                  value={values.endAt}
                  onChange={(e) => update("endAt", e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/polls")}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={mode !== "edit" || values.status !== "DRAFT" || publishing}
                onClick={() => void handlePublish()}
              >
                {publishing ? "Publishing..." : "Publish"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || publishing || isReadOnly}
              >
                {saving ? "Saving..." : "Save as Draft"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
