import { LayoutDashboard, FolderKanban, ListChecks, Users, Settings2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { ScrollArea } from "../components/ui/scroll-area";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

const sidebarWidth = "w-64";

const items = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    disabled: false,
  },
  {
    label: "Poll Category Master",
    icon: FolderKanban,
    path: "/admin/categories",
    disabled: false,
  },
  {
    label: "Poll Master",
    icon: ListChecks,
    path: "/admin/poll-config",
    disabled: false,
  },
  {
    label: "Poll Instances",
    icon: ListChecks,
    path: "/admin/polls",
    disabled: false,
  },
  {
    label: "Profile Directory",
    icon: Users,
    path: "/admin/profile-directory",
    disabled: false,
  },
  {
    label: "Users",
    icon: Users,
    active: false,
    disabled: true,
    badge: "Coming soon",
  },
  {
    label: "Settings",
    icon: Settings2,
    active: false,
    disabled: true,
    badge: "Coming soon",
  },
];

type SidebarProps = {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({ collapsed = false, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();

  const content = (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            PE
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              Polls Engine
            </span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="space-y-1 px-2 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isDisabled = item.disabled;

            const isActive =
              !!item.path &&
              (location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path)));

            return (
              <NavLink
                key={item.label}
                to={item.path ?? "#"}
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
      </ScrollArea>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 border-r bg-background/80 backdrop-blur transition-transform duration-200",
          sidebarWidth,
          "hidden lg:flex lg:flex-col",
          collapsed && "-translate-x-full"
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
      >
        <aside
          className={cn(
            "absolute inset-y-0 left-0 border-r bg-background shadow-lg transition-transform duration-200",
            sidebarWidth,
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {content}
        </aside>
      </div>
    </>
  );
}
