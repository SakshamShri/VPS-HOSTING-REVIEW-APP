import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import type { CategoryNode, CategoryStatus } from "../../types/category";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

type CategoryRowProps = {
  node: CategoryNode;
  level?: number;
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

export function CategoryRow({ node, level = 0 }: CategoryRowProps) {
  const navigate = useNavigate();
  const isParent = node.type === "parent";
  const hasChildren = !!node.children?.length;
  const [expanded, setExpanded] = useState<boolean>(false);

  const indentClass =
    level === 0 ? "" : level === 1 ? "pl-6" : level === 2 ? "pl-10" : "pl-12";

  return (
    <>
      <tr className="group hover:bg-muted/40">
        <td className="px-4 py-3 align-middle">
          <div className={cn("flex items-center gap-2", indentClass)}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={`Open actions for ${node.name}`}
            onClick={() => navigate(`/admin/categories/${node.id}/edit`)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      {expanded &&
        node.children?.map((child) => (
          <CategoryRow key={child.id} node={child} level={level + 1} />
        ))}
    </>
  );
}
