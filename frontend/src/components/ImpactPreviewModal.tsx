import { AlertTriangle } from "lucide-react";

import type { ImpactPreviewData } from "../types/impactPreview.types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";

type ImpactPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ImpactPreviewData;
};

export function ImpactPreviewModal({ open, onOpenChange, data }: ImpactPreviewModalProps) {
  const total = data.impactedChildNames.length;
  const visible = data.impactedChildNames.slice(0, 3);
  const remaining = total - visible.length;

  const handleConfirm = () => {
    // UI-only: mock side-effect
    // eslint-disable-next-line no-console
    console.log(
      "Confirmed parent category change",
      JSON.stringify({ parent: data.parentName, totalChildrenImpacted: total })
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <DialogTitle>Confirm Category Change</DialogTitle>
          </div>
          <DialogDescription>
            Changing this parent category will affect
            {" "}
            <span className="font-medium text-foreground">{total}</span>
            {" "}
            child {total === 1 ? "category" : "categories"}.
          </DialogDescription>
        </DialogHeader>

        {visible.length > 0 && (
          <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Affected child categories
            </p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {visible.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            {remaining > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                + {remaining} more {remaining === 1 ? "category" : "categories"}
              </p>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Review the impact carefully before confirming. This action may cascade
          to all active child categories.
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
