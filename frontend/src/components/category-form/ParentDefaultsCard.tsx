import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import type { CategoryStatus } from "../../types/category";

type ParentDefaultsCardProps = {
  allowPollCreation: boolean;
  status: CategoryStatus;
  onAllowPollCreationChange: (v: boolean) => void;
  onStatusChange: (v: CategoryStatus) => void;
};

export function ParentDefaultsCard({
  allowPollCreation,
  status,
  onAllowPollCreationChange,
  onStatusChange,
}: ParentDefaultsCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
        Parent Defaults
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="allow-poll-creation" className="text-sm font-medium">
              Allow Poll Creation
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, polls can be created under this category.
            </p>
          </div>
          <Switch
            id="allow-poll-creation"
            checked={allowPollCreation}
            onCheckedChange={onAllowPollCreationChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onStatusChange("active")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                status === "active"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-muted text-muted-foreground border border-transparent"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("disabled")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                status === "disabled"
                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                  : "bg-muted text-muted-foreground border border-transparent"
              }`}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
