import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { SortHeader } from "@elevatorbud/ui/components/ui/sort-header";
import { Link } from "@tanstack/react-router";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import type { TimelinePeriod } from "./urgency-helpers";
import { getUrgencyBadge } from "./urgency-helpers";

type PriorityElevator = {
  _id: string;
  elevator_number: string;
  address?: string;
  district?: string;
  elevator_type?: string;
  recommended_modernization_year?: string;
  budget_amount?: number;
  modernization_measures?: string;
  organization_id: string;
  organizationName: string;
};

type PriorityListProps = {
  elevators: PriorityElevator[];
  selectedPeriod: TimelinePeriod | null;
  onClearPeriod: () => void;
};

const columnHelper = createColumnHelper<PriorityElevator>();

function getSortDirection(
  sorting: SortingState,
  field: string,
): "asc" | "desc" | null {
  const s = sorting.find((s) => s.id === field);
  return s ? (s.desc ? "desc" : "asc") : null;
}

export function PriorityList({
  elevators,
  selectedPeriod,
  onClearPeriod,
}: PriorityListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "recommended_modernization_year", desc: false },
  ]);

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
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("district", {
        header: () => (
          <SortHeader
            label="Distrikt"
            sortDirection={getSortDirection(sorting, "district")}
            onSort={() => handleSort("district")}
          />
        ),
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden md:table-cell" },
      }),
      columnHelper.accessor("organizationName", {
        header: () => "Organisation",
        cell: (info) => (
          <Link
            to="/admin/organisationer/$id"
            params={{ id: info.row.original.organization_id }}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("recommended_modernization_year", {
        header: () => (
          <SortHeader
            label="Rek. år"
            sortDirection={getSortDirection(
              sorting,
              "recommended_modernization_year",
            )}
            onSort={() => handleSort("recommended_modernization_year")}
          />
        ),
        cell: (info) => info.getValue() || "–",
      }),
      columnHelper.display({
        id: "urgency",
        header: "Brådskande",
        cell: (info) => {
          const year = parseInt(
            info.row.original.recommended_modernization_year || "0",
            10,
          );
          return getUrgencyBadge(year);
        },
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
          return v ? `${v.toLocaleString("sv-SE")} kr` : "–";
        },
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("modernization_measures", {
        header: "Åtgärd",
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden lg:table-cell" },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <a
            href={`/hiss/${info.row.original._id}`}
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        ),
      }),
    ],
    [sorting],
  );

  function handleSort(field: string) {
    setSorting((prev) => {
      const existing = prev.find((s) => s.id === field);
      if (!existing) return [{ id: field, desc: false }];
      if (!existing.desc) return [{ id: field, desc: true }];
      return [];
    });
  }

  const table = useReactTable({
    data: elevators,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalCount = elevators.length;
  const offset = pageIndex * pageSize;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Prioritetslista</h2>
        {selectedPeriod && (
          <Badge variant="outline" className="font-normal">
            {selectedPeriod.label}
            <button
              className="ml-1 hover:text-destructive"
              onClick={onClearPeriod}
            >
              ×
            </button>
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          ({totalCount} hissar)
        </span>
      </div>

      {elevators.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Inga hissar med rekommenderat moderniseringsår
          {selectedPeriod ? " i vald period" : ""}.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          (header.column.columnDef.meta as any)?.className
                        }
                      >
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
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            (cell.column.columnDef.meta as any)?.className
                          }
                        >
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

          {totalCount > 25 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Visar {offset + 1}–
                {Math.min(offset + pageSize, totalCount)} av {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
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
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pageIndex + 1} / {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
