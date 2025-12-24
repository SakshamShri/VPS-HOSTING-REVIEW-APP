import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ConfigSidebar } from "../components/ConfigSidebar";
import { UITemplateGrid } from "../components/UITemplateGrid";
import { ThemeSelector } from "../components/ThemeSelector";
import { LivePollPreview } from "../components/LivePollPreview";
import { SavedBlueprints } from "../components/SavedBlueprints";
import type { PollConfig, PollConfigSection } from "../types/pollConfig.types";
import { defaultPollConfig } from "../mocks/pollConfig.mock";
import {
  clonePollConfig,
  createPollConfig,
  fetchPollConfig,
  fetchPollConfigs,
  publishPollConfig,
  updatePollConfig,
} from "../api/pollConfig.api";
import type { PollConfigEditorMeta } from "../api/pollConfig.api";
import { fetchActiveChildCategories } from "../api/category.api";
import type { CategoryNode } from "../types/category";

function renderPlaceholderSection(section: PollConfigSection) {
  const labels: Record<PollConfigSection, string> = {
    "basic-info": "Basic Info",
    "content-rules": "Content Rules",
    "voting-behavior": "Voting Behavior",
    "results-psi": "Results & PSI",
    "permissions": "Permissions",
    "ui-template": "UI Template",
  };

  if (section === "ui-template") return null;

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-tight">
          {labels[section]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          This configuration block will be wired in a later step. For now, the UI
          Template section is fully interactive and connected to the live
          preview.
        </p>
      </CardContent>
    </Card>
  );
}

