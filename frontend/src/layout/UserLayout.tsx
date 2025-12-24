import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { UserSidebar } from "./UserSidebar";

interface UserLayoutProps {
  children: ReactNode;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 256;

export function UserLayout({ children }: UserLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    function handleMouseMove(event: MouseEvent) {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setSidebarWidth(next);
    }

    function handleMouseUp() {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const effectiveWidth = collapsed ? 0 : sidebarWidth;

  return (
    <div className="flex min-h-screen bg-muted">
      <UserSidebar
        width={sidebarWidth}
        collapsed={collapsed}
        onResizeStart={() => setIsResizing(true)}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {collapsed && (
        <button
          type="button"
          className="fixed left-2 top-2 z-40 rounded-md border bg-background px-2 py-1 text-[11px] shadow"
          onClick={() => setCollapsed(false)}
        >
          Menu
        </button>
      )}

      <main
        className="flex-1 bg-background"
        style={{ marginLeft: effectiveWidth }}
      >
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
