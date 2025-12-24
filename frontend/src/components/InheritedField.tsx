import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { Label } from "./ui/label";

type InheritedFieldProps = {
  label: string;
  helper?: string;
  valueLabel: string;
};

export function InheritedField({ label, helper, valueLabel }: InheritedFieldProps) {
  return (
    <div className="rounded-md border border-dashed border-muted bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Inherited
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/30 text-[10px] text-muted-foreground"
                  aria-label="Inherited from parent category"
                >
                  <Info className="h-2.5 w-2.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Inherited from parent category</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{valueLabel}</span>
      </div>
      {helper ? <p className="mt-1 text-[11px] text-muted-foreground/80">{helper}</p> : null}
    </div>
  );
}
