import React, { useState } from "react";
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
  const [showFailures, setShowFailures] = useState(true);

  const failureCount = result.failures.length;
  const hasFailures = failureCount > 0;
  const successCount = result.created + result.updated;
  const allFailed = successCount === 0 && hasFailures;
  const partial = successCount > 0 && hasFailures;

  // Entries carry the org id as key — we sort by display name but fall
  // back to the id suffix when names collide so admins can distinguish
  // like-named orgs (e.g. two "Hissar AB" branches in different regions).
  const perOrgEntries = result.perOrgCounts
    ? Object.entries(result.perOrgCounts)
        .map(([orgId, counts]) => ({ orgId, ...counts }))
        .filter((e) => e.created > 0 || e.updated > 0)
        .sort((a, b) => a.orgName.localeCompare(b.orgName, "sv"))
    : [];
  const nameCounts = perOrgEntries.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.orgName] = (acc[e.orgName] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const headerIcon = allFailed ? (
    <XCircle className="h-5 w-5 text-destructive" />
  ) : partial ? (
    <AlertTriangle className="h-5 w-5 text-amber-500" />
  ) : (
    <CheckCircle2 className="h-5 w-5 text-green-600" />
  );

  const headerTitle = allFailed
    ? "Import misslyckades"
    : partial
      ? "Import slutförd med fel"
      : "Import slutförd";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {headerIcon}
            <CardTitle>{headerTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Skapade"
              value={result.created}
              variant="success"
            />
            <StatCard
              label="Uppdaterade"
              value={result.updated}
              variant={result.updated > 0 ? "success" : "default"}
            />
            <StatCard
              label="Misslyckade"
              value={failureCount}
              variant={hasFailures ? "warning" : "default"}
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
                            className="text-sky-700 dark:text-sky-400 text-xs"
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

      {hasFailures && (
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              aria-expanded={showFailures}
              aria-controls="import-failures-panel"
              onClick={() => setShowFailures(!showFailures)}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-2">
                <XCircle
                  className="h-4 w-4 text-destructive"
                  aria-hidden="true"
                />
                <CardTitle className="text-base">
                  Misslyckade rader ({failureCount})
                </CardTitle>
              </span>
              <span className="text-xs text-muted-foreground">
                {showFailures ? "Dölj" : "Visa"}
              </span>
            </button>
          </CardHeader>
          {showFailures && (
            <CardContent id="import-failures-panel">
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {result.failures.map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded px-2 py-1 text-xs odd:bg-muted/50"
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {f.sheet ? `${f.sheet} ` : ""}
                      {f.row ? `rad ${f.row}` : "okänd rad"} · "{f.elevator_number}"
                    </span>
                    <span>{f.reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

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
              Importen avbröts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm"
            role="alert"
          >
            <p className="font-medium text-destructive">{error}</p>
            <p className="mt-2 text-muted-foreground">
              Se listan nedan för rader som redan skapats eller misslyckats.
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