export function PollConfigMasterPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const editingId = params.id;

  const [activeSection, setActiveSection] = useState<PollConfigSection>("ui-template");
  const [config, setConfig] = useState<PollConfig>(defaultPollConfig);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState<boolean>(!!editingId);
  const [error, setError] = useState<string | null>(null);

  const [meta, setMeta] = useState<PollConfigEditorMeta>({
    id: undefined,
    categoryId: "",
    rules: {},
    permissions: {},
    version: 1,
  });

  const [blueprints, setBlueprints] = useState<Awaited<ReturnType<typeof fetchPollConfigs>>>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const handleUpdate = <K extends keyof PollConfig>(key: K, value: PollConfig[K]) => {
    setConfig((prev) => {
      if (prev.status === "ACTIVE") return prev;
      return { ...prev, [key]: value };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (meta.id) {
        const updated = await updatePollConfig(meta.id, config, meta);
        setConfig(updated.config);
        setMeta(updated.meta);
      } else {
        const created = await createPollConfig(config, meta);
        setConfig(created.config);
        setMeta(created.meta);
        navigate(`/admin/poll-configs/${created.meta.id}`);
      }
      const items = await fetchPollConfigs();
      setBlueprints(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadBlueprint = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPollConfig(id);
      setConfig(data.config);
      setMeta(data.meta);
      if (!editingId) {
        navigate(`/admin/poll-configs/${data.meta.id}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Failed to load configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!meta.id) return;
    setPublishing(true);
    setError(null);
    try {
      const published = await publishPollConfig(meta.id);
      setConfig(published.config);
      setMeta(published.meta);
      const items = await fetchPollConfigs();
      setBlueprints(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Failed to publish configuration.");
    } finally {
      setPublishing(false);
    }
  };

  const handleClone = async () => {
    if (!meta.id) return;
    setSaving(true);
    setError(null);
    try {
      const cloned = await clonePollConfig(meta.id);
      setConfig(cloned.config);
      setMeta(cloned.meta);
      navigate(`/admin/poll-configs/${cloned.meta.id}`);
      const items = await fetchPollConfigs();
      setBlueprints(items);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Failed to clone configuration.");
    } finally {
      setSaving(false);
    }
  };

  // Initial load: edit mode fetches config; list of blueprints always loaded.
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setBlueprintsLoading(true);
        const items = await fetchPollConfigs();
        if (isMounted) setBlueprints(items);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        if (isMounted) setBlueprintsLoading(false);
      }
    })();

    // Load ACTIVE child categories for selection
    (async () => {
      try {
        setCategoriesLoading(true);
        const categories = await fetchActiveChildCategories();
        if (!isMounted) return;
        setCategoryOptions(categories);

        // If no category selected yet but options exist, default to first
        if (!meta.categoryId && categories.length > 0) {
          setMeta((prev) => ({ ...prev, categoryId: categories[0].id }));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!editingId) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        // Clear any previous error before attempting to load this config
        setError(null);
        setLoading(true);
        const data = await fetchPollConfig(editingId);
        if (!isMounted) return;
        setConfig(data.config);
        setMeta(data.meta);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        if (isMounted) setError("Failed to load configuration.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [editingId]);

  return (
    <div
      className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,0.7fr)_minmax(0,2.1fr)_minmax(0,0.8fr)]"
    >
      {/* Left: config navigation */}
      <div className="space-y-4">
        <ConfigSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>

      {/* Center: configuration content */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold tracking-tight">
                UI Template configuration
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Define the poll DNA that controls how this configuration behaves
                in the product experience.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-medium uppercase">
                {config.status}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!meta.id || publishing}
                onClick={handlePublish}
              >
                {publishing ? "Publishing..." : "Publish"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!meta.id || saving || publishing}
                onClick={handleClone}
              >
                {saving ? "Cloning..." : "Clone"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving || publishing}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save blueprint"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <Label htmlFor="poll-config-category">Category</Label>
              <Select
                value={meta.categoryId || undefined}
                onValueChange={(value) => setMeta((prev) => ({ ...prev, categoryId: value }))}
                disabled={categoriesLoading || categoryOptions.length === 0}
              >
                <SelectTrigger id="poll-config-category">
                  <SelectValue
                    placeholder={
                      categoriesLoading
                        ? "Loading categories..."
                        : categoryOptions.length === 0
                          ? "No ACTIVE child categories available"
                          : "Select a category"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only ACTIVE child categories are shown. Each poll configuration
                must belong to one of these categories.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2 sm:flex-1">
                <Label htmlFor="config-name">Blueprint name</Label>
                <Input
                  id="config-name"
                  value={config.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdate("name", event.target.value)
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground sm:w-40">
                <p className="font-medium uppercase tracking-wide">Type ID</p>
                <p className="font-mono text-[11px] text-foreground">{config.typeId}</p>
              </div>
            </div>

            <Separator />

            {activeSection === "basic-info" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Basic info
                </p>
                <div className="space-y-2">
                  <Label htmlFor="preview-title">Preview question title</Label>
                  <Input
                    id="preview-title"
                    value={config.title}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      handleUpdate("title", event.target.value)
                    }
                    className="h-8 text-sm"
                    placeholder="e.g. How do you feel about the new policy?"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This only affects the live preview and suggested text when creating polls. The
                    actual poll title can still be customized per instance.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preview-description">Helper text / description</Label>
                  <Textarea
                    id="preview-description"
                    rows={3}
                    value={config.description ?? ""}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      handleUpdate("description", event.target.value)
                    }
                    className="text-sm"
                    placeholder="Short context that appears under the question in the preview."
                  />
                </div>
              </div>
            )}

            {activeSection === "content-rules" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Content rules
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Control how many options are shown and whether the standard list behaves like
                  single- or multi-select. Rating templates also use these bounds.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="min-options">Minimum options</Label>
                    <Input
                      id="min-options"
                      type="number"
                      min={1}
                      max={10}
                      value={meta.rules?.contentRules?.minOptions ?? 2}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = Number(event.target.value) || 0;
                        const min = Math.max(1, Math.min(raw, 10));
                        const currentMax = meta.rules?.contentRules?.maxOptions ?? min;
                        const max = Math.max(min, currentMax);
                        setMeta((prev) => ({
                          ...prev,
                          rules: {
                            ...(prev.rules ?? {}),
                            contentRules: {
                              ...(prev.rules?.contentRules ?? {}),
                              minOptions: min,
                              maxOptions: max,
                            },
                          },
                        }));
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-options">Maximum options</Label>
                    <Input
                      id="max-options"
                      type="number"
                      min={1}
                      max={10}
                      value={meta.rules?.contentRules?.maxOptions ?? meta.rules?.contentRules?.minOptions ?? 4}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = Number(event.target.value) || 0;
                        const min = meta.rules?.contentRules?.minOptions ?? 2;
                        const max = Math.max(min, Math.min(raw, 10));
                        setMeta((prev) => ({
                          ...prev,
                          rules: {
                            ...(prev.rules ?? {}),
                            contentRules: {
                              ...(prev.rules?.contentRules ?? {}),
                              minOptions: min,
                              maxOptions: max,
                            },
                          },
                        }));
                      }}
                      className="h-8 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      For standard lists, a max value greater than 1 allows multiple selections.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "voting-behavior" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Voting behavior
                </p>
                <div className="space-y-2">
                  <Label htmlFor="max-votes">Max votes per user</Label>
                  <Input
                    id="max-votes"
                    type="number"
                    min={1}
                    max={5}
                    value={meta.rules?.votingBehavior?.maxVotesPerUser ?? 1}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = Number(event.target.value) || 1;
                      const value = Math.max(1, Math.min(raw, 5));
                      setMeta((prev) => ({
                        ...prev,
                        rules: {
                          ...(prev.rules ?? {}),
                          votingBehavior: {
                            ...(prev.rules?.votingBehavior ?? {}),
                            maxVotesPerUser: value,
                          },
                        },
                      }));
                    }}
                    className="h-8 w-32 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Enforcement depends on the voting pipeline, but this value is surfaced in the
                    experience and preview.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="allow-change"
                    type="checkbox"
                    className="h-3 w-3 rounded border-border"
                    checked={meta.rules?.votingBehavior?.allowChange === true}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const checked = event.target.checked;
                      setMeta((prev) => ({
                        ...prev,
                        rules: {
                          ...(prev.rules ?? {}),
                          votingBehavior: {
                            ...(prev.rules?.votingBehavior ?? {}),
                            allowChange: checked,
                          },
                        },
                      }));
                    }}
                  />
                  <Label htmlFor="allow-change" className="text-xs font-normal">
                    Allow participants to change their response while the poll is live
                  </Label>
                </div>
              </div>
            )}

            {activeSection === "permissions" && (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Permissions
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Control who can discover and answer this poll. These settings are respected in the
                  user feed and invite flows.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <select
                    id="visibility"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none"
                    value={(meta.permissions?.visibility as string) || "PUBLIC"}
                    onChange={(event) => {
                      const value = event.target.value;
                      setMeta((prev) => ({
                        ...prev,
                        permissions: {
                          ...(prev.permissions ?? {}),
                          visibility: value,
                        },
                      }));
                    }}
                  >
                    <option value="PUBLIC">Public (can appear in open feeds)</option>
                    <option value="LOGIN_ONLY">Logged-in users only</option>
                    <option value="PRIVATE">Private (only via direct link/invite)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="invite-only"
                    type="checkbox"
                    className="h-3 w-3 rounded border-border"
                    checked={meta.permissions?.inviteOnly === true}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const checked = event.target.checked;
                      setMeta((prev) => ({
                        ...prev,
                        permissions: {
                          ...(prev.permissions ?? {}),
                          inviteOnly: checked,
                        },
                      }));
                    }}
                  />
                  <Label htmlFor="invite-only" className="text-xs font-normal">
                    Require an invite token (invite-only poll)
                  </Label>
                </div>
              </div>
            )}

            {activeSection === "results-psi" && renderPlaceholderSection(activeSection)}

            {activeSection === "ui-template" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    UI template
                  </p>
                  <UITemplateGrid
                    selected={config.template}
                    onChange={(template) => handleUpdate("template", template)}
                  />
                </div>

                <Separator />

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Theme & accents
                    </p>
                    <ThemeSelector
                      themeTone={config.themeTone}
                      accentStyle={config.accentStyle}
                      onThemeToneChange={(tone) => handleUpdate("themeTone", tone)}
                      onAccentStyleChange={(accent) => handleUpdate("accentStyle", accent)}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Saved blueprints
                    </p>
                    <SavedBlueprints
                      items={blueprints}
                      loading={blueprintsLoading}
                      activeId={meta.id}
                      onSelect={handleLoadBlueprint}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Right: live preview */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <LivePollPreview config={config} rules={meta.rules} permissions={meta.permissions} />
      </div>
    </div>
  );
}
