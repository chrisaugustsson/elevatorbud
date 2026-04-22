import React, { useMemo, useState } from "react";
import {
  TARGET_FIELDS,
  slugifyHeader,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export type KnownCustomFieldDef = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "date";
  aliases?: string[] | null;
};

// Normalize a header/label string the same way the auto-mapper normalizes
// Excel headers. Shared helper so "Verksamhet" and " verksamhet " both
// match a def with label "Verksamhet".
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export function ColumnMappingSection({
  autoMapResult,
  sheetData,
  sheetName,
  sheetProgress,
  knownCustomFieldDefs = [],
  onConfirm,
  onHeaderRowChange,
  onBack,
  headingRef,
}: {
  autoMapResult: AutoMapResult;
  sheetData: unknown[][];
  sheetName?: string;
  sheetProgress?: { current: number; total: number };
  knownCustomFieldDefs?: KnownCustomFieldDef[];
  onConfirm: (mappings: ColumnMapping[]) => void;
  onHeaderRowChange: (rowIndex: number) => void;
  onBack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  // Pre-compute a lookup of every known (label + alias) → pinned
  // field identifier `_custom_field:{key}` so unmapped Excel headers
  // can be auto-promoted from "skip" to a known custom field on mount.
  const customFieldByAlias = useMemo(() => {
    const m = new Map<string, string>();
    for (const def of knownCustomFieldDefs) {
      const pinned = `_custom_field:${def.key}`;
      m.set(normalize(def.label), pinned);
      m.set(normalize(def.key), pinned);
      for (const alias of def.aliases ?? []) {
        m.set(normalize(alias), pinned);
      }
    }
    return m;
  }, [knownCustomFieldDefs]);

  // Track which columns were auto-promoted to a custom field (vs
  // structurally auto-mapped) so the Status column can show a distinct
  // badge. Computed alongside the initial fieldMap.
  const initial = useMemo(() => {
    const map: Record<number, string> = {};
    const autoCustom = new Set<number>();
    for (const m of autoMapResult.mapped) {
      map[m.sourceIndex] = m.field;
    }
    for (const idx of autoMapResult.unmappedIndices) {
      const header = autoMapResult.sourceHeaders[idx];
      const pinned = header
        ? customFieldByAlias.get(normalize(header))
        : undefined;
      if (pinned) {
        map[idx] = pinned;
        autoCustom.add(idx);
      } else {
        map[idx] = "_skip";
      }
    }
    return { map, autoCustom };
  }, [autoMapResult, customFieldByAlias]);

  const [fieldMap, setFieldMap] =
    useState<Record<number, string>>(initial.map);
  const [autoCustomIndices, setAutoCustomIndices] = useState<Set<number>>(
    initial.autoCustom,
  );

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

  // For the "used elsewhere" guard we only care about structurally
  // unique fields. `_custom_field` and `_custom_field:{key}` entries
  // are allowed to repeat — each column maps to its own slug.
  const usedStructuralFields = new Set(
    Object.values(fieldMap).filter(
      (f) => f !== "_skip" && !f.startsWith("_custom_field"),
    ),
  );

  const mandatoryTargets = TARGET_FIELDS.filter((t) => t.mandatory);
  const missingMandatory = mandatoryTargets.filter(
    (t) => !usedStructuralFields.has(t.field),
  );

  const handleFieldChange = (sourceIndex: number, newField: string) => {
    setFieldMap((prev) => ({ ...prev, [sourceIndex]: newField }));
    // User edited this row → no longer "auto (extrafält)" badge-eligible.
    if (autoCustomIndices.has(sourceIndex)) {
      setAutoCustomIndices((prev) => {
        const next = new Set(prev);
        next.delete(sourceIndex);
        return next;
      });
    }
  };

  const skipRowCount = useMemo(
    () => allColumns.filter((c) => (fieldMap[c.index] ?? "_skip") === "_skip")
      .length,
    [allColumns, fieldMap],
  );

  const markRestAsCustomFields = () => {
    let flipped = 0;
    setFieldMap((prev) => {
      const next = { ...prev };
      for (const col of allColumns) {
        if ((next[col.index] ?? "_skip") === "_skip") {
          next[col.index] = "_custom_field";
          flipped++;
        }
      }
      return next;
    });
    if (flipped > 0) {
      toast.success(
        `${flipped} kolumn${flipped === 1 ? "" : "er"} markerade som extrafält.`,
      );
    }
  };

  const handleConfirm = () => {
    const mappings: ColumnMapping[] = [];
    for (const col of allColumns) {
      const field = fieldMap[col.index];
      if (!field || field === "_skip") continue;

      // Pinned `_custom_field:{key}` isn't a TARGET_FIELDS entry, so
      // TARGET_FIELDS.find misses. No parser either — server resolves
      // the slug directly. Same for the bare `_custom_field` sentinel.
      const targetDef = TARGET_FIELDS.find((t) => t.field === field);
      const wasStructurallyAutoMatched = autoMapResult.mapped.some(
        (m) => m.sourceIndex === col.index && m.field === field,
      );

      mappings.push({
        sourceIndex: col.index,
        sourceHeader: col.header,
        field,
        parser: targetDef?.parser,
        // Custom-field auto promotions count as auto-matched too so the
        // admin doesn't see the "Manuell" badge on a row they never
        // touched.
        autoMatched:
          wasStructurallyAutoMatched || autoCustomIndices.has(col.index),
      });
    }
    onConfirm(mappings);
  };

  const matchedCount = autoMapResult.mapped.length;
  const autoCustomCount = autoCustomIndices.size;
  const totalColumns = allColumns.length;

  // Partition the known defs in the Select dropdown. Shown with the slug
  // label + aliases list as a tooltip so the admin knows what's in the
  // catalog.
  const sortedKnownDefs = useMemo(
    () =>
      [...knownCustomFieldDefs].sort((a, b) =>
        a.label.localeCompare(b.label, "sv"),
      ),
    [knownCustomFieldDefs],
  );

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

      {/* Stats + bulk action row */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">
          {matchedCount}/{totalColumns} kolumner matchade automatiskt
        </Badge>
        {autoCustomCount > 0 && (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-700 dark:text-amber-400"
            aria-label="Extrafält auto-matchade från katalogen"
          >
            <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
            {autoCustomCount} extrafält auto-matchade
          </Badge>
        )}
        {autoMapResult.confidence >= 0.8 && (
          <Badge
            variant="outline"
            className="text-emerald-700 dark:text-emerald-400"
            aria-label="Hög automatisk matchningsgrad"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
            Hög matchning
          </Badge>
        )}
        <div className="ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={markRestAsCustomFields}
            disabled={skipRowCount === 0 || missingMandatory.length > 0}
            title={
              missingMandatory.length > 0
                ? "Obligatoriska fält måste mappas först."
                : skipRowCount === 0
                  ? "Inga kolumner kvar att markera"
                  : undefined
            }
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Markera resten som extrafält
          </Button>
        </div>
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
            kolumner är förvalda. Kolumner markerade som{" "}
            <span className="font-medium">Extrafält</span> sparas på hissen
            under kolumnrubrikens namn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Kolumn i filen</TableHead>
                <TableHead className="w-[200px]">Exempelvärden</TableHead>
                <TableHead className="w-[240px]">Mappar till</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allColumns.map((col) => {
                const field = fieldMap[col.index] || "_skip";
                const isStructurallyAutoMatched = autoMapResult.mapped.some(
                  (m) => m.sourceIndex === col.index,
                );
                const isAutoCustomField = autoCustomIndices.has(col.index);
                const isManuallyMapped =
                  !isStructurallyAutoMatched &&
                  !isAutoCustomField &&
                  field !== "_skip";
                const samples = getSamples(col.index);
                // New-key preview for bare _custom_field (not pinned).
                const previewSlug =
                  field === "_custom_field"
                    ? slugifyHeader(col.header)
                    : null;

                return (
                  <TableRow key={col.index}>
                    <TableCell className="font-mono text-sm">
                      {col.header}
                      {previewSlug && (
                        <div className="mt-1 text-xs font-normal text-muted-foreground">
                          nyckel:{" "}
                          <span className="rounded bg-muted px-1 py-0.5 font-mono">
                            {previewSlug}
                          </span>
                        </div>
                      )}
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
                              usedStructuralFields.has(t.field) &&
                              t.field !== field &&
                              t.field !== "_skip" &&
                              !t.field.startsWith("_custom_field");
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
                          {sortedKnownDefs.length > 0 && (
                            <>
                              <SelectSeparator />
                              <SelectGroup>
                                <SelectLabel>Kända extrafält</SelectLabel>
                                {sortedKnownDefs.map((def) => (
                                  <SelectItem
                                    key={def.key}
                                    value={`_custom_field:${def.key}`}
                                  >
                                    {def.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {isStructurallyAutoMatched && (
                        <Badge
                          variant="secondary"
                          className="text-emerald-700 dark:text-emerald-400 text-xs"
                          aria-label="Automatiskt matchad kolumn"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                          Auto
                        </Badge>
                      )}
                      {isAutoCustomField && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs"
                          aria-label="Auto-matchad som extrafält"
                        >
                          <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                          Auto (extrafält)
                        </Badge>
                      )}
                      {isManuallyMapped && (
                        <Badge
                          variant="secondary"
                          className="text-sky-700 dark:text-sky-400 text-xs"
                          aria-label="Manuellt mappad kolumn"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                          Manuell
                        </Badge>
                      )}
                      {!isStructurallyAutoMatched &&
                        !isAutoCustomField &&
                        !isManuallyMapped && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground text-xs"
                            aria-label="Kolumn hoppas över"
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
