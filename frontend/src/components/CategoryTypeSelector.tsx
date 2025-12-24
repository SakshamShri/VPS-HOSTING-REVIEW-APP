import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import type { CategoryKind } from "../types/category.form.types";

type CategoryTypeSelectorProps = {
  value: CategoryKind;
  onChange: (value: CategoryKind) => void;
};

export function CategoryTypeSelector({ value, onChange }: CategoryTypeSelectorProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
        Category Type
      </h3>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as CategoryKind)}
        className="space-y-3"
      >
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="parent" id="kind-parent" />
          <Label htmlFor="kind-parent" className="text-sm font-medium">
            Parent Category
          </Label>
        </div>
        <div className="flex items-center space-x-3">
          <RadioGroupItem value="child" id="kind-child" />
          <Label htmlFor="kind-child" className="text-sm font-medium">
            Child Category
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
