import type {
  ImportWarning,
  FullImportResult,
  ColumnMapping,
  SheetMappingConfig,
} from "./types";
import { parseElevatorSheetWithMapping } from "./parse-elevator-sheet";

export function parseExcelImportWithMapping(
  workbook: import("xlsx").WorkBook,
  mappingsOrConfigs: ColumnMapping[] | SheetMappingConfig[],
  headerRowIndex?: number,
): FullImportResult {
  const configs = isSheetMappingConfigs(mappingsOrConfigs)
    ? mappingsOrConfigs
    : [
        {
          sheetName: workbook.SheetNames.includes("Hissar")
            ? "Hissar"
            : workbook.SheetNames[0],
          mappings: mappingsOrConfigs,
          headerRowIndex: headerRowIndex ?? 0,
        },
      ];

  const allWarnings: ImportWarning[] = [];
  const allInvalidRows: { row: number; sheet: string; reason: string }[] = [];
  const allElevators: import("./types").ParsedElevator[] = [];
  let totalFound = 0;

  for (const config of configs) {
    if (!workbook.SheetNames.includes(config.sheetName)) continue;

    const result = parseElevatorSheetWithMapping(
      workbook,
      config.sheetName,
      config.mappings,
      config.headerRowIndex,
    );

    allElevators.push(...result.elevators);
    allWarnings.push(...result.warnings);
    allInvalidRows.push(
      ...result.invalidRows.map((r) => ({ ...r, sheet: config.sheetName })),
    );
    totalFound += result.elevators.length;
  }

  return {
    elevators: allElevators,
    warnings: allWarnings,
    invalidRows: allInvalidRows,
    sheets: {
      elevators: { found: configs.length > 0, count: totalFound },
    },
  };
}

function isSheetMappingConfigs(
  input: ColumnMapping[] | SheetMappingConfig[],
): input is SheetMappingConfig[] {
  return input.length > 0 && "sheetName" in input[0];
}
