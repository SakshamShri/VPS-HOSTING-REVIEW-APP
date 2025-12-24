import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { CategoryNode } from "../../types/category";

type CategoryTypeCardProps = {
  type: "parent" | "child";
  parentCategoryId?: string;
  parentCategories: CategoryNode[];
  onTypeChange: (v: "parent" | "child") => void;
  onParentChange: (id: string) => void;
};

export function CategoryTypeCard({
  type,
  parentCategoryId,
  parentCategories,
  onTypeChange,
  onParentChange,
}: CategoryTypeCardProps) {
  const isChild = type === "child";

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
        Category Type
      </h3>
      <div className="space-y-4">
        <RadioGroup
          value={type}
          onValueChange={(value) => onTypeChange(value as "parent" | "child")}
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="parent" id="parent" />
            <Label htmlFor="parent" className="text-sm font-medium">
              Parent Category
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="child" id="child" />
            <Label htmlFor="child" className="text-sm font-medium">
              Child Category
            </Label>
          </div>
        </RadioGroup>

        {isChild && (
          <div className="space-y-2">
            <Label htmlFor="parent-category">Parent Category</Label>
            <Select value={parentCategoryId} onValueChange={onParentChange}>
              <SelectTrigger id="parent-category">
                <SelectValue placeholder="Select a parent category" />
              </SelectTrigger>
              <SelectContent>
                {parentCategories.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
