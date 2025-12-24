import type { CategoryNode } from "../types/category";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type ParentCategorySelectProps = {
  value?: string;
  options: CategoryNode[];
  onChange: (id: string) => void;
};

export function ParentCategorySelect({ value, options, onChange }: ParentCategorySelectProps) {
  if (!options.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <Label htmlFor="parent-category">Parent Category</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="parent-category">
          <SelectValue placeholder="Select a parent category" />
        </SelectTrigger>
        <SelectContent>
          {options.map((parent) => (
            <SelectItem key={parent.id} value={parent.id}>
              {parent.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Child categories inherit defaults from the selected parent.
      </p>
    </div>
  );
}
