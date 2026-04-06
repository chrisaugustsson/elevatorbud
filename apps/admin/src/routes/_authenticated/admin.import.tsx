import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
} from "@elevatorbud/ui/components/ui/card";
import { UploadZone } from "@elevatorbud/ui/components/ui/upload-zone";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useImportMachine } from "../../features/import/hooks/use-import-machine";
import { ColumnMappingSection } from "../../features/import/components/column-mapping-section";
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
    autoMapResult,
    sheetData,
    handleFileSelect,
    handleHeaderRowChange,
    handleMappingConfirm,
    handleConfirm,
    handleReset,
  } = useImportMachine();

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
          accept=".xlsx,.xls"
          title="Dra och släpp en Excel-fil här"
          subtitle="eller klicka för att välja fil (.xlsx)"
          error={parseError}
        >
          <div className="space-y-2">
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
                <strong>Rivna hissar</strong> — rivna/arkiverade hissar
                (valfritt)
              </li>
            </ul>
          </div>
        </UploadZone>
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
          key={autoMapResult.headerRowIndex}
          autoMapResult={autoMapResult}
          sheetData={sheetData}
          onConfirm={handleMappingConfirm}
          onHeaderRowChange={handleHeaderRowChange}
          onCancel={handleReset}
        />
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
