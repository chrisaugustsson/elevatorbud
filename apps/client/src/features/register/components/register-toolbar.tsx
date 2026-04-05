import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import {
  Search,
  X,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

interface RegisterToolbarProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  exportRequested: "csv" | "xlsx" | null;
  onExport: (format: "csv" | "xlsx") => void;
}

export function RegisterToolbar({
  totalCount,
  search,
  onSearchChange,
  exportRequested,
  onExport,
}: RegisterToolbarProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Register</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} hissar i registret
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={totalCount === 0}>
              <Download className="mr-1.5 size-4" />
              Exportera
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={exportRequested === "csv"}
              onClick={() => onExport("csv")}
            >
              <FileText className="mr-2 size-4" />
              {exportRequested === "csv" ? "Laddar..." : "CSV"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={exportRequested === "xlsx"}
              onClick={() => onExport("xlsx")}
            >
              <FileSpreadsheet className="mr-2 size-4" />
              {exportRequested === "xlsx" ? "Laddar..." : "Excel (.xlsx)"}
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Sök hissnummer, adress, distrikt..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            onClick={() => onSearchChange("")}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </>
  );
}
