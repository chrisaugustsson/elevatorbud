import React, { useState } from "react";
import type { FullImportResult } from "@elevatorbud/utils";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@elevatorbud/ui/components/ui/card";
import { StatCard } from "@elevatorbud/ui/components/ui/stat-card";
import {
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { SheetCard } from "./sheet-card";
import type { AnalysisResult, ResolvedOrgMapping } from "../hooks/use-import-machine";

export function PreviewSection({
  fileName,
  parseResult,
  analysis,
  resolvedOrgMapping,
  selectedSheets,
  onConfirm,
  onBack,
  headingRef,
}: {
  fileName: string;
  parseResult: FullImportResult;
  analysis: AnalysisResult | undefined;
  resolvedOrgMapping?: ResolvedOrgMapping | null;
  selectedSheets?: string[];
  onConfirm: () => void;
  onBack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showInvalidRows, setShowInvalidRows] = useState(false);

  const hasWarnings = parseResult.warnings.length > 0;
  const hasInvalidRows = parseResult.invalidRows.length > 0;
  const hasElevators = parseResult.elevators.length > 0;
  const analysisReady = !!analysis;

  // Build the sheet summary title from the actual selected sheets rather
  // than hardcoding "Hissar" — the import supports arbitrary sheet names.
  const sheetTitle = (() => {
    if (!selectedSheets || selectedSheets.length === 0) return "Valda ark";
    if (selectedSheets.length === 1) return selectedSheets[0];
    if (selectedSheets.length <= 3) return selectedSheets.join(", ");
    return `${selectedSheets.length} ark`;
  })();
  const sheetExtra =
    selectedSheets && selectedSheets.length > 3
      ? selectedSheets.join(", ")
      : undefined;

  return (
    <div className="space-y-4">
      {/* Header — no redundant "choose another file" action here; the
          stepper + bottom Back button handle navigation (FR-28). */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium">{fileName}</p>
          <p className="text-xs text-muted-foreground">
            {parseResult.elevators.length} hissar totalt
          </p>
        </div>
      </div>

      {/* Sheet summary card — reflects the sheets the admin selected. */}
      <div className="grid gap-3 sm:grid-cols-1">
        <SheetCard
          title={sheetTitle}
          found={parseResult.sheets.elevators.found}
          count={parseResult.sheets.elevators.count}
          required
          extra={sheetExtra}
        />
      </div>

      {/* Server analysis — aria-live="polite" on the wrapper so the
          completion of the analysis (skeleton → summary transition) is
          announced to screen readers rather than happening silently. */}
      <div aria-live="polite" aria-busy={!analysisReady}>
        {analysisReady ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base" ref={headingRef} tabIndex={-1}>Granska & importera</CardTitle>
              <CardDescription>
                Jämförelse med befintlig data i systemet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Nya hissar"
                  value={analysis.summary.newElevators}
                  variant="success"
                />
                <StatCard
                  label="Matchade org."
                  value={resolvedOrgMapping ? resolvedOrgMapping.matchedOrgs.length : analysis.summary.matchedOrgs}
                  variant="default"
                />
                <StatCard
                  label="Nya org."
                  value={resolvedOrgMapping ? resolvedOrgMapping.newOrgNames.length : analysis.summary.newOrgs}
                  variant="default"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2
                className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">
                Analyserar mot befintlig data...
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              aria-expanded={showWarnings}
              aria-controls="import-warnings-panel"
              onClick={() => setShowWarnings(!showWarnings)}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle
                  className="h-4 w-4 text-amber-500"
                  aria-hidden="true"
                />
                <CardTitle className="text-base">
                  Varningar ({parseResult.warnings.length})
                </CardTitle>
              </span>
              <span className="text-xs text-muted-foreground">
                {showWarnings ? "Dölj" : "Visa"}
              </span>
            </button>
          </CardHeader>
          {showWarnings && (
            <CardContent id="import-warnings-panel">
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {parseResult.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap gap-x-2 rounded px-2 py-1 text-xs odd:bg-muted/50"
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      Rad {w.row}
                      {w.column ? ` (${w.column})` : ""}
                      {w.elevator_number ? ` · ${w.elevator_number}` : ""}
                    </span>
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Invalid rows */}
      {hasInvalidRows && (
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              aria-expanded={showInvalidRows}
              aria-controls="import-invalid-rows-panel"
              onClick={() => setShowInvalidRows(!showInvalidRows)}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-2">
                <XCircle
                  className="h-4 w-4 text-destructive"
                  aria-hidden="true"
                />
                <CardTitle className="text-base">
                  Ogiltiga rader ({parseResult.invalidRows.length})
                </CardTitle>
              </span>
              <span className="text-xs text-muted-foreground">
                {showInvalidRows ? "Dölj" : "Visa"}
              </span>
            </button>
          </CardHeader>
          {showInvalidRows && (
            <CardContent id="import-invalid-rows-panel">
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {parseResult.invalidRows.map((r, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded px-2 py-1 text-xs odd:bg-muted/50"
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {r.sheet} rad {r.row}
                    </span>
                    <span>{r.reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Tillbaka
        </Button>
        <Button onClick={onConfirm} disabled={!analysisReady || !hasElevators}>
          Importera {parseResult.elevators.length} hissar
        </Button>
      </div>
    </div>
  );
}
