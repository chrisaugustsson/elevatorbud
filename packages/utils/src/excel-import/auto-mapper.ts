import * as XLSX from "xlsx";
import type { AutoMapResult, ColumnMapping, HeaderAlias } from "./types";
import { HEADER_ALIASES, TARGET_FIELDS } from "./header-aliases";

/** Normalize a header string for matching: lowercase, trim, collapse whitespace */
function normalize(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Score a row as a potential header row by counting how many cells
 * match known header aliases.
 */
function scoreRow(row: unknown[], aliases: HeaderAlias[]): number {
  let matches = 0;
  const normalizedAliases = new Set(aliases.map((a) => a.header));

  for (const cell of row) {
    if (!cell) continue;
    const normalized = normalize(String(cell));
    if (normalized && normalizedAliases.has(normalized)) {
      matches++;
    }
  }
  return matches;
}

/**
 * Detect which row contains headers by scanning the first N rows
 * and finding the one with the most alias matches.
 */
export function detectHeaderRow(
  sheetData: unknown[][],
  maxRowsToScan = 10,
): { rowIndex: number; score: number } {
  let bestRow = 0;
  let bestScore = 0;

  const rowsToScan = Math.min(maxRowsToScan, sheetData.length);
  for (let i = 0; i < rowsToScan; i++) {
    const row = sheetData[i];
    if (!row) continue;
    const score = scoreRow(row, HEADER_ALIASES);
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }

  return { rowIndex: bestRow, score: bestScore };
}

/**
 * Try to auto-map source headers to target fields using known aliases.
 * Returns matched mappings + unmatched indices + missing mandatory fields.
 */
export function autoMapColumns(
  sourceHeaders: string[],
  headerRowIndex: number,
): AutoMapResult {
  const mapped: ColumnMapping[] = [];
  const unmappedIndices: number[] = [];
  const usedFields = new Set<string>();

  for (let i = 0; i < sourceHeaders.length; i++) {
    const raw = sourceHeaders[i];
    if (!raw || !raw.trim()) {
      // Empty header — skip silently
      continue;
    }

    const normalized = normalize(raw);
    const alias = HEADER_ALIASES.find(
      (a) => a.header === normalized && !usedFields.has(a.field),
    );

    if (alias) {
      mapped.push({
        sourceIndex: i,
        sourceHeader: raw,
        field: alias.field,
        parser: alias.parser,
        autoMatched: true,
      });
      usedFields.add(alias.field);
    } else {
      unmappedIndices.push(i);
    }
  }

  // Check which mandatory fields are missing
  const mandatoryFields = TARGET_FIELDS.filter((t) => t.mandatory).map(
    (t) => t.field,
  );
  const missingMandatory = mandatoryFields.filter((f) => !usedFields.has(f));

  // Confidence = matched / total non-empty headers
  const nonEmptyHeaders = sourceHeaders.filter(
    (h) => h && h.trim().length > 0,
  ).length;
  const confidence =
    nonEmptyHeaders > 0 ? mapped.length / nonEmptyHeaders : 0;

  return {
    headerRowIndex,
    sourceHeaders,
    mapped,
    unmappedIndices,
    missingMandatory,
    confidence,
  };
}

/**
 * Read raw sheet data as array of arrays from a workbook sheet.
 */
export function getSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string,
): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

/**
 * Full auto-map pipeline: detect header row, extract headers, auto-map.
 */
export function autoMapSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
): AutoMapResult | null {
  const data = getSheetData(workbook, sheetName);
  if (data.length === 0) return null;

  const { rowIndex, score } = detectHeaderRow(data);

  // If we matched fewer than 3 headers, the detection is unreliable
  if (score < 3) {
    // Fall back to row 0 and let user pick
    const headers = (data[0] || []).map((cell) => String(cell || ""));
    return autoMapColumns(headers, 0);
  }

  const headerRow = data[rowIndex] || [];
  const headers = headerRow.map((cell) => String(cell || ""));
  return autoMapColumns(headers, rowIndex);
}
