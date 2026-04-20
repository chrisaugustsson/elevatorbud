import { useEffect, useRef } from "react";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import {
  Card,
  CardContent,
} from "@elevatorbud/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@elevatorbud/ui/components/ui/dialog";
import { Button } from "@elevatorbud/ui/components/ui/button";
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

  // Use the resolver form so we can render a styled dialog instead of the
  // native browser prompt. `enableBeforeUnload` still fires a native confirm
  // on tab-close / refresh because the browser does not allow custom UI for
  // those — that's a platform constraint, not an app choice.
  const blocker = useBlocker({
    shouldBlockFn: () => hasUnsavedState,
    enableBeforeUnload: () => hasUnsavedState,
    disabled: !hasUnsavedState,
    withResolver: true,
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
          acceptedExtensions={[".xlsx", ".xls"]}
          maxSizeMB={10}
          title="Dra och släpp en Excel-fil här"
          subtitle="eller klicka för att välja fil (.xlsx, max 10 MB)"
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
                  Bearbetar {importProgress.current} av{" "}
                  {importProgress.total} hissar…
                </span>
              </div>
              <div className="space-y-2">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={importProgress.total}
                  aria-valuenow={importProgress.current}
                  aria-label={`Importerar hiss ${importProgress.current} av ${importProgress.total}`}
                  className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
                    style={{
                      width: `${
                        importProgress.total > 0
                          ? (importProgress.current / importProgress.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Importen körs i små grupper. Enstaka rader som misslyckas
                  hoppas över och rapporteras i slutet — lämna inte sidan.
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
        <div className="space-y-4">
          <ImportErrorSection
            error={importError}
            onBackToMapping={handleBackToOrgMapping}
            onStartOver={handleReset}
            headingRef={errorHeadingRef}
          />
          {importResult &&
            (importResult.created > 0 || importResult.failures.length > 0) && (
              <ResultSection result={importResult} onReset={handleReset} />
            )}
        </div>
      )}

      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lämna importen?</DialogTitle>
            <DialogDescription>
              Du har en pågående import. Om du lämnar sidan kommer alla val
              och mappningar att gå förlorade.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stanna kvar
            </Button>
            <Button
              variant="destructive"
              onClick={() => blocker.proceed?.()}
            >
              Lämna ändå
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
