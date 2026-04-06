import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyzeImportOptions, confirmImport } from "~/server/import";
import { getMeOptions } from "~/server/user";
import {
  readWorkbook,
  autoMapSheet,
  autoMapColumns,
  getSheetData,
  parseExcelImportWithMapping,
  type FullImportResult,
  type AutoMapResult,
  type ColumnMapping,
} from "@elevatorbud/utils";

export type AnalysisResult = {
  existingElevatorNumbers: Record<string, string>;
  orgMatchNames: string[];
  orgMatchIds: string[];
  newOrgNames: string[];
  summary: {
    newElevators: number;
    updatedElevators: number;
    matchedOrgs: number;
    newOrgs: number;
  };
};

export type ImportProgress = {
  current: number;
  total: number;
};

export type ImportResult = {
  created: number;
  updated: number;
  errors: { elevator_number: string; error: string }[];
  orgsCreated: string[];
  orgsCreatedIds: string[];
  emailSent?: boolean;
};

export type ImportStatus =
  | "idle"
  | "parsing"
  | "mapping"
  | "preview"
  | "importing"
  | "complete";

const IMPORT_BATCH_SIZE = 50;

export function useImportMachine() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [parseResult, setParseResult] = useState<FullImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [analysisArgs, setAnalysisArgs] = useState<{
    elevatorNumberList: string[];
    orgNames: string[];
  } | null>(null);

  // Mapping step state
  const workbookRef = useRef<ReturnType<typeof readWorkbook> | null>(null);
  const [autoMapResult, setAutoMapResult] = useState<AutoMapResult | null>(
    null,
  );
  const [sheetData, setSheetData] = useState<unknown[][]>([]);

  const { data: currentUser } = useQuery(getMeOptions()) as { data: { email?: string } | undefined };

  const { data: analysis, error: analysisError } = useQuery({
    ...analyzeImportOptions(analysisArgs!),
    enabled: !!analysisArgs,
  });

  if (analysisError) {
    console.error("analyzeImport failed:", analysisError);
  }

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
      const wb = readWorkbook(buffer);
      workbookRef.current = wb;

      // Auto-map the Hissar sheet
      const mapResult = autoMapSheet(wb, "Hissar");
      if (!mapResult) {
        setParseError("Kunde inte hitta eller läsa 'Hissar'-arket");
        setStatus("idle");
        return;
      }

      const data = getSheetData(wb, "Hissar");
      setSheetData(data);
      setAutoMapResult(mapResult);
      setStatus("mapping");
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "Kunde inte läsa filen",
      );
      setStatus("idle");
    }
  }, []);

  const handleHeaderRowChange = useCallback(
    (rowIndex: number) => {
      const wb = workbookRef.current;
      if (!wb) return;
      const data = getSheetData(wb, "Hissar");
      if (rowIndex < 0 || rowIndex >= data.length) return;

      const headerRow = data[rowIndex] || [];
      const headers = headerRow.map((cell) => String(cell || ""));
      const result = autoMapColumns(headers, rowIndex);
      setAutoMapResult(result);
      setSheetData(data);
    },
    [],
  );

  const handleMappingConfirm = useCallback(
    (mappings: ColumnMapping[]) => {
      const wb = workbookRef.current;
      if (!wb || !autoMapResult) return;

      try {
        const result = parseExcelImportWithMapping(
          wb,
          mappings,
          autoMapResult.headerRowIndex,
        );
        setParseResult(result);

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
          e instanceof Error ? e.message : "Kunde inte tolka filen",
        );
        setStatus("idle");
      }
    },
    [autoMapResult],
  );

  const handleConfirm = useCallback(async () => {
    if (!parseResult || !analysis) return;

    setStatus("importing");

    const allElevators = parseResult.combined;
    const totalBatches = Math.ceil(allElevators.length / IMPORT_BATCH_SIZE);
    setImportProgress({ current: 0, total: allElevators.length });

    let totalCreated = 0;
    let totalUpdated = 0;
    const allErrors: { elevator_number: string; error: string }[] = [];
    let allOrgsCreated: string[] = [];

    // Track all known org names → IDs (starts with pre-existing matches)
    let knownOrgNames = [...analysis.orgMatchNames];
    let knownOrgIds = [...analysis.orgMatchIds];

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = allElevators.slice(
          i * IMPORT_BATCH_SIZE,
          (i + 1) * IMPORT_BATCH_SIZE,
        );

        const result = await confirmImport({
          data: {
            elevators: batch,
            existingOrgMatchNames: knownOrgNames,
            existingOrgMatchIds: knownOrgIds,
            // Only create new orgs in the first batch
            newOrgNames: i === 0 ? analysis.newOrgNames : [],
            adminEmail: currentUser?.email,
          },
        });

        totalCreated += result.created;
        totalUpdated += result.updated;
        allErrors.push(...result.errors);

        // After first batch, add newly created orgs to known list
        if (i === 0 && result.orgsCreated.length > 0) {
          allOrgsCreated = result.orgsCreated;
          knownOrgNames = [...knownOrgNames, ...result.orgsCreated];
          knownOrgIds = [...knownOrgIds, ...result.orgsCreatedIds];
        }

        setImportProgress({ current: Math.min((i + 1) * IMPORT_BATCH_SIZE, allElevators.length), total: allElevators.length });
      }

      setImportResult({
        created: totalCreated,
        updated: totalUpdated,
        errors: allErrors,
        orgsCreated: allOrgsCreated,
        orgsCreatedIds: [],
      });
      setStatus("complete");
    } catch (e) {
      setImportResult({
        created: totalCreated,
        updated: totalUpdated,
        errors: [
          ...allErrors,
          {
            elevator_number: "",
            error: e instanceof Error ? e.message : "Import misslyckades",
          },
        ],
        orgsCreated: allOrgsCreated,
        orgsCreatedIds: [],
      });
      setStatus("complete");
    }
  }, [parseResult, analysis, currentUser]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setParseResult(null);
    setFileName("");
    setParseError(null);
    setImportResult(null);
    setAnalysisArgs(null);
    setAutoMapResult(null);
    setSheetData([]);
    workbookRef.current = null;
  }, []);

  return {
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
  };
}
