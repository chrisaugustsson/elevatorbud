import { useEffect, useRef } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import {
  Card,
  CardContent,
} from "@elevatorbud/ui/components/ui/card";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { UploadZone } from "@elevatorbud/ui/components/ui/upload-zone";
import { Loader2 } from "lucide-react";
import { useImportMachine } from "../../features/import/hooks/use-import-machine";
import { ImportStepper } from "../../features/import/components/import-stepper";
import { SheetSelectionSection } from "../../features/import/components/sheet-selection-section";
import { ColumnMappingSection } from "../../features/import/components/column-mapping-section";
import { OrgMappingSection } from "../../features/import/components/org-mapping-section";
import { PreviewSection } from "../../features/import/components/preview-section";
import { ResultSection, ImportErrorSection } from "../../features/import/components/result-section";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: ImportPage,
});

function ImportPage() {
  const {
    status,
    importProgress,
    parseResult,
    fileName,
    parseError,
    importError,
    importResult,
    analysis,
    resolvedOrgMapping,
    autoMapResult,
    sheetData,
    sheetInfos,
    selectedSheets,
    currentSheetIndex,
    extractedOrgData,
    priorOrgMappingEntries,
    handleFileSelect,
    handleSheetSelectionConfirm,
    handleHeaderRowChange,
    handleMappingConfirm,
    handleOrgMappingConfirm,
    handleConfirm,
    handleReset,
    handleBackToUpload,
    handleBackToSheetSelection,
    handleBackToMapping,
    handleBackToOrgMapping,
  } = useImportMachine();

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (prevStatusRef.current !== status && status !== "idle" && status !== "parsing") {
      requestAnimationFrame(() => {
        // Route focus to the error heading when the import fails so screen
        // readers land directly on the failure context, not the stepper.
        const target =
          status === "error" ? errorHeadingRef.current : stepHeadingRef.current;
        target?.focus();
      });
    }
    prevStatusRef.current = status;
  }, [status]);

  const hasUnsavedState = status !== "idle" && status !== "complete";

  useBlocker({
    shouldBlockFn: () =>
      window.confirm(
        "Du har en pågående import. Om du lämnar sidan kommer alla val och mappningar att gå förlorade. Vill du verkligen lämna?",
      )
        ? false
        : true,
    enableBeforeUnload: () => hasUnsavedState,
    disabled: !hasUnsavedState,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Importera hissdata från Excel-fil
        </p>
      </div>

      <ImportStepper status={status} />

      {status === "idle" && (
        <UploadZone
          onFileSelect={handleFileSelect}
          accept=".xlsx,.xls"
          title="Dra och släpp en Excel-fil här"
          subtitle="eller klicka för att välja fil (.xlsx)"
          error={parseError}
        >
          <p className="text-xs text-muted-foreground">
            Du kan välja vilka ark som ska importeras i nästa steg.
          </p>
        </UploadZone>
      )}

      {status === "sheet-selection" && (
        <SheetSelectionSection
          sheetInfos={sheetInfos}
          defaultSelected={selectedSheets}
          onConfirm={handleSheetSelectionConfirm}
          onBack={handleBackToUpload}
          headingRef={stepHeadingRef}
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

      {status === "mapping" && autoMapResult && (
        <ColumnMappingSection
          key={`${selectedSheets[currentSheetIndex]}-${autoMapResult.headerRowIndex}`}
          autoMapResult={autoMapResult}
          sheetData={sheetData}
          sheetName={selectedSheets[currentSheetIndex]}
          sheetProgress={{
            current: currentSheetIndex + 1,
            total: selectedSheets.length,
          }}
          onConfirm={handleMappingConfirm}
          onHeaderRowChange={handleHeaderRowChange}
          onBack={handleBackToSheetSelection}
          headingRef={stepHeadingRef}
        />
      )}

      {status === "org-mapping" && parseResult && !extractedOrgData && (
        <Card aria-busy="true" aria-live="polite">
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <span>Analyserar organisationer i filen...</span>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {status === "org-mapping" && parseResult && extractedOrgData && (
        <OrgMappingSection
          orgNames={extractedOrgData.orgNames}
          rowCount={parseResult.elevators.length}
          priorMappings={priorOrgMappingEntries}
          onConfirm={handleOrgMappingConfirm}
          onBack={handleBackToMapping}
          headingRef={stepHeadingRef}
        />
      )}

      {status === "preview" && parseResult && (
        <PreviewSection
          fileName={fileName}
          parseResult={parseResult}
          analysis={analysis}
          resolvedOrgMapping={resolvedOrgMapping}
          selectedSheets={selectedSheets}
          onConfirm={handleConfirm}
          onBack={handleBackToOrgMapping}
          headingRef={stepHeadingRef}
        />
      )}

      {status === "importing" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-md space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2
                  className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span className="font-medium">
                  Importerar {importProgress.total} hissar...
                </span>
              </div>
              <div className="space-y-2">
                {/*
                  Server does not stream per-batch progress yet — the bar is
                  indeterminate but the visible numeric label tells the admin
                  how many rows are in flight so the operation doesn't feel
                  like a black box (US-028). Switch to determinate once
                  streaming is wired.
                */}
                <div
                  role="progressbar"
                  aria-busy="true"
                  aria-label={`Importerar ${importProgress.total} hissar`}
                  className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary animate-pulse motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-70" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {importProgress.current > 0 &&
                  importProgress.current >= importProgress.total
                    ? `${importProgress.total} av ${importProgress.total} importerade`
                    : `${importProgress.total} hissar importeras...`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "complete" && importResult && (
        <ResultSection result={importResult} onReset={handleReset} />
      )}

      {status === "error" && importError && (
        <ImportErrorSection
          error={importError}
          onBackToMapping={handleBackToOrgMapping}
          onStartOver={handleReset}
          headingRef={errorHeadingRef}
        />
      )}
    </div>
  );
}
