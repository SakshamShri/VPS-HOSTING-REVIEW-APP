import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import type { CategoryNode, CategoryStatus } from "../../types/category";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { deleteCategory } from "../../api/category.api";

type CategoryRowProps = {
  node: CategoryNode;
  level?: number;
  onChange?: () => void;
};

function StatusBadge({ status }: { status: CategoryStatus }) {
  const isActive = status === "active";
  return (
    <Badge
      className={cn(
        "capitalize",
        isActive
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      )}
    >
      {isActive ? "Active" : "Disabled"}
    </Badge>
  );
}

export function CategoryRow({ node, level = 0, onChange }: CategoryRowProps) {
  const navigate = useNavigate();
  const isParent = node.type === "parent";
  const hasChildren = !!node.children?.length;
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleRowClick = () => {
    navigate(`/admin/categories/${node.id}/edit`);
  };

  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const name = node.name;
    const confirmed = window.confirm(
      `Delete category "${name}"? This cannot be undone and is only allowed if the category has no children or linked polls.`
    );
    if (!confirmed) return;

    try {
      await deleteCategory(String(node.id));
      onChange?.();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert((err as Error).message || "Failed to delete category.");
    }
  };

  const indentClass =
    level === 0 ? "" : level === 1 ? "pl-6" : level === 2 ? "pl-10" : "pl-12";

  return (
    <>
      <tr
        className="group hover:bg-muted/40 cursor-pointer"
        onClick={handleRowClick}
      >
        <td className="px-4 py-3 align-middle">
          <div className={cn("flex items-center gap-2", indentClass)}>
            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpanded((prev) => !prev);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                aria-label={expanded ? "Collapse child categories" : "Expand child categories"}
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    expanded && "rotate-90"
                  )}
                />
              </button>
            ) : (
              <span className="h-5 w-5" aria-hidden="true" />
            )}
            <span
              className={cn(
                "truncate text-sm",
                isParent
                  ? "font-semibold text-foreground"
                  : "font-normal text-foreground"
              )}
            >
              {node.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 align-middle text-xs text-muted-foreground">
          {isParent ? "Parent" : "Child"}
        </td>
        <td className="px-4 py-3 align-middle">
          <StatusBadge status={node.status} />
        </td>
        <td className="px-4 py-3 align-middle text-right">
          <div className="inline-flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label={`Edit ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/admin/categories/${node.id}/edit`);
              }}
            >
              ✎
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label={`Delete ${node.name}`}
              onClick={handleDelete}
            >
              🗑
            </Button>
          </div>
        </td>
      </tr>
      {expanded &&
        node.children?.map((child) => (
          <CategoryRow key={child.id} node={child} level={level + 1} />
        ))}
    </>
  );
}
