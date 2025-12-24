import type { CategoryNode } from "../../types/category";
import { CategoryRow } from "./CategoryRow";

type CategoryTableProps = {
  data: CategoryNode[];
  onChange?: () => void;
};

export function CategoryTable({ data, onChange }: CategoryTableProps) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 text-left">Category Name</th>
            <th className="px-4 py-3 text-left">Category Type</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((node) => (
            <CategoryRow key={node.id} node={node} onChange={onChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
