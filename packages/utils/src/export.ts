import * as XLSX from "xlsx";

export type ExportColumn = {
  key: string;
  label: string;
};

export const HISSAR_EXPORT_COLUMNS: ExportColumn[] = [
  { key: "hissnummer", label: "Hissnummer" },
  { key: "adress", label: "Adress" },
  { key: "distrikt", label: "Distrikt" },
  { key: "organisationsnamn", label: "Organisation" },
  { key: "hisstyp", label: "Hisstyp" },
  { key: "fabrikat", label: "Fabrikat" },
  { key: "byggar", label: "Byggår" },
  { key: "hissbeteckning", label: "Hissbeteckning" },
  { key: "hastighet", label: "Hastighet" },
  { key: "lyfthojd", label: "Lyfthöjd" },
  { key: "marklast", label: "Marklast" },
  { key: "antal_plan", label: "Antal plan" },
  { key: "antal_dorrar", label: "Antal dörrar" },
  { key: "typ_dorrar", label: "Typ dörrar" },
  { key: "genomgang", label: "Genomgång" },
  { key: "kollektiv", label: "Kollektiv" },
  { key: "korgstorlek", label: "Korgstorlek" },
  { key: "dagoppning", label: "Dagöppning" },
  { key: "barbeslag", label: "Bärbeslag" },
  { key: "dorrmaskin", label: "Dörrmaskin" },
  { key: "drivsystem", label: "Drivsystem" },
  { key: "upphangning", label: "Upphängning" },
  { key: "maskinplacering", label: "Maskinplacering" },
  { key: "typ_maskin", label: "Typ maskin" },
  { key: "typ_styrsystem", label: "Typ styrsystem" },
  { key: "besiktningsorgan", label: "Besiktningsorgan" },
  { key: "besiktningsmanad", label: "Besiktningsmånad" },
  { key: "skotselforetag", label: "Skötselföretag" },
  { key: "schaktbelysning", label: "Schaktbelysning" },
  { key: "moderniserar", label: "Moderniserad" },
  { key: "garanti", label: "Garanti" },
  { key: "rekommenderat_moderniserar", label: "Rek. modernisering" },
  { key: "budget_belopp", label: "Budget (kr)" },
  { key: "atgarder_vid_modernisering", label: "Åtgärder vid modernisering" },
  { key: "har_nodtelefon", label: "Har nödtelefon" },
  { key: "nodtelefon_modell", label: "Nödtelefon modell" },
  { key: "nodtelefon_typ", label: "Nödtelefon typ" },
  { key: "behover_uppgradering", label: "Behöver uppgradering" },
  { key: "nodtelefon_pris", label: "Nödtelefon pris (kr)" },
  { key: "kommentarer", label: "Kommentarer" },
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
  columns: ExportColumn[] = HISSAR_EXPORT_COLUMNS,
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
  columns: ExportColumn[] = HISSAR_EXPORT_COLUMNS,
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
  filename = "hissar-export.csv",
): void {
  const csv = generateCSV(data);
  // Add BOM for Excel to correctly detect UTF-8
  downloadFile("\uFEFF" + csv, filename, "text/csv;charset=utf-8");
}

export function downloadExcel(
  data: Record<string, unknown>[],
  filename = "hissar-export.xlsx",
): void {
  const buffer = generateExcel(data);
  downloadFile(
    buffer,
    filename,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
