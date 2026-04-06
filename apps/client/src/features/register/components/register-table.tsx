import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
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
import { SortHeader } from "@elevatorbud/ui/components/ui/sort-header";
import { Building2 } from "lucide-react";

type HissRow = {
  id: string;
  elevatorNumber: string;
  address: string | null;
  elevatorClassification: string | null;
  district: string | null;
  elevatorType: string | null;
  manufacturer: string | null;
  buildYear: number | null;
  modernizationYear: string | null;
  maintenanceCompany: string | null;
  inspectionMonth: string | null;
  hasEmergencyPhone: boolean | null;
  needsUpgrade: boolean | null;
  status: string;
  organizationId: string;
  organizationName: string | null;
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
      columnHelper.accessor("elevatorNumber", {
        header: () => (
          <SortHeader
            label="Hissnummer"
            sortDirection={getSortDirection(sorting, "elevatorNumber")}
            onSort={() => handleSort("elevatorNumber")}
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
      columnHelper.accessor("elevatorType", {
        header: () => (
          <SortHeader
            label="Hisstyp"
            sortDirection={getSortDirection(sorting, "elevatorType")}
            onSort={() => handleSort("elevatorType")}
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
      columnHelper.accessor("buildYear", {
        header: () => (
          <SortHeader
            label="Byggår"
            sortDirection={getSortDirection(sorting, "buildYear")}
            onSort={() => handleSort("buildYear")}
          />
        ),
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("modernizationYear", {
        header: () => (
          <SortHeader
            label="Moderniserad"
            sortDirection={getSortDirection(sorting, "modernizationYear")}
            onSort={() => handleSort("modernizationYear")}
          />
        ),
        cell: (info) => info.getValue() || "—",
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
                  window.location.href = `/hiss/${row.original.id}`;
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
