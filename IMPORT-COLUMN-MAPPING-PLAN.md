# Import Column Mapping — Implementation Plan

## Goal

Support importing Excel files with different column naming/ordering. Auto-map columns when header names match known patterns, let the user manually map unmatched columns via a UI.

## Design Decisions

- **Scope:** Hissar sheet only (Nodtelefoner and Rivna hissar keep existing behavior)
- **Header row:** Can be on any row — auto-detected by scanning first 10 rows for best match
- **Saved profiles:** No — one-off mapping per import
- **Mandatory fields:** Warn only, don't block import

## New Import Flow

```
upload → detect headers & auto-map → mapping UI → parse with confirmed mapping → preview → import
```

Compared to old flow:
```
upload → parse (hardcoded positions) → preview → import
```

## Architecture

### New files (in `packages/utils/src/excel-import/`)

| File | Purpose | Status |
|------|---------|--------|
| `header-aliases.ts` | Known Swedish header → field+parser mappings. Also exports `TARGET_FIELDS` (all possible target fields for the UI dropdown) | DONE |
| `auto-mapper.ts` | `detectHeaderRow()` — scans first N rows, scores each against aliases. `autoMapColumns()` — matches headers to fields. `autoMapSheet()` — full pipeline. `getSheetData()` — raw sheet data helper | DONE |
| `parse-excel-import-with-mapping.ts` | `parseExcelImportWithMapping()` — like `parseExcelImport()` but uses mapping-based parser for Hissar. Includes local `joinEmergencyPhones` to avoid circular import | DONE |

### Modified files

| File | Changes | Status |
|------|---------|--------|
| `types.ts` | Added `HeaderAlias`, `ColumnMapping`, `AutoMapResult` types | DONE |
| `parse-elevator-sheet.ts` | Added `parseElevatorSheetWithMapping()` — same parsing logic but uses `ColumnMapping[]` instead of hardcoded `ELEVATOR_COLUMNS` positions | DONE |
| `index.ts` (excel-import) | Exports new functions and types | DONE |
| `index.ts` (utils root) | Exports new functions and types | DONE |
| `admin.import.tsx` | Rewritten with new `"mapping"` step + `ColumnMappingSection` component | DONE |

## What's left: admin.import.tsx

The import page needs a new `mapping` step between upload and preview. Current state: imports were updated but the component body is broken because the old `parseExcelImport` call was removed without replacing it.

### Changes needed in admin.import.tsx

1. **Add state:** `ImportStatus` gets new `"mapping"` step. New state for `workbook` (XLSX.WorkBook ref), `autoMapResult` (AutoMapResult), `confirmedMappings` (ColumnMapping[]).

2. **Update `handleFileSelect`:** Instead of calling `parseExcelImport()`, call `readWorkbook()` + `autoMapSheet()`. Store workbook in ref, autoMapResult in state. Go to `"mapping"` status.

3. **New `ColumnMappingSection` component:**
   - Header row selector (number input, re-runs auto-map when changed)
   - Table of source columns → target field dropdowns
   - Auto-matched columns shown with green check / badge
   - Unmatched columns shown with yellow indicator
   - Missing mandatory fields warning at top
   - Sample data preview (first 2-3 cell values per column)
   - "Confirm mapping" button

4. **New `handleMappingConfirm`:** Takes confirmed mappings, calls `parseElevatorSheetWithMapping()` for Hissar, keeps existing `parseEmergencyPhoneSheet()` / `parseDemolishedSheet()` for other sheets, joins them together into `FullImportResult`, continues to preview.

5. **Fix icon rename:** `Upload` → `UploadIcon` in JSX (2 places).

6. **Remove `import type * as XLSX`** — not needed, just use the workbook ref as `ReturnType<typeof readWorkbook>`.

### ColumnMappingSection component sketch

```tsx
function ColumnMappingSection({
  autoMapResult,
  sheetData,        // raw data for sample preview
  onConfirm,        // (mappings: ColumnMapping[]) => void
  onHeaderRowChange, // (rowIndex: number) => void
  onCancel,
}: { ... }) {
  // Local state: copy of mappings the user can edit
  const [mappings, setMappings] = useState(autoMapResult.mapped);

  // For each unmapped index, track if user assigned a field
  const [manualMappings, setManualMappings] = useState<Record<number, string>>({});

  // Render:
  // 1. Header row selector
  // 2. Stats bar: "X/Y kolumner matchade automatiskt"
  // 3. Missing mandatory warning
  // 4. Table with columns:
  //    - Source header (from file)
  //    - Sample values (first 2 data rows)
  //    - Target field (dropdown from TARGET_FIELDS, pre-selected if auto-matched)
  //    - Status badge (auto/manual/unmapped)
  // 5. Confirm + Cancel buttons
}
```

### Key type: ColumnMapping

```ts
type ColumnMapping = {
  sourceIndex: number;
  sourceHeader: string;
  field: string;        // target field or "_skip"
  parser?: string;      // from TARGET_FIELDS lookup
  autoMatched: boolean;
};
```

## How auto-mapping works

1. `detectHeaderRow(data)` — scores each of first 10 rows by counting cells that match `HEADER_ALIASES` (normalized lowercase comparison). Returns row with highest score.

2. `autoMapColumns(headers, headerRowIndex)` — for each non-empty header, tries to find a matching alias. Uses `Set` to prevent duplicate field assignments. Returns matched + unmapped indices + missing mandatory fields + confidence score.

3. The UI shows results and lets user fix unmapped columns via dropdowns.

4. On confirm, all mappings (auto + manual) are passed to `parseElevatorSheetWithMapping()`.
