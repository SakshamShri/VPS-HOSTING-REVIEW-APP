import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

type BasicInfoCardProps = {
  name: string;
  description: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
};

export function BasicInfoCard({
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: BasicInfoCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
        Basic Information
      </h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category-name">Category Name (EN)</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter category name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-description">Description</Label>
          <Textarea
            id="category-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Optional description"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
