import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

type OverrideToggleProps = {
  id: string;
  checked: boolean;
  label?: string;
  helper?: string;
  onChange: () => void;
};

export function OverrideToggle({ id, checked, label, helper, onChange }: OverrideToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label ?? "Override"}
        </Label>
        {helper ? <p className="text-[11px] text-muted-foreground/80">{helper}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
