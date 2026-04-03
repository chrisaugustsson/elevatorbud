import { useState, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  readWorkbook,
  parseExcelImport,
  type FullImportResult,
} from "@elevatorbud/utils";

export type AnalysisResult = {
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

export type ImportResult = {
  created: number;
  updated: number;
  errors: { elevator_number: string; error: string }[];
  orgsCreated: string[];
  emailSent?: boolean;
};

export type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "complete";

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
  }, []);

  return {
    status,
    parseResult,
    fileName,
    parseError,
    importResult,
    analysis,
    handleFileSelect,
    handleConfirm,
    handleReset,
  };
}
