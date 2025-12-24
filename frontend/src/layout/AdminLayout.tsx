import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "../lib/utils";

type AdminLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function AdminLayout({
  children,
  title = "Poll Category Master",
  subtitle = "Configure the taxonomy that powers your polls.",
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted">
      <Sidebar collapsed={sidebarCollapsed} />
      <div
        className={cn(
          "flex flex-1 flex-col transition-[margin] duration-200",
          !sidebarCollapsed && "lg:ml-64"
        )}
      >
        <Topbar
          title={title}
          subtitle={subtitle}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        />
        <main className="flex-1 bg-background">
          <div className="container py-8">
            <div className="mx-auto max-w-6xl">
              <section className="rounded-lg border bg-card shadow-sm">
                <div className="p-6 sm:p-8">{children}</div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
