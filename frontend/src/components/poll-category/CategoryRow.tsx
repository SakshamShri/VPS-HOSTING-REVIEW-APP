import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import type { CategoryNode, CategoryStatus } from "../../types/category";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { deleteCategory } from "../../api/category.api";
import { fetchProfilesAdmin, type AdminProfileSummary } from "../../api/profileSystem.api";

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
  const [profilesOpen, setProfilesOpen] = useState<boolean>(false);
  const [profilesLoading, setProfilesLoading] = useState<boolean>(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AdminProfileSummary[]>([]);

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

  const handleToggleProfiles = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const nextOpen = !profilesOpen;
    setProfilesOpen(nextOpen);
    if (!nextOpen || profiles.length > 0 || profilesLoading) return;

    try {
      setProfilesLoading(true);
      setProfilesError(null);
      const list = await fetchProfilesAdmin(String(node.id));
      setProfiles(list);
    } catch (err) {
      console.error(err);
      setProfilesError((err as Error).message || "Failed to load profiles for this category");
    } finally {
      setProfilesLoading(false);
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
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] bg-muted text-[11px]">
              {isParent ? "\uD83D\uDCC1" : "\uD83D\uDCC2"}
            </span>
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
            {!isParent && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={handleToggleProfiles}
              >
                Profiles
              </Button>
            )}
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
      {profilesOpen && (
        <tr className="bg-muted/40">
          <td colSpan={4} className="px-8 py-3 align-middle">
            {profilesLoading && (
              <p className="text-[11px] text-muted-foreground">Loading profiles…</p>
            )}
            {!profilesLoading && profilesError && (
              <p className="text-[11px] text-destructive">{profilesError}</p>
            )}
            {!profilesLoading && !profilesError && profiles.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No profiles are attached to this category yet.
              </p>
            )}
            {!profilesLoading && !profilesError && profiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(
                        `/admin/profile-directory?categoryId=${encodeURIComponent(
                          String(node.id),
                        )}&profileId=${encodeURIComponent(p.id)}`,
                      );
                    }}
                  >
                    <div className="h-7 w-7 overflow-hidden rounded-full bg-slate-100">
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                          <span>{p.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
      {expanded &&
        node.children?.map((child) => (
          <CategoryRow key={child.id} node={child} level={level + 1} />
        ))}
    </>
  );
}
