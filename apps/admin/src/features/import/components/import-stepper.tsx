import { Check } from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import type { ImportStatus } from "../hooks/use-import-machine";

const STEPS = [
  { label: "Ladda upp", statuses: ["idle"] },
  { label: "Välj ark", statuses: ["sheet-selection"] },
  { label: "Mappa kolumner", statuses: ["mapping"] },
  { label: "Mappa organisationer", statuses: ["org-mapping"] },
  { label: "Granska & importera", statuses: ["preview", "importing", "complete", "error"] },
] as const;

function getStepIndex(status: ImportStatus): number {
  if (status === "parsing") return 0;
  return STEPS.findIndex((s) => (s.statuses as readonly string[]).includes(status));
}

export function ImportStepper({ status }: { status: ImportStatus }) {
  const currentIndex = getStepIndex(status);

  if (currentIndex < 0) return null;

  return (
    <nav aria-label="Importsteg" className="mb-6">
      <p className="sr-only">
        Steg {currentIndex + 1} av {STEPS.length}: {STEPS[currentIndex].label}
      </p>
      <ol className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex || status === "complete";
          const isCurrent = i === currentIndex && status !== "complete";

          return (
            <li key={step.label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-6 sm:w-10",
                    isDone ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isDone && "bg-primary text-primary-foreground",
                    isCurrent && "border-2 border-primary bg-background text-primary",
                    !isDone && !isCurrent && "border border-border bg-muted text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {/* On mobile, only the CURRENT step's label is visible so
                    users always know where they are without sideways scroll.
                    From sm: up, every step's label is shown. */}
                <span
                  className={cn(
                    "text-sm",
                    isCurrent
                      ? "inline max-w-[10rem] truncate font-medium text-foreground sm:max-w-none"
                      : "hidden text-muted-foreground sm:inline",
                  )}
                  title={step.label}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
