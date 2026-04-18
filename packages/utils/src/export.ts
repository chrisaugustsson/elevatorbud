import * as XLSX from "xlsx";

export type ExportColumn = {
  key: string;
  label: string;
};

export const ELEVATOR_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "elevator_number", label: "Hissnummer" },
  { key: "address", label: "Adress" },
  { key: "district", label: "Distrikt" },
  { key: "organizationName", label: "Organisation" },
  { key: "elevator_type", label: "Hisstyp" },
  { key: "manufacturer", label: "Fabrikat" },
  { key: "build_year", label: "Byggår" },
  { key: "elevator_designation", label: "Hissbeteckning" },
  { key: "speed", label: "Hastighet (m/s)" },
  { key: "lift_height", label: "Lyfthöjd (m)" },
  { key: "load_capacity", label: "Märklast (kg)" },
  { key: "floor_count", label: "Antal plan" },
  { key: "door_count", label: "Antal dörrar" },
  { key: "door_type", label: "Typ dörrar" },
  { key: "passthrough", label: "Genomgång" },
  { key: "collective", label: "Kollektiv" },
  { key: "cab_size", label: "Korgstorlek" },
  { key: "daylight_opening", label: "Dagöppning" },
  { key: "grab_rail", label: "Bärbeslag" },
  { key: "door_machine", label: "Dörrmaskin" },
  { key: "drive_system", label: "Drivsystem" },
  { key: "suspension", label: "Upphängning" },
  { key: "machine_placement", label: "Maskinplacering" },
  { key: "machine_type", label: "Typ maskin" },
  { key: "control_system_type", label: "Typ styrsystem" },
  { key: "inspection_authority", label: "Besiktningsorgan" },
  { key: "inspection_month", label: "Besiktningsmånad" },
  { key: "maintenance_company", label: "Skötselföretag" },
  { key: "shaft_lighting", label: "Schaktbelysning" },
  { key: "modernization_year", label: "Moderniserad" },
  { key: "warranty", label: "Garanti" },
  { key: "recommended_modernization_year", label: "Rek. modernisering" },
  { key: "budget_amount", label: "Budget (kr)" },
  { key: "modernization_measures", label: "Åtgärder vid modernisering" },
  { key: "has_emergency_phone", label: "Har nödtelefon" },
  { key: "emergency_phone_model", label: "Nödtelefon modell" },
  { key: "emergency_phone_type", label: "Nödtelefon typ" },
  { key: "needs_upgrade", label: "Behöver uppgradering" },
  { key: "emergency_phone_price", label: "Nödtelefon pris (kr)" },
  { key: "comments", label: "Kommentarer" },
  { key: "status", label: "Status" },
];

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  return String(value);
}

function dataToRows(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): string[][] {
  const headers = columns.map((c) => c.label);
  const rows = data.map((item) =>
    columns.map((c) => formatValue(item[c.key])),
  );
  return [headers, ...rows];
}

export function generateCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[] = ELEVATOR_EXPORT_COLUMNS,
): string {
  const rows = dataToRows(data, columns);
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(","),
    )
    .join("\n");
}

export function generateExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[] = ELEVATOR_EXPORT_COLUMNS,
  sheetName = "Hissar",
): ArrayBuffer {
  const rows = dataToRows(data, columns);
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-size columns based on content
  const colWidths = columns.map((col, i) => {
    const maxLen = Math.max(
      col.label.length,
      ...data.map((item) => formatValue(item[col.key]).length),
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function downloadFile(
  content: string | ArrayBuffer,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(
  data: Record<string, unknown>[],
  filename = "elevators-export.csv",
): void {
  const csv = generateCSV(data);
  // Add BOM for Excel to correctly detect UTF-8
  downloadFile("\uFEFF" + csv, filename, "text/csv;charset=utf-8");
}

export function downloadExcel(
  data: Record<string, unknown>[],
  filename = "elevators-export.xlsx",
): void {
  const buffer = generateExcel(data);
  downloadFile(
    buffer,
    filename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
