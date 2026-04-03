import type React from "react";
import { cn } from "@elevatorbud/ui/lib/utils";

export function FieldWrapper({
  changed,
  children,
}: {
  changed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md p-2 transition-colors",
        changed &&
          "border-l-4 border-l-amber-500 bg-amber-50/50 pl-3 dark:bg-amber-950/20",
      )}
    >
      {children}
    </div>
  );
}
