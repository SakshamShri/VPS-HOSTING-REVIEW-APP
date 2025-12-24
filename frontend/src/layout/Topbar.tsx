import { logoutAndRedirect } from "../lib/logout";

type TopbarProps = {
  title: string;
  subtitle?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function Topbar({ title, subtitle, sidebarCollapsed, onToggleSidebar }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-xs hover:bg-muted"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? "☰" : "⟨"}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border bg-background px-2 py-1 text-[11px] font-medium hover:bg-muted"
            onClick={() => logoutAndRedirect("/login")}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
