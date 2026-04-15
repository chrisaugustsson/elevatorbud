import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Checkbox } from "@elevatorbud/ui/components/ui/checkbox";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import type { SheetInfo } from "@elevatorbud/utils";

export function SheetSelectionSection({
  sheetInfos,
  defaultSelected,
  onConfirm,
  onBack,
  headingRef,
}: {
  sheetInfos: SheetInfo[];
  defaultSelected: string[];
  onConfirm: (selectedSheets: string[]) => void;
  onBack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected),
  );

  const toggleSheet = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sheetInfos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sheetInfos.map((s) => s.name)));
    }
  };

  const allSelectedEmpty = selected.size > 0 && [...selected].every(
    (name) => sheetInfos.find((s) => s.name === name)?.rowCount === 0,
  );
  const canProceed = selected.size > 0 && !allSelectedEmpty;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" ref={headingRef} tabIndex={-1}>
          <FileSpreadsheet className="h-5 w-5" />
          Välj ark att importera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sheetInfos.length > 1 && (
          <div className="flex min-h-11 items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selected.size === sheetInfos.length}
              onCheckedChange={toggleAll}
              className="size-5"
            />
            <label
              htmlFor="select-all"
              className="flex min-h-11 flex-1 cursor-pointer items-center text-sm font-medium"
            >
              Markera alla
            </label>
          </div>
        )}

        <div className="space-y-2">
          {sheetInfos.map((sheet) => {
            const isEmpty = sheet.rowCount === 0;
            return (
              <label
                key={sheet.name}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(sheet.name)}
                  onCheckedChange={() => toggleSheet(sheet.name)}
                  className="mt-0.5 size-5"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sheet.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {sheet.rowCount} {sheet.rowCount === 1 ? "rad" : "rader"}
                    </Badge>
                    {isEmpty && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        Inga datarader
                      </span>
                    )}
                  </div>
                  {sheet.firstRowPreview.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {sheet.firstRowPreview
                        .filter((v) => v.trim())
                        .slice(0, 8)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {allSelectedEmpty && (
          <div
            className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Alla valda ark saknar datarader. Välj minst ett ark som innehåller data.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onBack}>
            Tillbaka
          </Button>
          <Button
            disabled={!canProceed}
            onClick={() => onConfirm([...selected])}
          >
            Nästa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
