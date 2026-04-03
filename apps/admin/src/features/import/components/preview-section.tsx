import { useState } from "react";
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
  ArrowLeft,
  Info,
} from "lucide-react";
import { SheetCard } from "./sheet-card";
import type { AnalysisResult } from "../hooks/use-import-machine";

export function PreviewSection({
  fileName,
  parseResult,
  analysis,
  onConfirm,
  onCancel,
}: {
  fileName: string;
  parseResult: FullImportResult;
  analysis: AnalysisResult | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showInvalidRows, setShowInvalidRows] = useState(false);

  const hasWarnings = parseResult.warnings.length > 0;
  const hasInvalidRows = parseResult.invalidRows.length > 0;
  const hasElevators = parseResult.combined.length > 0;
  const analysisReady = !!analysis;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {parseResult.combined.length} hissar totalt
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Välj annan fil
        </Button>
      </div>

      {/* Sheet summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SheetCard
          title="Hissar"
          found={parseResult.sheets.elevators.found}
          count={parseResult.sheets.elevators.count}
          required
        />
        <SheetCard
          title="Nödtelefoner"
          found={parseResult.sheets.emergencyPhones.found}
          count={parseResult.sheets.emergencyPhones.count}
          extra={
            parseResult.sheets.emergencyPhones.joined > 0
              ? `${parseResult.sheets.emergencyPhones.joined} kopplade`
              : undefined
          }
        />
        <SheetCard
          title="Rivna hissar"
          found={parseResult.sheets.demolished.found}
          count={parseResult.sheets.demolished.count}
        />
      </div>

      {/* Server analysis */}
      {analysisReady ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analys</CardTitle>
            <CardDescription>
              Jämförelse med befintlig data i systemet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Nya hissar"
                value={analysis.summary.newElevators}
                variant="success"
              />
              <StatCard
                label="Uppdateras"
                value={analysis.summary.updatedElevators}
                variant="warning"
              />
              <StatCard
                label="Matchade org."
                value={analysis.summary.matchedOrgs}
                variant="default"
              />
              <StatCard
                label="Nya org."
                value={analysis.summary.newOrgs}
                variant={analysis.summary.newOrgs > 0 ? "info" : "default"}
              />
            </div>
            {analysis.newOrgNames.length > 0 && (
              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Nya organisationer skapas automatiskt
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-blue-700 dark:text-blue-300">
                      {analysis.newOrgNames.map((name) => (
                        <li key={name}>• {name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Analyserar mot befintlig data...
            </span>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Card>
          <CardHeader
            className="cursor-pointer pb-3"
            onClick={() => setShowWarnings(!showWarnings)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">
                  Varningar ({parseResult.warnings.length})
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                {showWarnings ? "Dölj" : "Visa"}
              </span>
            </div>
          </CardHeader>
          {showWarnings && (
            <CardContent>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {parseResult.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded px-2 py-1 text-xs odd:bg-muted/50"
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      Rad {w.row}
                      {w.column ? ` (${w.column})` : ""}
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
          <CardHeader
            className="cursor-pointer pb-3"
            onClick={() => setShowInvalidRows(!showInvalidRows)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">
                  Ogiltiga rader ({parseResult.invalidRows.length})
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                {showInvalidRows ? "Dölj" : "Visa"}
              </span>
            </div>
          </CardHeader>
          {showInvalidRows && (
            <CardContent>
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
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button onClick={onConfirm} disabled={!analysisReady || !hasElevators}>
          Importera {parseResult.combined.length} hissar
        </Button>
      </div>
    </div>
  );
}
