import type { PollConfigStatus, PollTemplateType } from "../types/pollConfig.types";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

export interface SavedBlueprintItem {
  id: string;
  name: string;
  status: PollConfigStatus;
  template: PollTemplateType;
  updatedAt: string;
}

interface SavedBlueprintsProps {
  items: SavedBlueprintItem[];
  loading: boolean;
  activeId?: string;
  onSelect: (id: string) => void;
}

function formatUpdatedAt(value: string): string {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function SavedBlueprints({ items, loading, activeId, onSelect }: SavedBlueprintsProps) {
  return (
    <Card className="border-dashed bg-muted/40">
      <CardContent className="space-y-2 p-3 text-xs">
        {loading && <p className="text-muted-foreground">Loading blueprints…</p>}
        {!loading && items.length === 0 && (
          <p className="text-muted-foreground">No poll configs have been created yet.</p>
        )}
        {!loading &&
          items.map((blueprint) => {
            const isActive = blueprint.id === activeId;
            return (
              <button
                key={blueprint.id}
                type="button"
                onClick={() => onSelect(blueprint.id)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted ${
                  isActive ? "border border-primary bg-primary/5" : ""
                }`}
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">{blueprint.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Updated {formatUpdatedAt(blueprint.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {blueprint.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {blueprint.template}
                  </span>
                </div>
              </button>
            );
          })}
      </CardContent>
    </Card>
  );
}
