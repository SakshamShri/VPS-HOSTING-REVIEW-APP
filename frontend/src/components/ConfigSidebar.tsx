import { cn } from "../lib/utils";
import type { PollConfigSection } from "../types/pollConfig.types";
import { Button } from "./ui/button";

const sections: { id: PollConfigSection; label: string }[] = [
  { id: "basic-info", label: "Basic Info" },
  { id: "content-rules", label: "Content Rules" },
  { id: "voting-behavior", label: "Voting Behavior" },
  { id: "results-psi", label: "Results & PSI" },
  { id: "permissions", label: "Permissions" },
  { id: "ui-template", label: "UI Template" },
];

interface ConfigSidebarProps {
  activeSection: PollConfigSection;
  onSectionChange: (section: PollConfigSection) => void;
}

export function ConfigSidebar({ activeSection, onSectionChange }: ConfigSidebarProps) {
  return (
    <nav className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">
          Configuration
        </p>
        <div className="mt-1 flex flex-col gap-1">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <Button
                key={section.id}
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start text-xs font-medium",
                  isActive && "border border-primary/50 bg-primary/5"
                )}
                onClick={() => onSectionChange(section.id)}
              >
                <span className="truncate">{section.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
