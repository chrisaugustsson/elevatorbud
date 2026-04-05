import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { StatCard } from "@elevatorbud/ui/components/ui/stat-card";
import { Upload, CheckCircle2, XCircle } from "lucide-react";
import type { ImportResult } from "../hooks/use-import-machine";

export function ResultSection({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  const hasErrors = result.errors.length > 0;
  const success = result.created > 0 || result.updated > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <CardTitle>
              {success ? "Import slutförd" : "Import misslyckades"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Skapade"
              value={result.created}
              variant="success"
            />
            <StatCard
              label="Uppdaterade"
              value={result.updated}
              variant="warning"
            />
            <StatCard
              label="Fel"
              value={result.errors.length}
              variant={hasErrors ? "warning" : "default"}
            />
          </div>

          {result.orgsCreated.length > 0 && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Nya organisationer skapade:
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-blue-700 dark:text-blue-300">
                {result.orgsCreated.map((name) => (
                  <li key={name}>• {name}</li>
                ))}
              </ul>
            </div>
          )}

          {result.emailSent && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  Importrapport skickad via e-post
                </p>
              </div>
            </div>
          )}

          {hasErrors && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-destructive">Fel:</p>
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
                {result.errors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded px-2 py-1 text-xs odd:bg-muted/50"
                  >
                    {err.elevator_number && (
                      <span className="font-mono text-muted-foreground">
                        {err.elevator_number}:{" "}
                      </span>
                    )}
                    <span>{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={onReset}>
        <Upload className="mr-2 h-4 w-4" />
        Importera ny fil
      </Button>
    </div>
  );
}
