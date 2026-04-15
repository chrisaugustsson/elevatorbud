import React, { useState } from "react";
import {
  TARGET_FIELDS,
  type AutoMapResult,
  type ColumnMapping,
} from "@elevatorbud/utils";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@elevatorbud/ui/components/ui/card";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function ColumnMappingSection({
  autoMapResult,
  sheetData,
  sheetName,
  sheetProgress,
  onConfirm,
  onHeaderRowChange,
  onBack,
  headingRef,
}: {
  autoMapResult: AutoMapResult;
  sheetData: unknown[][];
  sheetName?: string;
  sheetProgress?: { current: number; total: number };
  onConfirm: (mappings: ColumnMapping[]) => void;
  onHeaderRowChange: (rowIndex: number) => void;
  onBack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  // Build initial field map: sourceIndex -> field
  const [fieldMap, setFieldMap] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const m of autoMapResult.mapped) {
      map[m.sourceIndex] = m.field;
    }
    for (const idx of autoMapResult.unmappedIndices) {
      map[idx] = "_skip";
    }
    return map;
  });

  // All non-empty source columns
  const allColumns = autoMapResult.sourceHeaders
    .map((h, i) => ({ index: i, header: h }))
    .filter((c) => c.header && c.header.trim());

  const getSamples = (colIndex: number): string[] => {
    const startRow = autoMapResult.headerRowIndex + 1;
    const samples: string[] = [];
    for (let i = startRow; i < Math.min(startRow + 3, sheetData.length); i++) {
      const row = sheetData[i];
      if (row) {
        const val = String((row as unknown[])[colIndex] || "").trim();
        if (val) samples.push(val);
      }
    }
    return samples;
  };

  const usedFields = new Set(
    Object.values(fieldMap).filter((f) => f !== "_skip"),
  );

  const mandatoryTargets = TARGET_FIELDS.filter((t) => t.mandatory);
  const missingMandatory = mandatoryTargets.filter(
    (t) => !usedFields.has(t.field),
  );

  const handleFieldChange = (sourceIndex: number, newField: string) => {
    setFieldMap((prev) => ({ ...prev, [sourceIndex]: newField }));
  };

  const handleConfirm = () => {
    const mappings: ColumnMapping[] = [];
    for (const col of allColumns) {
      const field = fieldMap[col.index];
      if (!field || field === "_skip") continue;

      const targetDef = TARGET_FIELDS.find((t) => t.field === field);
      const wasAutoMatched = autoMapResult.mapped.some(
        (m) => m.sourceIndex === col.index && m.field === field,
      );

      mappings.push({
        sourceIndex: col.index,
        sourceHeader: col.header,
        field,
        parser: targetDef?.parser,
        autoMatched: wasAutoMatched,
      });
    }
    onConfirm(mappings);
  };

  const matchedCount = autoMapResult.mapped.length;
  const totalColumns = allColumns.length;

  return (
    <div className="space-y-4">
      {/* Sheet progress indicator */}
      {sheetProgress && sheetProgress.total > 1 && (
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm font-medium">
            Ark {sheetProgress.current} av {sheetProgress.total}
            {sheetName ? `: ${sheetName}` : ""}
          </Badge>
          <div className="flex gap-1">
            {Array.from({ length: sheetProgress.total }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full ${
                  i < sheetProgress.current - 1
                    ? "bg-primary"
                    : i === sheetProgress.current - 1
                      ? "bg-primary/60"
                      : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header row selector */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Label htmlFor="header-row">Rubrikrad</Label>
          <Input
            id="header-row"
            type="number"
            min={1}
            max={Math.min(10, sheetData.length)}
            defaultValue={autoMapResult.headerRowIndex + 1}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= sheetData.length) {
                onHeaderRowChange(val - 1);
              }
            }}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">
            (radnummer i Excel)
          </span>
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          {matchedCount}/{totalColumns} kolumner matchade automatiskt
        </Badge>
        {autoMapResult.confidence >= 0.8 && (
          <Badge
            variant="outline"
            className="text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
            Hög matchning
          </Badge>
        )}
      </div>

      {/* Missing mandatory warning — role=alert + assertive so
          screen readers announce the hard-failure state immediately. */}
      {missingMandatory.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 text-destructive"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-destructive">
                Obligatoriska fält saknar mappning
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {missingMandatory.map((t) => (
                  <Badge
                    key={t.field}
                    variant="destructive"
                    className="text-xs"
                  >
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base" ref={headingRef} tabIndex={-1}>
            Kolumnmappning
            {sheetProgress && sheetProgress.total > 1 && (
              <span className="sr-only">
                {" "}— Steg 3 av 5. Ark {sheetProgress.current} av {sheetProgress.total}
                {sheetName ? `: ${sheetName}` : ""}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Koppla kolumner i filen till rätt fält. Automatiskt matchade
            kolumner är förvalda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Kolumn i filen</TableHead>
                <TableHead className="w-[200px]">Exempelvärden</TableHead>
                <TableHead className="w-[220px]">Mappar till</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allColumns.map((col) => {
                const field = fieldMap[col.index] || "_skip";
                const isAutoMatched = autoMapResult.mapped.some(
                  (m) => m.sourceIndex === col.index,
                );
                const isManuallyMapped = !isAutoMatched && field !== "_skip";
                const samples = getSamples(col.index);

                return (
                  <TableRow key={col.index}>
                    <TableCell className="font-mono text-sm">
                      {col.header}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {samples.length > 0
                          ? samples.map((s, i) => (
                              <span key={i}>
                                {i > 0 && ", "}
                                <span className="rounded bg-muted px-1 py-0.5">
                                  {s.length > 30 ? s.slice(0, 30) + "..." : s}
                                </span>
                              </span>
                            ))
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={field}
                        onValueChange={(val) =>
                          handleFieldChange(col.index, val)
                        }
                      >
                        <SelectTrigger size="sm" className="w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_FIELDS.map((t) => {
                            const isUsedElsewhere =
                              usedFields.has(t.field) &&
                              t.field !== field &&
                              t.field !== "_skip";
                            return (
                              <SelectItem
                                key={t.field}
                                value={t.field}
                                disabled={isUsedElsewhere}
                              >
                                {t.label}
                                {t.mandatory ? " *" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isAutoMatched && (
                        <Badge
                          variant="secondary"
                          className="text-emerald-700 dark:text-emerald-400 text-xs"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                          Auto
                        </Badge>
                      )}
                      {isManuallyMapped && (
                        <Badge
                          variant="secondary"
                          className="text-sky-700 dark:text-sky-400 text-xs"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                          Manuell
                        </Badge>
                      )}
                      {!isAutoMatched && !isManuallyMapped && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground text-xs"
                        >
                          — Hoppas över
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Tillbaka
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={missingMandatory.length > 0}
        >
          {sheetProgress && sheetProgress.current < sheetProgress.total
            ? "Nästa ark"
            : "Bekräfta mappning"}
        </Button>
      </div>
    </div>
  );
}
