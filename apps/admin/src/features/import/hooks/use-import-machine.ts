import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyzeImportOptions, extractOrgNamesOptions, confirmImport } from "~/server/import";
import { getMeOptions } from "~/server/user";
import {
  readWorkbook,
  getWorkbookSheetInfo,
  autoMapSheet,
  autoMapColumns,
  getSheetData,
  parseExcelImportWithMapping,
  type FullImportResult,
  type AutoMapResult,
  type ColumnMapping,
  type SheetInfo,
  type SheetMappingConfig,
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
  | "sheet-selection"
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

  // Sheet selection state
  const workbookRef = useRef<ReturnType<typeof readWorkbook> | null>(null);
  const [sheetInfos, setSheetInfos] = useState<SheetInfo[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  // Per-sheet mapping state
  const [autoMapResult, setAutoMapResult] = useState<AutoMapResult | null>(
    null,
  );
  const [sheetData, setSheetData] = useState<unknown[][]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [sheetMappings, setSheetMappings] = useState<
    Map<string, { mappings: ColumnMapping[]; headerRowIndex: number }>
  >(new Map());

  const { data: currentUser } = useQuery(getMeOptions()) as { data: { email?: string } | undefined };

  const { data: extractedOrgData } = useQuery(
    extractOrgNamesOptions(parseResult?.elevators ?? null),
  );

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

      const infos = getWorkbookSheetInfo(wb);
      if (infos.length === 0) {
        setParseError("Filen innehåller inga ark");
        setStatus("idle");
        return;
      }

      setSheetInfos(infos);
      setSelectedSheets(infos.map((s) => s.name));
      setStatus("sheet-selection");
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "Kunde inte läsa filen",
      );
      setStatus("idle");
    }
  }, []);

  const loadSheetForMapping = useCallback(
    (sheetName: string, inheritedMappings?: ColumnMapping[]) => {
      const wb = workbookRef.current;
      if (!wb) return false;

      const mapResult = autoMapSheet(wb, sheetName);
      if (!mapResult) {
        setParseError(`Kunde inte läsa arket '${sheetName}'`);
        setStatus("idle");
        return false;
      }

      if (inheritedMappings && inheritedMappings.length > 0) {
        const inheritedByHeader = new Map(
          inheritedMappings.map((m) => [m.sourceHeader.toLowerCase().trim(), m]),
        );
        const newMapped: ColumnMapping[] = [];
        const newUnmapped: number[] = [];

        for (let i = 0; i < mapResult.sourceHeaders.length; i++) {
          const header = mapResult.sourceHeaders[i];
          if (!header || !header.trim()) continue;

          const autoMatch = mapResult.mapped.find((m) => m.sourceIndex === i);
          const inherited = inheritedByHeader.get(header.toLowerCase().trim());

          if (autoMatch) {
            newMapped.push(autoMatch);
          } else if (inherited) {
            newMapped.push({
              sourceIndex: i,
              sourceHeader: header,
              field: inherited.field,
              parser: inherited.parser,
              autoMatched: false,
            });
          } else {
            newUnmapped.push(i);
          }
        }

        const mappedFields = new Set(newMapped.map((m) => m.field));
        const missingMandatory = mapResult.missingMandatory.filter(
          (f) => !mappedFields.has(f),
        );

        setAutoMapResult({
          ...mapResult,
          mapped: newMapped,
          unmappedIndices: newUnmapped,
          missingMandatory,
        });
      } else {
        setAutoMapResult(mapResult);
      }

      const data = getSheetData(wb, sheetName);
      setSheetData(data);
      return true;
    },
    [],
  );

  const handleSheetSelectionConfirm = useCallback(
    (sheets: string[]) => {
      if (sheets.length === 0) return;

      setSelectedSheets(sheets);
      setCurrentSheetIndex(0);
      setSheetMappings(new Map());

      if (loadSheetForMapping(sheets[0])) {
        setStatus("mapping");
      }
    },
    [loadSheetForMapping],
  );

  const handleHeaderRowChange = useCallback(
    (rowIndex: number) => {
      const wb = workbookRef.current;
      if (!wb || selectedSheets.length === 0) return;
      const currentSheet = selectedSheets[currentSheetIndex];
      const data = getSheetData(wb, currentSheet);
      if (rowIndex < 0 || rowIndex >= data.length) return;

      const headerRow = data[rowIndex] || [];
      const headers = headerRow.map((cell) => String(cell || ""));
      const result = autoMapColumns(headers, rowIndex);
      setAutoMapResult(result);
      setSheetData(data);
    },
    [selectedSheets, currentSheetIndex],
  );

  const handleMappingConfirm = useCallback(
    (mappings: ColumnMapping[]) => {
      const wb = workbookRef.current;
      if (!wb || !autoMapResult) return;

      const currentSheet = selectedSheets[currentSheetIndex];
      const updatedMappings = new Map(sheetMappings);
      updatedMappings.set(currentSheet, {
        mappings,
        headerRowIndex: autoMapResult.headerRowIndex,
      });
      setSheetMappings(updatedMappings);

      const nextIndex = currentSheetIndex + 1;
      if (nextIndex < selectedSheets.length) {
        setCurrentSheetIndex(nextIndex);
        loadSheetForMapping(selectedSheets[nextIndex], mappings);
        return;
      }

      try {
        const allConfigs: SheetMappingConfig[] = [];
        for (const [sheetName, config] of updatedMappings) {
          allConfigs.push({
            sheetName,
            mappings: config.mappings,
            headerRowIndex: config.headerRowIndex,
          });
        }

        const result = parseExcelImportWithMapping(wb, allConfigs);
        setParseResult(result);

        const elevatorNumberList = [
          ...new Set(result.elevators.map((e) => e.elevator_number)),
        ];
        const orgNames = [
          ...new Set(
            result.elevators
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
    [autoMapResult, selectedSheets, currentSheetIndex, sheetMappings, loadSheetForMapping],
  );

  const handleConfirm = useCallback(async () => {
    if (!parseResult || !analysis) return;

    setStatus("importing");

    const allElevators = parseResult.elevators;
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
    setSheetInfos([]);
    setSelectedSheets([]);
    setCurrentSheetIndex(0);
    setSheetMappings(new Map());
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
    sheetInfos,
    selectedSheets,
    currentSheetIndex,
    sheetMappings,
    extractedOrgData,
    handleFileSelect,
    handleSheetSelectionConfirm,
    handleHeaderRowChange,
    handleMappingConfirm,
    handleConfirm,
    handleReset,
  };
}
