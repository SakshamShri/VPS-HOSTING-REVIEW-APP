import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Users,
  Settings2,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { ScrollArea } from "../components/ui/scroll-area";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";
import { logoutAndRedirect } from "../lib/logout";

type NavItem = {
  label: string;
  path?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  disabled?: boolean;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

interface UserSidebarProps {
  width: number;
  collapsed: boolean;
  onResizeStart: () => void;
  onToggleCollapse: () => void;
}

const sections: NavSection[] = [
  {
    title: "MAIN OVERVIEW",
    items: [
      {
        label: "Dashboard",
        path: "/user/home",
        icon: LayoutDashboard,
      },
      {
        label: "Feed",
        path: "/user/feed",
        icon: ListChecks,
      },
      {
        label: "Trending",
        path: "/user/trending",
        icon: ListChecks,
      },
      {
        label: "My Groups",
        path: "/user/groups",
        icon: Users,
      },
      {
        label: "Public Profiles",
        path: "/profiles",
        icon: Users,
      },
      {
        label: "Claims & Verification Hub",
        icon: FolderKanban,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "PSI Module",
        icon: ListChecks,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "SMPS Module",
        icon: ListChecks,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "Poll Management",
        path: "/polls/create",
        icon: ListChecks,
      },
      {
        label: "Moderation Center",
        icon: ListChecks,
        disabled: true,
        badge: "Coming soon",
      },
    ],
  },
  {
    title: "SYSTEM OPERATIONS",
    items: [
      {
        label: "Analytics & Reports",
        icon: FolderKanban,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "Categories & Taxonomy",
        icon: FolderKanban,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "Support & Ticketing",
        icon: Users,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "Communication Hub",
        icon: ListChecks,
        disabled: true,
        badge: "Coming soon",
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        label: "Security & Access Control",
        icon: Settings2,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "Integrations & API",
        icon: Settings2,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "Audit Logs (Global)",
        icon: Settings2,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "CMS / Static Pages",
        icon: FolderKanban,
        disabled: true,
        badge: "Coming soon",
      },
      {
        label: "System Monitoring",
        icon: Settings2,
        disabled: true,
        badge: "Coming soon",
      },
    ],
  },
];

export function UserSidebar({ width, collapsed, onResizeStart, onToggleCollapse }: UserSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 border-r bg-background/80 backdrop-blur hidden lg:flex lg:flex-col",
        collapsed && "pointer-events-none opacity-0"
      )}
      style={{ width: collapsed ? 0 : width }}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            PE
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Polls Engine</span>
            <span className="text-xs text-muted-foreground">User</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            onClick={onToggleCollapse}
          >
            Hide
          </button>
          <button
            type="button"
            className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            onClick={() => logoutAndRedirect("/login")}
          >
            Logout
          </button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 px-2 py-4">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground">
                {section.title}
              </p>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isDisabled = item.disabled;
                  const path = item.path ?? "#";

                  const isActive =
                    !isDisabled &&
                    !!item.path &&
                    (location.pathname === path || location.pathname.startsWith(path));

                  return (
                    <NavLink
                      key={item.label}
                      to={path}
                      aria-disabled={isDisabled}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "group flex w-full justify-start gap-3 rounded-md px-2.5 py-2 text-sm font-medium",
                        isActive &&
                          "bg-secondary text-foreground shadow-sm hover:bg-secondary",
                        isDisabled &&
                          "pointer-events-none cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 text-muted-foreground",
                          isActive && "text-foreground"
                        )}
                      />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-border"
        onMouseDown={onResizeStart}
      />
    </aside>
  );
}
