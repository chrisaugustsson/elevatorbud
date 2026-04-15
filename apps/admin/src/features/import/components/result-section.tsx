import React from "react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { StatCard } from "@elevatorbud/ui/components/ui/stat-card";
import { Upload, CheckCircle2, XCircle, AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import type { ImportResult } from "../hooks/use-import-machine";

export function ResultSection({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  const success = result.created > 0 || result.updated > 0;
  // Entries carry the org id as key — we sort by display name but fall
  // back to the id suffix when names collide so admins can distinguish
  // like-named orgs (e.g. two "Hissar AB" branches in different regions).
  const perOrgEntries = result.perOrgCounts
    ? Object.entries(result.perOrgCounts)
        .map(([orgId, counts]) => ({ orgId, ...counts }))
        .sort((a, b) => a.orgName.localeCompare(b.orgName, "sv"))
    : [];
  const nameCounts = perOrgEntries.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.orgName] = (acc[e.orgName] ?? 0) + 1;
      return acc;
    },
    {},
  );

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
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {perOrgEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Per organisation</p>
              <div className="space-y-1">
                {perOrgEntries.map((entry) => {
                  const ambiguous = (nameCounts[entry.orgName] ?? 0) > 1;
                  return (
                    <div
                      key={entry.orgId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-medium">{entry.orgName}</span>
                        {ambiguous && (
                          <span className="font-mono text-xs text-muted-foreground">
                            #{entry.orgId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        {entry.created > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-emerald-700 dark:text-emerald-400 text-xs"
                          >
                            {entry.created} skapade
                          </Badge>
                        )}
                        {entry.updated > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-amber-700 dark:text-amber-400 text-xs"
                          >
                            {entry.updated} uppdaterade
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
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

export function ImportErrorSection({
  error,
  onBackToMapping,
  onStartOver,
  headingRef,
}: {
  error: string;
  onBackToMapping: () => void;
  onStartOver: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <CardTitle ref={headingRef} tabIndex={-1} className="focus:outline-none">
              Import misslyckades
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm"
            role="alert"
          >
            <p className="font-medium text-destructive">
              {error}
            </p>
            <p className="mt-2 text-muted-foreground">
              Transaktionen har rullats tillbaka — inga hissar har skapats eller uppdaterats.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBackToMapping}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till mappning
        </Button>
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Börja om
        </Button>
      </div>
    </div>
  );
}
