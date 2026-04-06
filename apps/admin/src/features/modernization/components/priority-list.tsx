import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
import { Building2, ChevronRight } from "lucide-react";
import type { TimelinePeriod } from "./urgency-helpers";
import { getUrgencyBadge } from "./urgency-helpers";

type PriorityElevator = {
  id: string;
  elevatorNumber: string;
  address: string | null;
  district: string | null;
  elevatorType: string | null;
  manufacturer: string | null;
  buildYear: number | null;
  organizationName: string | null;
  recommendedModernizationYear: string | null;
  budgetAmount: number | null;
  measures: string | null;
};

type PriorityListProps = {
  elevators: PriorityElevator[];
  selectedPeriod: TimelinePeriod | null;
  onClearPeriod: () => void;
};

const columnHelper = createColumnHelper<PriorityElevator>();

export function PriorityList({
  elevators,
  selectedPeriod,
  onClearPeriod,
}: PriorityListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "recommendedModernizationYear", desc: false },
  ]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("elevatorNumber", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Hissnummer" column={column} />
        ),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("address", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Adress" column={column} />
        ),
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("district", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Distrikt" column={column} />
        ),
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden md:table-cell" },
      }),
      columnHelper.accessor("organizationName", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Organisation" column={column} />
        ),
        enableSorting: false,
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("recommendedModernizationYear", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Rek. år" column={column} />
        ),
        cell: (info) => info.getValue() || "–",
      }),
      columnHelper.display({
        id: "urgency",
        header: ({ column }) => (
          <DataGridColumnHeader title="Brådskande" column={column} />
        ),
        enableSorting: false,
        cell: (info) => {
          const year = parseInt(
            info.row.original.recommendedModernizationYear || "0",
            10,
          );
          return getUrgencyBadge(year);
        },
      }),
      columnHelper.accessor("budgetAmount", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Budget" column={column} />
        ),
        cell: (info) => {
          const v = info.getValue();
          return v ? `${v.toLocaleString("sv-SE")} kr` : "–";
        },
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("measures", {
        header: ({ column }) => (
          <DataGridColumnHeader title="Åtgärd" column={column} />
        ),
        enableSorting: false,
        cell: (info) => info.getValue() || "–",
        meta: { className: "hidden lg:table-cell" },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <a
            href={`/hiss/${info.row.original.id}`}
            className="inline-flex items-center text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        ),
      }),
    ],
    [],
  );

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
          ({elevators.length} hissar)
        </span>
      </div>

      {elevators.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Inga hissar med rekommenderat moderniseringsår
          {selectedPeriod ? " i vald period" : ""}.
        </p>
      ) : (
        <DataGrid table={table} recordCount={elevators.length}
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
          {elevators.length > 25 && (
            <DataGridPagination
              sizes={[25, 50, 100]}
              info="{from} - {to} av {count}"
            />
          )}
        </DataGrid>
      )}
    </div>
  );
}
