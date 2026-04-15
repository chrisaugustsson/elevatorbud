import { createFileRoute, useBlocker } from "@tanstack/react-router";
import {
  Card,
  CardContent,
} from "@elevatorbud/ui/components/ui/card";
import { UploadZone } from "@elevatorbud/ui/components/ui/upload-zone";
import { Loader2 } from "lucide-react";
import { useImportMachine } from "../../features/import/hooks/use-import-machine";
import { ImportStepper } from "../../features/import/components/import-stepper";
import { SheetSelectionSection } from "../../features/import/components/sheet-selection-section";
import { ColumnMappingSection } from "../../features/import/components/column-mapping-section";
import { OrgMappingSection } from "../../features/import/components/org-mapping-section";
import { PreviewSection } from "../../features/import/components/preview-section";
import { ResultSection } from "../../features/import/components/result-section";

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
    importResult,
    analysis,
    resolvedOrgMapping,
    autoMapResult,
    sheetData,
    sheetInfos,
    selectedSheets,
    currentSheetIndex,
    extractedOrgData,
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
        />
      )}

      {status === "org-mapping" && parseResult && extractedOrgData && (
        <OrgMappingSection
          orgNames={extractedOrgData.orgNames}
          rowCount={parseResult.elevators.length}
          onConfirm={handleOrgMappingConfirm}
          onBack={handleBackToMapping}
        />
      )}

      {status === "preview" && parseResult && (
        <PreviewSection
          fileName={fileName}
          parseResult={parseResult}
          analysis={analysis}
          resolvedOrgMapping={resolvedOrgMapping}
          onConfirm={handleConfirm}
          onBack={handleBackToOrgMapping}
        />
      )}

      {status === "importing" && (
        <Card>
          <CardContent className="py-12">
            <div className="mx-auto max-w-md space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Importerar hissar...</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: importProgress.total > 0
                        ? `${Math.round((importProgress.current / importProgress.total) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {importProgress.current} av {importProgress.total} hissar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "complete" && importResult && (
        <ResultSection result={importResult} onReset={handleReset} />
      )}
    </div>
  );
}
