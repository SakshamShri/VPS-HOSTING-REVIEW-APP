import * as React from "react";

import { cn } from "../../lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "secondary";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-tight",
          variant === "default" && "bg-muted text-foreground border-transparent",
          variant === "secondary" &&
            "bg-muted/60 text-muted-foreground border-transparent",
          variant === "outline" && "bg-background text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
