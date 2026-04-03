import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import { SortHeader } from "@elevatorbud/ui/components/ui/sort-header";
import { Building2, Pencil } from "lucide-react";

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
  organization_id: string;
  organizationName: string;
};

function getSortDirection(
  sorting: SortingState,
  field: string,
): "asc" | "desc" | null {
  const s = sorting.find((s) => s.id === field);
  return s ? (s.desc ? "desc" : "asc") : null;
}

interface RegisterTableProps {
  data: HissRow[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  totalPages: number;
  page: number;
  pageSize: number;
}

export function RegisterTable({
  data,
  sorting,
  onSortingChange,
  totalPages,
  page,
  pageSize,
}: RegisterTableProps) {
  function handleSort(field: string) {
    onSortingChange(
      (() => {
        const existing = sorting.find((s) => s.id === field);
        if (!existing) return [{ id: field, desc: false }];
        if (!existing.desc) return [{ id: field, desc: true }];
        return [];
      })(),
    );
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
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("district", {
        header: () => (
          <SortHeader
            label="Distrikt"
            sortDirection={getSortDirection(sorting, "district")}
            onSort={() => handleSort("district")}
          />
        ),
        cell: (info) => info.getValue() || "—",
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
      }),
      columnHelper.accessor("elevator_type", {
        header: () => (
          <SortHeader
            label="Hisstyp"
            sortDirection={getSortDirection(sorting, "elevator_type")}
            onSort={() => handleSort("elevator_type")}
          />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("manufacturer", {
        header: () => (
          <SortHeader
            label="Fabrikat"
            sortDirection={getSortDirection(sorting, "manufacturer")}
            onSort={() => handleSort("manufacturer")}
          />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("build_year", {
        header: () => (
          <SortHeader
            label="Byggår"
            sortDirection={getSortDirection(sorting, "build_year")}
            onSort={() => handleSort("build_year")}
          />
        ),
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("modernization_year", {
        header: () => (
          <SortHeader
            label="Moderniserad"
            sortDirection={getSortDirection(sorting, "modernization_year")}
            onSort={() => handleSort("modernization_year")}
          />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("recommended_modernization_year", {
        header: () => (
          <SortHeader
            label="Rek. modern."
            sortDirection={getSortDirection(
              sorting,
              "recommended_modernization_year",
            )}
            onSort={() => handleSort("recommended_modernization_year")}
          />
        ),
        cell: (info) => info.getValue() || "—",
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
            : "—";
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
    data,
    columns,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    state: {
      sorting,
      pagination: { pageIndex: page, pageSize },
    },
    onSortingChange: (updater) => {
      if (typeof updater === "function") {
        onSortingChange(updater(sorting));
      } else {
        onSortingChange(updater);
      }
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
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
  );
}
