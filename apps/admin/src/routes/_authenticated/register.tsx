import { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSelectedOrg } from "../../shared/lib/org-context";
import { downloadCSV, downloadExcel } from "@elevatorbud/utils/export";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import { SortHeader } from "@elevatorbud/ui/components/ui/sort-header";
import { MultiSelectFilter } from "@elevatorbud/ui/components/ui/multi-select-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Search,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/register")({
  component: Register,
});

type HissRow = {
  _id: string;
  elevator_number: string;
  address?: string;
  district?: string;
  elevator_type?: string;
  manufacturer?: string;
  build_year?: number;
  modernization_year?: string;
  recommended_modernization_year?: string;
  budget_amount?: number;
  organizationName: string;
};

type ListResult = {
  data: HissRow[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

type SuggestedValueItem = {
  _id: string;
  category: string;
  value: string;
  active: boolean;
};

function getSortDirection(
  sorting: SortingState,
  field: string,
): "asc" | "desc" | null {
  const s = sorting.find((s) => s.id === field);
  return s ? (s.desc ? "desc" : "asc") : null;
}

function Register() {
  const { selectedOrgId } = useSelectedOrg();

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sort state (server-side)
  const [sorting, setSorting] = useState<SortingState>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);

  // Multi-select filter state
  const [filterDistrict, setFilterDistrict] = useState<string[]>([]);
  const [filterElevatorType, setFilterElevatorType] = useState<string[]>([]);
  const [filterManufacturer, setFilterManufacturer] = useState<string[]>([]);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Range filter
  const [buildYearMin, setBuildYearMin] = useState("");
  const [buildYearMax, setBuildYearMax] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    filterDistrict,
    filterElevatorType,
    filterManufacturer,
    buildYearMin,
    buildYearMax,
    selectedOrgId,
    statusFilter,
  ]);

  // Get filter options from suggestedValues
  const allSuggestions = useQuery(api.suggestedValues.list, {});
  const filterOptions = useMemo(() => {
    if (!allSuggestions) return null;
    const active = (allSuggestions as SuggestedValueItem[]).filter((s) => s.active);
    const byCategory = (cat: string) =>
      active
        .filter((s) => s.category === cat)
        .map((s) => s.value)
        .sort((a, b) => a.localeCompare(b, "sv"));
    return {
      district: byCategory("district"),
      elevator_type: byCategory("elevator_type"),
      manufacturer: byCategory("manufacturer"),
    };
  }, [allSuggestions]);

  // Build query args
  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const filterBaseArgs = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filterDistrict.length > 0 ? { district: filterDistrict } : {}),
    ...(filterElevatorType.length > 0 ? { elevator_type: filterElevatorType } : {}),
    ...(filterManufacturer.length > 0 ? { manufacturer: filterManufacturer } : {}),
    ...(buildYearMin && !isNaN(parseInt(buildYearMin))
      ? { buildYearMin: parseInt(buildYearMin) }
      : {}),
    ...(buildYearMax && !isNaN(parseInt(buildYearMax))
      ? { buildYearMax: parseInt(buildYearMax) }
      : {}),
    ...(selectedOrgId ? { organization_id: selectedOrgId } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const queryArgs = {
    ...filterBaseArgs,
    ...(sortField ? { sort: sortField } : {}),
    ...(sortOrder ? { order: sortOrder } : {}),
    page,
    limit,
  } as never;

  const result = useQuery(api.elevators.listing.list, queryArgs) as
    | ListResult
    | undefined;

  // Export data query — fetches all matching records (no pagination)
  const [exportRequested, setExportRequested] = useState<
    "csv" | "xlsx" | null
  >(null);
  const exportArgs = exportRequested ? (filterBaseArgs as never) : "skip";
  const exportData = useQuery(
    api.elevators.listing.exportData,
    exportArgs as never,
  ) as Record<string, unknown>[] | undefined;

  const handleExport = useCallback(
    (format: "csv" | "xlsx") => {
      setExportRequested(format);
    },
    [],
  );

  // Trigger download when export data arrives
  useEffect(() => {
    if (!exportRequested || !exportData) return;
    const timestamp = new Date().toISOString().slice(0, 10);
    if (exportRequested === "csv") {
      downloadCSV(exportData, `elevators-${timestamp}.csv`);
    } else {
      downloadExcel(exportData, `elevators-${timestamp}.xlsx`);
    }
    setExportRequested(null);
  }, [exportData, exportRequested]);

  const hasActiveFilters =
    filterDistrict.length > 0 ||
    filterElevatorType.length > 0 ||
    filterManufacturer.length > 0 ||
    buildYearMin !== "" ||
    buildYearMax !== "" ||
    statusFilter !== "active";

  function clearAllFilters() {
    setFilterDistrict([]);
    setFilterElevatorType([]);
    setFilterManufacturer([]);
    setBuildYearMin("");
    setBuildYearMax("");
    setStatusFilter("active");
  }

  function handleSort(field: string) {
    setSorting((prev) => {
      const existing = prev.find((s) => s.id === field);
      if (!existing) return [{ id: field, desc: false }];
      if (!existing.desc) return [{ id: field, desc: true }];
      return [];
    });
  }

  const columnHelper = createColumnHelper<HissRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("elevator_number", {
        header: () => (
          <SortHeader
            label="Hissnummer"
            sortDirection={getSortDirection(sorting, "elevator_number")}
            onSort={() => handleSort("elevator_number")}
          />
        ),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("address", {
        header: () => (
          <SortHeader
            label="Adress"
            sortDirection={getSortDirection(sorting, "address")}
            onSort={() => handleSort("address")}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("district", {
        header: () => (
          <SortHeader
            label="Distrikt"
            sortDirection={getSortDirection(sorting, "district")}
            onSort={() => handleSort("district")}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("elevator_type", {
        header: () => (
          <SortHeader
            label="Hisstyp"
            sortDirection={getSortDirection(sorting, "elevator_type")}
            onSort={() => handleSort("elevator_type")}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("manufacturer", {
        header: () => (
          <SortHeader
            label="Fabrikat"
            sortDirection={getSortDirection(sorting, "manufacturer")}
            onSort={() => handleSort("manufacturer")}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("build_year", {
        header: () => (
          <SortHeader
            label="Byggår"
            sortDirection={getSortDirection(sorting, "build_year")}
            onSort={() => handleSort("build_year")}
          />
        ),
        cell: (info) => info.getValue() ?? "\u2014",
      }),
      columnHelper.accessor("modernization_year", {
        header: () => (
          <SortHeader
            label="Moderniserad"
            sortDirection={getSortDirection(sorting, "modernization_year")}
            onSort={() => handleSort("modernization_year")}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("recommended_modernization_year", {
        header: () => (
          <SortHeader
            label="Rek. modern."
            sortDirection={getSortDirection(sorting, "recommended_modernization_year")}
            onSort={() => handleSort("recommended_modernization_year")}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("budget_amount", {
        header: () => (
          <SortHeader
            label="Budget"
            sortDirection={getSortDirection(sorting, "budget_amount")}
            onSort={() => handleSort("budget_amount")}
          />
        ),
        cell: (info) => {
          const v = info.getValue();
          return v !== undefined && v !== null
            ? `${(v / 1000).toFixed(0)} tkr`
            : "\u2014";
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <Link
            to="/hiss/$id/redigera"
            params={{ id: info.row.original._id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="size-8">
              <Pencil className="size-3.5" />
            </Button>
          </Link>
        ),
      }),
    ],
    [sorting],
  );

  const table = useReactTable({
    data: result?.data ?? [],
    columns,
    manualSorting: true,
    manualPagination: true,
    pageCount: result?.totalPages ?? -1,
    state: {
      sorting,
      pagination: { pageIndex: page, pageSize: limit },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  if (result === undefined) {
    return <RegisterSkeleton />;
  }

  const { totalCount, totalPages } = result;
  const offset = page * limit;

  return (
    <div className="space-y-4">
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
              onClick={() => handleExport("csv")}
            >
              <FileText className="mr-2 size-4" />
              {exportRequested === "csv" ? "Laddar..." : "CSV"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={exportRequested === "xlsx"}
              onClick={() => handleExport("xlsx")}
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
          placeholder="S\u00f6k hissnummer, adress, distrikt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            onClick={() => setSearch("")}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions && (
          <>
            <MultiSelectFilter
              title="Distrikt"
              options={filterOptions.district}
              selected={filterDistrict}
              onSelectedChange={setFilterDistrict}
              emptyText="Inga alternativ"
              clearText="Rensa"
            />
            <MultiSelectFilter
              title="Hisstyp"
              options={filterOptions.elevator_type}
              selected={filterElevatorType}
              onSelectedChange={setFilterElevatorType}
              emptyText="Inga alternativ"
              clearText="Rensa"
            />
            <MultiSelectFilter
              title="Fabrikat"
              options={filterOptions.manufacturer}
              selected={filterManufacturer}
              onSelectedChange={setFilterManufacturer}
              emptyText="Inga alternativ"
              clearText="Rensa"
            />
          </>
        )}

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktiva</SelectItem>
            <SelectItem value="demolished">Rivda</SelectItem>
            <SelectItem value="archived">Arkiverade</SelectItem>
            <SelectItem value="all">Alla</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Bygg\u00e5r:</span>
          <Input
            type="number"
            placeholder="Från"
            value={buildYearMin}
            onChange={(e) => setBuildYearMin(e.target.value)}
            className="h-9 w-20"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="Till"
            value={buildYearMax}
            onChange={(e) => setBuildYearMax(e.target.value)}
            className="h-9 w-20"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="mr-1 size-3" />
            Rensa filter
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/hiss/${row.original._id}`;
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="size-8" />
                    <p>Inga hissar hittades.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Visar {offset + 1}\u2013{Math.min(offset + limit, totalCount)} av{" "}
            {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-[400px] w-full rounded-md" />
      <Skeleton className="h-9 w-64" />
    </div>
  );
}
