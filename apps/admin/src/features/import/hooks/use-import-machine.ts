import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyzeImportOptions, extractOrgNamesOptions, confirmImport } from "~/server/import";
import type { ImportFailure } from "~/server/import";
import type { OrgMappingEntry } from "../components/org-mapping-section";
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
  orgMatchNames: string[];
  orgMatchIds: string[];
  newOrgNames: string[];
  summary: {
    newElevators: number;
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
  total: number;
  failures: ImportFailure[];
  perOrgCounts?: Record<string, { orgName: string; created: number }>;
};

export type { ImportFailure };

// Per-chunk size. Small enough that the admin sees progress tick every
// fraction of a second on a typical file, large enough that network RTT
// doesn't dominate the import time.
const IMPORT_CHUNK_SIZE = 5;

export type ImportStatus =
  | "idle"
  | "parsing"
  | "sheet-selection"
  | "mapping"
  | "org-mapping"
  | "preview"
  | "importing"
  | "complete"
  | "error";

export type ResolvedOrgMapping = {
  matchedOrgs: { name: string; id: string }[];
  newOrgNames: string[];
};

export function useImportMachine() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [parseResult, setParseResult] = useState<FullImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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
  const [resolvedOrgMapping, setResolvedOrgMapping] = useState<ResolvedOrgMapping | null>(null);

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

  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileSelect = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      setParseError(
        `Filen "${file.name}" är inte i Excel-format. Accepterade format: .xlsx och .xls — exportera från Excel och försök igen.`,
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setParseError(
        `Filen är för stor (${fileSizeMB} MB). Maximal filstorlek är ${MAX_FILE_SIZE_MB} MB — minska filstorleken eller dela upp i flera filer och försök igen.`,
      );
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
        setParseError(
          "Filen innehåller inga ark. Kontrollera att Excel-filen har minst ett ark med data och försök igen.",
        );
        setStatus("idle");
        return;
      }

      setSheetInfos(infos);
      setSelectedSheets(infos.map((s) => s.name));
      setStatus("sheet-selection");
    } catch (e) {
      setParseError(
        `Filen kunde inte läsas — den kan vara skadad eller i ett format som inte stöds. Försök exportera filen på nytt från Excel.${e instanceof Error ? ` (${e.message})` : ""}`,
      );
      setStatus("idle");
    }
  }, []);

  const loadSheetForMapping = useCallback(
    (
      sheetName: string,
      inheritedMappings?: ColumnMapping[],
      inheritedHeaderRowIndex?: number,
    ) => {
      const wb = workbookRef.current;
      if (!wb) return false;

      const data = getSheetData(wb, sheetName);

      // If the previous sheet's header was on row N, try row N on this
      // sheet too — but only if that row actually has non-empty cells,
      // otherwise fall back to auto-detection. This keeps sheets with
      // identical layouts from forcing the admin to re-pick the header
      // row on every one.
      let mapResult: AutoMapResult | null = null;
      if (
        inheritedHeaderRowIndex !== undefined &&
        inheritedHeaderRowIndex >= 0 &&
        inheritedHeaderRowIndex < data.length
      ) {
        const candidateRow = data[inheritedHeaderRowIndex] ?? [];
        const headers = (candidateRow as unknown[]).map((c) =>
          String(c ?? ""),
        );
        if (headers.some((h) => h.trim() !== "")) {
          mapResult = autoMapColumns(headers, inheritedHeaderRowIndex);
        }
      }
      if (!mapResult) {
        mapResult = autoMapSheet(wb, sheetName);
      }
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

      setSheetData(data);
      return true;
    },
    [],
  );

  const handleSheetSelectionConfirm = useCallback(
    (sheets: string[]) => {
      if (sheets.length === 0) return;

      // If the sheet selection is identical to last time, preserve any
      // per-sheet mappings so re-entering this step via Back doesn't destroy
      // prior work. If it changed, drop stale downstream state.
      const selectionChanged =
        sheets.length !== selectedSheets.length ||
        sheets.some((s, i) => s !== selectedSheets[i]);

      setSelectedSheets(sheets);
      setCurrentSheetIndex(0);
      if (selectionChanged) {
        setSheetMappings(new Map());
        setParseResult(null);
        setResolvedOrgMapping(null);
        setAnalysisArgs(null);
      }

      const inherited = selectionChanged
        ? undefined
        : sheetMappings.get(sheets[0])?.mappings;
      if (loadSheetForMapping(sheets[0], inherited)) {
        setStatus("mapping");
      }
    },
    [loadSheetForMapping, selectedSheets, sheetMappings],
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
      const confirmedHeaderRowIndex = autoMapResult.headerRowIndex;
      const updatedMappings = new Map(sheetMappings);
      updatedMappings.set(currentSheet, {
        mappings,
        headerRowIndex: confirmedHeaderRowIndex,
      });
      setSheetMappings(updatedMappings);

      const nextIndex = currentSheetIndex + 1;
      if (nextIndex < selectedSheets.length) {
        setCurrentSheetIndex(nextIndex);
        // Pass the confirmed header row index from THIS sheet as the
        // starting hint for the next sheet — if the next sheet's auto-
        // detected header row is different, the user can still override,
        // but starting from the same row matches the admin's mental
        // model when sheets share structure.
        loadSheetForMapping(
          selectedSheets[nextIndex],
          mappings,
          confirmedHeaderRowIndex,
        );
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
        setStatus("org-mapping");
      } catch (e) {
        setParseError(
          e instanceof Error ? e.message : "Kunde inte tolka filen",
        );
        setStatus("idle");
      }
    },
    [autoMapResult, selectedSheets, currentSheetIndex, sheetMappings, loadSheetForMapping],
  );

  const handleOrgMappingConfirm = useCallback(
    (entries: OrgMappingEntry[]) => {
      if (!parseResult) return;

      const matchedOrgs: { name: string; id: string }[] = [];
      const newOrgNames: string[] = [];

      for (const entry of entries) {
        if (entry.orgId === null) {
          newOrgNames.push(entry.excelName);
        } else {
          matchedOrgs.push({ name: entry.excelName, id: entry.orgId });
        }
      }

      setResolvedOrgMapping({ matchedOrgs, newOrgNames });

      const elevatorNumberList = [
        ...new Set(parseResult.elevators.map((e) => e.elevator_number)),
      ];
      const orgNames = [
        ...new Set(
          parseResult.elevators
            .map((e) => e._organisation_namn)
            .filter((n): n is string => !!n),
        ),
      ];

      setAnalysisArgs({ elevatorNumberList, orgNames });
      setStatus("preview");
    },
    [parseResult],
  );

  const handleConfirm = useCallback(async () => {
    if (!parseResult || !resolvedOrgMapping) return;

    setStatus("importing");
    setImportError(null);

    const orgIdByName = new Map<string, string>();
    const orgNameById = new Map<string, string>();
    for (const { name, id } of resolvedOrgMapping.matchedOrgs) {
      orgIdByName.set(name, id);
      orgNameById.set(id, name);
    }

    const elevatorsWithOrgId = parseResult.elevators.map((e) => ({
      ...e,
      _organizationId: orgIdByName.get(e._organisation_namn ?? "") ?? "",
    }));

    const unresolved = elevatorsWithOrgId.filter((e) => !e._organizationId);
    if (unresolved.length > 0) {
      setImportResult(null);
      setParseError(
        `${unresolved.length} rader saknar organisationskoppling. Gå tillbaka och mappa alla organisationer.`,
      );
      setStatus("org-mapping");
      return;
    }

    const total = elevatorsWithOrgId.length;
    setImportProgress({ current: 0, total });

    let totalCreated = 0;
    const allFailures: ImportFailure[] = [];
    const aggregatedPerOrg: Record<
      string,
      { orgName: string; created: number }
    > = {};

    // Sequential chunks: parallel requests would blow through the DB
    // connection limit and interleave savepoints in ways that aren't worth
    // the few hundred ms of wall time on the import path.
    for (let i = 0; i < total; i += IMPORT_CHUNK_SIZE) {
      const chunk = elevatorsWithOrgId.slice(i, i + IMPORT_CHUNK_SIZE);
      try {
        const result = await confirmImport({ data: { elevators: chunk } });
        totalCreated += result.created;
        if (result.failures.length > 0) allFailures.push(...result.failures);
        for (const [orgId, counts] of Object.entries(result.perOrgCounts)) {
          if (!aggregatedPerOrg[orgId]) {
            aggregatedPerOrg[orgId] = {
              orgName: counts.orgName || orgNameById.get(orgId) || orgId,
              created: 0,
            };
          }
          aggregatedPerOrg[orgId]!.created += counts.created;
        }
      } catch (e) {
        // The chunk itself threw — network issue, auth, schema bug. Record
        // every row in the chunk as failed so the admin still sees which
        // rows didn't make it, then stop (whatever killed this chunk will
        // likely kill the next one too).
        const reason =
          e instanceof Error
            ? e.message
            : "Okänt fel — anslutningen till servern kan ha brutits.";
        for (const row of chunk) {
          allFailures.push({
            elevator_number: row.elevator_number,
            sheet: row._source_sheet ?? null,
            row: row._source_row ?? null,
            reason,
          });
        }
        setImportProgress({ current: i + chunk.length, total });
        setImportResult({
          created: totalCreated,
          total,
          failures: allFailures,
          perOrgCounts: aggregatedPerOrg,
        });
        setImportError(reason);
        setStatus("error");
        return;
      }
      setImportProgress({ current: i + chunk.length, total });
    }

    setImportResult({
      created: totalCreated,
      total,
      failures: allFailures,
      perOrgCounts: aggregatedPerOrg,
    });
    setStatus("complete");
  }, [parseResult, resolvedOrgMapping]);

  const handleBackToUpload = useCallback(() => {
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
    setResolvedOrgMapping(null);
    setImportError(null);
    workbookRef.current = null;
  }, []);

  const handleBackToSheetSelection = useCallback(() => {
    // Preserve workbook, sheet selection, and per-sheet mappings so the
    // admin can advance again without redoing work (FR-22, US-018). Only
    // the transient step-local view state is reset.
    setStatus("sheet-selection");
    setAutoMapResult(null);
    setSheetData([]);
    setCurrentSheetIndex(0);
  }, []);

  const handleBackToMapping = useCallback(() => {
    // Re-enter column mapping at the LAST sheet the admin confirmed before
    // advancing to org-mapping — advancing forward walks through every sheet
    // in order, so the final one is where they left off. Previously this
    // reset to index 0 which forced the admin to click "Nästa ark" through
    // every already-mapped sheet again (US-018, UX polish). The per-sheet
    // mappings in `sheetMappings` already persist, so only the index is
    // restored here; previously confirmed mappings are passed as inherited
    // defaults. parseResult and resolvedOrgMapping are preserved so Back
    // from preview later still restores selections.
    if (selectedSheets.length === 0) return;
    const lastIndex = selectedSheets.length - 1;
    const lastSheet = selectedSheets[lastIndex];

    const existing = sheetMappings.get(lastSheet);
    setCurrentSheetIndex(lastIndex);
    if (
      loadSheetForMapping(
        lastSheet,
        existing?.mappings,
        existing?.headerRowIndex,
      )
    ) {
      setStatus("mapping");
    }
  }, [selectedSheets, sheetMappings, loadSheetForMapping]);

  const handleBackToOrgMapping = useCallback(() => {
    // Preserve parseResult + resolvedOrgMapping so the admin sees the
    // previously resolved org mappings; only drop the analysis result so it
    // is re-fetched when advancing to preview again.
    setAnalysisArgs(null);
    setStatus("org-mapping");
  }, []);

  const handleReset = handleBackToUpload;

  // Previously confirmed org-mapping entries reconstructed so the
  // org-mapping step can restore selections when the admin returns via Back.
  const priorOrgMappingEntries = useMemo<OrgMappingEntry[] | undefined>(() => {
    if (!resolvedOrgMapping) return undefined;
    const entries: OrgMappingEntry[] = [];
    for (const { name, id } of resolvedOrgMapping.matchedOrgs) {
      entries.push({ excelName: name, orgId: id });
    }
    for (const name of resolvedOrgMapping.newOrgNames) {
      entries.push({ excelName: name, orgId: null });
    }
    return entries;
  }, [resolvedOrgMapping]);

  return {
    status,
    importProgress,
    parseResult,
    fileName,
    parseError,
    importError,
    importResult,
    analysis,
    autoMapResult,
    sheetData,
    sheetInfos,
    selectedSheets,
    currentSheetIndex,
    sheetMappings,
    extractedOrgData,
    resolvedOrgMapping,
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
  };
}
