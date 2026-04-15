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
} from "lucide-react";
import { SheetCard } from "./sheet-card";
import type { AnalysisResult, ResolvedOrgMapping } from "../hooks/use-import-machine";

export function PreviewSection({
  fileName,
  parseResult,
  analysis,
  resolvedOrgMapping,
  onConfirm,
  onBack,
}: {
  fileName: string;
  parseResult: FullImportResult;
  analysis: AnalysisResult | undefined;
  resolvedOrgMapping?: ResolvedOrgMapping | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showInvalidRows, setShowInvalidRows] = useState(false);

  const hasWarnings = parseResult.warnings.length > 0;
  const hasInvalidRows = parseResult.invalidRows.length > 0;
  const hasElevators = parseResult.elevators.length > 0;
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
              {parseResult.elevators.length} hissar totalt
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Välj annan fil
        </Button>
      </div>

      {/* Sheet summary cards */}
      <div className="grid gap-3 sm:grid-cols-1">
        <SheetCard
          title="Hissar"
          found={parseResult.sheets.elevators.found}
          count={parseResult.sheets.elevators.count}
          required
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
                value={resolvedOrgMapping ? resolvedOrgMapping.matchedOrgs.length : analysis.summary.matchedOrgs}
                variant="default"
              />
              <StatCard
                label="Organisationer"
                value={resolvedOrgMapping ? resolvedOrgMapping.matchedOrgs.length : analysis.summary.matchedOrgs}
                variant="default"
              />
            </div>
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
