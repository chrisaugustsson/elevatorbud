import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
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

export type ImportResult = {
  created: number;
  updated: number;
  errors: { elevator_number: string; error: string }[];
  orgsCreated: string[];
  emailSent?: boolean;
};

export type ImportStatus =
  | "idle"
  | "parsing"
  | "mapping"
  | "preview"
  | "importing"
  | "complete";

export function useImportMachine() {
  const [status, setStatus] = useState<ImportStatus>("idle");
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

  const confirmImport = useAction(api.imports.confirm);
  const { data: currentUser } = useQuery({
    ...convexQuery(api.users.me, {}),
  }) as { data: { email?: string } | undefined };

  const { data: analysis } = useQuery({
    ...convexQuery(
      api.imports.analyze,
      analysisArgs ?? "skip",
    ),
  }) as { data: AnalysisResult | undefined };

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
    try {
      const result = await confirmImport({
        elevators: parseResult.combined as any,
        existingOrgMatchNames: analysis.orgMatchNames,
        existingOrgMatchIds: analysis.orgMatchIds,
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
    setAutoMapResult(null);
    setSheetData([]);
    workbookRef.current = null;
  }, []);

  return {
    status,
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
