import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import type { CategoryStatus } from "../../types/category";

type ChildOverridesCardProps = {
  inherited: {
    allowPollCreation?: boolean;
    status?: CategoryStatus;
  };
  overrides: {
    allowPollCreation: boolean;
    status: boolean;
  };
  onOverrideToggle: (field: "allowPollCreation" | "status") => void;
  onAllowPollCreationChange: (v: boolean) => void;
  onStatusChange: (v: CategoryStatus) => void;
};

export function ChildOverridesCard({
  inherited,
  overrides,
  onOverrideToggle,
  onAllowPollCreationChange,
  onStatusChange,
}: ChildOverridesCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
        Child Overrides
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="override-allow-poll-creation" className="text-sm font-medium">
              Allow Poll Creation
            </Label>
            {!overrides.allowPollCreation && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground cursor-help">(inherited)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Inherited from parent category</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Switch
            id="override-allow-poll-creation"
            checked={overrides.allowPollCreation}
            onCheckedChange={() => onOverrideToggle("allowPollCreation")}
          />
        </div>
        {overrides.allowPollCreation && (
          <div className="ml-6 flex items-center justify-between">
            <Label className="text-sm font-medium">Custom value</Label>
            <Switch
              checked={inherited.allowPollCreation ?? false}
              onCheckedChange={onAllowPollCreationChange}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="override-status" className="text-sm font-medium">
              Status
            </Label>
            {!overrides.status && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground cursor-help">(inherited)</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Inherited from parent category</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Switch
            id="override-status"
            checked={overrides.status}
            onCheckedChange={() => onOverrideToggle("status")}
          />
        </div>
        {overrides.status && (
          <div className="ml-6 space-y-2">
            <Label className="text-sm font-medium">Custom status</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onStatusChange("active")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  inherited.status === "active"
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
                  inherited.status === "disabled"
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                Disabled
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
