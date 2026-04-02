import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  readWorkbook,
  parseExcelImport,
  type FullImportResult,
} from "@elevatorbud/utils";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@elevatorbud/ui/components/ui/card";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: ImportPage,
});

type AnalysisResult = {
  existingHissnummer: Record<string, string>;
  orgMatches: Record<string, string>;
  newOrgNames: string[];
  summary: {
    newElevators: number;
    updatedElevators: number;
    matchedOrgs: number;
    newOrgs: number;
  };
};

type ImportResult = {
  created: number;
  updated: number;
  errors: { elevator_number: string; error: string }[];
  orgsCreated: string[];
  emailSent?: boolean;
};

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "complete";

function ImportPage() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [parseResult, setParseResult] = useState<FullImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [analysisArgs, setAnalysisArgs] = useState<{
    elevatorNumberList: string[];
    orgNames: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmImport = useAction(api.imports.confirm);
  const currentUser = useQuery(api.users.me) as { email?: string } | undefined;

  // Server-side analysis (reactive query, skipped until parse is done)
  const analysis = useQuery(
    api.imports.analyze,
    analysisArgs ?? ("skip" as const),
  ) as AnalysisResult | undefined;

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setParseError("Filen måste vara i Excel-format (.xlsx)");
      return;
    }

    setFileName(file.name);
    setParseError(null);
    setStatus("parsing");
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = readWorkbook(buffer);
      const result = parseExcelImport(workbook);
      setParseResult(result);

      // Prepare analysis args — deduplicated
      const elevatorNumberList = [
        ...new Set(result.combined.map((e) => e.elevator_number)),
      ];
      const orgNames = [
        ...new Set(
          result.combined
            .map((e) => e._organisation_namn)
            .filter((n): n is string => !!n),
        ),
      ];

      setAnalysisArgs({ elevatorNumberList, orgNames });
      setStatus("preview");
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "Kunde inte läsa filen",
      );
      setStatus("idle");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleConfirm = useCallback(async () => {
    if (!parseResult || !analysis) return;

    setStatus("importing");
    try {
      const result = await confirmImport({
        elevators: parseResult.combined as any,
        existingOrgMapping: analysis.orgMatches as any,
        newOrgNames: analysis.newOrgNames,
        adminEmail: currentUser?.email,
      });
      setImportResult(result as ImportResult);
      setStatus("complete");
    } catch (e) {
      setImportResult({
        created: 0,
        updated: 0,
        errors: [
          {
            elevator_number: "",
            error: e instanceof Error ? e.message : "Import misslyckades",
          },
        ],
        orgsCreated: [],
      });
      setStatus("complete");
    }
  }, [parseResult, analysis, confirmImport, currentUser]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setParseResult(null);
    setFileName("");
    setParseError(null);
    setImportResult(null);
    setAnalysisArgs(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importera hissdata från Excel-fil
        </p>
      </div>

      {status === "idle" && (
        <UploadZone
          onFileSelect={handleFileSelect}
          onDrop={handleDrop}
          fileInputRef={fileInputRef}
          error={parseError}
        />
      )}

      {status === "parsing" && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Läser Excel-fil...</span>
          </CardContent>
        </Card>
      )}

      {status === "preview" && parseResult && (
        <PreviewSection
          fileName={fileName}
          parseResult={parseResult}
          analysis={analysis}
          onConfirm={handleConfirm}
          onCancel={handleReset}
        />
      )}

      {status === "importing" && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Importerar hissar...</span>
          </CardContent>
        </Card>
      )}

      {status === "complete" && importResult && (
        <ResultSection result={importResult} onReset={handleReset} />
      )}
    </div>
  );
}

// --- Upload Zone ---

function UploadZone({
  onFileSelect,
  onDrop,
  fileInputRef,
  error,
}: {
  onFileSelect: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center transition-colors hover:border-muted-foreground/50 cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium">
            Dra och släpp en Excel-fil här
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            eller klicka för att välja fil (.xlsx)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
          />
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium">Stödda format</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <strong>Hissar</strong> — huvudark (obligatoriskt)
            </li>
            <li className="flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <strong>Nodtelefoner</strong> — nödtelefondata (valfritt)
            </li>
            <li className="flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <strong>Rivna hissar</strong> — rivna/arkiverade hissar (valfritt)
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Preview Section ---

function PreviewSection({
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

// --- Sheet Card ---

function SheetCard({
  title,
  found,
  count,
  required,
  extra,
}: {
  title: string;
  found: boolean;
  count: number;
  required?: boolean;
  extra?: string;
}) {
  return (
    <Card>
      <CardContent className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          {found ? (
            <Badge variant="secondary">{count} rader</Badge>
          ) : required ? (
            <Badge variant="destructive">Saknas</Badge>
          ) : (
            <Badge variant="outline">Ej inkluderat</Badge>
          )}
        </div>
        {extra && (
          <p className="mt-1 text-xs text-muted-foreground">{extra}</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Stat Card ---

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "warning" | "info" | "default";
}) {
  const colors = {
    success: "text-green-700 dark:text-green-400",
    warning: "text-amber-700 dark:text-amber-400",
    info: "text-blue-700 dark:text-blue-400",
    default: "text-foreground",
  };

  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
    </div>
  );
}

// --- Result Section ---

function ResultSection({
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
