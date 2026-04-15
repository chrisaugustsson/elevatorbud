import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridPagination,
  DataGridColumnHeader,
} from "@elevatorbud/ui/components/ui/data-grid-table";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Building2, ChevronDown, ChevronRight } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import type { TimelinePeriod } from "@elevatorbud/ui/components/modernization/urgency-helpers";
import { getUrgencyBadge } from "@elevatorbud/ui/components/modernization/urgency-helpers";

type PriorityElevator = {
  id: string;
  elevatorNumber: string;
  address?: string;
  district?: string;
  recommendedModernizationYear?: string;
  budgetAmount?: number;
  modernizationMeasures?: string;
};

type PriorityListProps = {
  elevators: PriorityElevator[];
  selectedPeriod: TimelinePeriod | null;
  selectedYear?: string | null;
  selectedDistrict?: string | null;
  selectedSubOrgName?: string | null;
  onClearPeriod: () => void;
  onClearYear?: () => void;
  onClearDistrict?: () => void;
  onClearSubOrg?: () => void;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
};

const columnHelper = createColumnHelper<PriorityElevator>();

function ExpandedRow({ row }: { row: PriorityElevator }) {
  const { parentOrgId } = useParams({ strict: false }) as { parentOrgId: string };
  const measures = row.modernizationMeasures
    ? row.modernizationMeasures.split(",").map((m) => m.trim()).filter(Boolean)
    : [];

  return (
    <div className="px-4 py-3 space-y-3">
      {measures.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Åtgärder</p>
          <ul className="space-y-1">
            {measures.map((measure, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                {measure}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {row.budgetAmount && (
          <div>
            <span className="text-muted-foreground">Budget: </span>
            <span className="font-medium">{row.budgetAmount.toLocaleString("sv-SE")} kr</span>
          </div>
        )}
      </div>
      <a
        href={`/${parentOrgId}/hiss/${row.id}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        Visa hissdetaljer
        <ChevronRight className="h-3 w-3" />
      </a>
    </div>
  );
}

export function PriorityList({
  elevators,
  selectedPeriod,
  selectedYear,
  selectedDistrict,
  selectedSubOrgName,
  onClearPeriod,
  onClearYear,
  onClearDistrict,
  onClearSubOrg,
  totalCount,
  totalPages,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: PriorityListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "recommendedModernizationYear", desc: false },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "expand",
        size: 40,
        enableResizing: false,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            aria-label={row.getIsExpanded() ? "Kollapsa rad" : "Expandera rad"}
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ),
        meta: {
          cellClassName: "!px-2 text-center",
          headerClassName: "!px-2",
          expandedContent: (row: PriorityElevator) => <ExpandedRow row={row} />,
        },
      }),
      columnHelper.accessor("elevatorNumber", {
        size: 120,
        header: ({ column }) => (
          <DataGridColumnHeader title="Hissnummer" column={column} />
        ),
        cell: (info) => (
          <span className="font-medium tabular-nums">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("address", {
        size: 220,
        header: ({ column }) => (
          <DataGridColumnHeader title="Adress" column={column} />
        ),
        cell: (info) => {
          const v = info.getValue();
          return (
            <span title={v ?? undefined} className="block truncate">
              {v || "–"}
            </span>
          );
        },
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("district", {
        size: 140,
        header: ({ column }) => (
          <DataGridColumnHeader title="Distrikt" column={column} />
        ),
        cell: (info) => {
          const v = info.getValue();
          return (
            <span title={v ?? undefined} className="block truncate">
              {v || "–"}
            </span>
          );
        },
        meta: { className: "hidden md:table-cell" },
      }),
      columnHelper.accessor("recommendedModernizationYear", {
        size: 90,
        header: ({ column }) => (
          <DataGridColumnHeader title="Rek. år" column={column} />
        ),
        cell: (info) => (
          <span className="tabular-nums">{info.getValue() || "–"}</span>
        ),
      }),
      columnHelper.display({
        id: "urgency",
        size: 120,
        enableSorting: false,
        header: ({ column }) => (
          <DataGridColumnHeader title="Brådskande" column={column} />
        ),
        cell: (info) => {
          const year = parseInt(
            info.row.original.recommendedModernizationYear || "0",
            10,
          );
          return getUrgencyBadge(year);
        },
      }),
      columnHelper.accessor("budgetAmount", {
        size: 130,
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Budget"
            column={column}
            className="ms-0 -me-2"
          />
        ),
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className="block text-right tabular-nums">
              {v ? `${v.toLocaleString("sv-SE")} kr` : "–"}
            </span>
          );
        },
        meta: {
          className: "hidden sm:table-cell",
          headerClassName: "text-right [&>div]:justify-end",
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: elevators,
    columns,
    manualPagination: true,
    pageCount: totalPages,
    rowCount: totalCount,
    columnResizeMode: "onChange",
    state: {
      sorting,
      pagination: { pageIndex: page, pageSize },
    },
    onSortingChange: setSorting,
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
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Prioritetslista</h2>
        {selectedYear && (
          <Badge variant="outline" className="font-normal">
            {selectedYear}
            <button
              className="ml-1 hover:text-destructive"
              onClick={onClearYear}
            >
              ×
            </button>
          </Badge>
        )}
        {selectedPeriod && !selectedYear && (
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
        {selectedDistrict && (
          <Badge variant="outline" className="font-normal">
            {selectedDistrict}
            <button
              className="ml-1 hover:text-destructive"
              onClick={onClearDistrict}
            >
              ×
            </button>
          </Badge>
        )}
        {selectedSubOrgName && (
          <Badge variant="outline" className="font-normal">
            {selectedSubOrgName}
            <button
              className="ml-1 hover:text-destructive"
              onClick={onClearSubOrg}
            >
              ×
            </button>
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          ({totalCount} hissar)
        </span>
      </div>

      <DataGrid
        table={table}
        recordCount={totalCount}
        isLoading={isLoading}
        tableLayout={{ width: "fixed", columnsResizable: true }}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Building2 className="size-8" />
            <p>
              Inga hissar med rekommenderat moderniseringsår
              {selectedPeriod ? " i vald period" : ""}
              {selectedYear ? ` för ${selectedYear}` : ""}
              {selectedDistrict ? ` i ${selectedDistrict}` : ""}
              {selectedSubOrgName ? ` för ${selectedSubOrgName}` : ""}.
            </p>
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
    </div>
  );
}
