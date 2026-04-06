import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridPagination,
  DataGridColumnHeader,
} from "@elevatorbud/ui/components/ui/data-grid-table";
import { Building2, Pencil } from "lucide-react";

type HissRow = {
  id: string;
  elevatorNumber: string;
  address?: string | null;
  district?: string | null;
  elevatorType?: string | null;
  manufacturer?: string | null;
  buildYear?: number | null;
  modernizationYear?: string | null;
  recommendedModernizationYear?: string | null;
  budgetAmount?: number | null;
  organizationId: string;
  organizationName: string | null;
};

interface RegisterTableProps {
  data: HissRow[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

export function RegisterTable({
  data,
  sorting,
  onSortingChange,
  totalCount,
  totalPages,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: RegisterTableProps) {
  const navigate = useNavigate();

  const columnHelper = createColumnHelper<HissRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("elevatorNumber", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Hissnummer" column={column} />
        ),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
        size: 130,
        enableHiding: false,
      }),
      columnHelper.accessor("address", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Adress" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
        size: 180,
      }),
      columnHelper.accessor("district", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Distrikt" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
        size: 120,
      }),
      columnHelper.accessor("organizationName", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Organisation" column={column} />
        ),
        cell: (info) => (
          <Link
            to="/admin/organisationer/$id"
            params={{ id: info.row.original.organizationId }}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
        enableSorting: false,
        size: 160,
      }),
      columnHelper.accessor("elevatorType", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Hisstyp" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
        size: 120,
      }),
      columnHelper.accessor("manufacturer", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Fabrikat" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
        size: 120,
      }),
      columnHelper.accessor("buildYear", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Byggår" column={column} />
        ),
        cell: (info) => info.getValue() ?? "—",
        size: 100,
      }),
      columnHelper.accessor("modernizationYear", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Moderniserad" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
        size: 130,
      }),
      columnHelper.accessor("recommendedModernizationYear", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Rek. modern." column={column} />
        ),
        cell: (info) => info.getValue() || "—",
        size: 130,
      }),
      columnHelper.accessor("budgetAmount", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Budget" column={column} />
        ),
        cell: (info) => {
          const v = info.getValue();
          return v !== undefined && v !== null
            ? `${(v / 1000).toFixed(0)} tkr`
            : "—";
        },
        size: 100,
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <Link
            to="/hiss/$id/redigera"
            params={{ id: info.row.original.id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="size-8">
              <Pencil className="size-3.5" />
            </Button>
          </Link>
        ),
        size: 50,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    rowCount: totalCount,
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
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page, pageSize })
          : updater;
      if (next.pageSize !== pageSize) {
        onPageSizeChange(next.pageSize);
        onPageChange(0);
      } else {
        onPageChange(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={totalCount}
      isLoading={isLoading}
      onRowClick={(row) => navigate({ to: "/hiss/$id", params: { id: row.id } })}
      emptyMessage={
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Building2 className="size-8" />
          <p>Inga hissar hittades.</p>
        </div>
      }
    >
      <DataGridContainer>
        <div className="overflow-x-auto">
          <DataGridTable />
        </div>
      </DataGridContainer>
      <DataGridPagination
        sizes={[25, 50, 100]}
        info="{from} - {to} av {count}"
        onPageChange={onPageChange}
        onPageSizeChange={(size) => {
          onPageSizeChange(size);
          onPageChange(0);
        }}
      />
    </DataGrid>
  );
}
