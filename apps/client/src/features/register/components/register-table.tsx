import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridColumnHeader,
} from "@elevatorbud/ui/components/ui/data-grid-table";
import { Building2 } from "lucide-react";
import { useNavigate, useParams } from "@tanstack/react-router";

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

interface RegisterTableProps {
  data: HissRow[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  totalPages: number;
  page: number;
  pageSize: number;
  showSubOrg?: boolean;
  emptyMessage?: React.ReactNode;
}

export function RegisterTable({
  data,
  sorting,
  onSortingChange,
  totalPages,
  page,
  pageSize,
  showSubOrg = false,
  emptyMessage: emptyMessageProp,
}: RegisterTableProps) {
  const { parentOrgId } = useParams({ strict: false }) as { parentOrgId: string };
  const navigate = useNavigate();
  const columnHelper = createColumnHelper<HissRow>();
  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor("elevatorNumber", {
        size: 130,
        header: ({ column }) => (
          <DataGridColumnHeader title="Hissnummer" column={column} />
        ),
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col">
              <span className="font-medium tabular-nums">{info.getValue()}</span>
              {/*
                Mobile-only secondary line: shows the sub-org name inline
                when the sub-org column itself is hidden below md. Keeps
                the sub-org visible at <768px without reserving column
                space. Only rendered when the register is showing multi-
                org data (showSubOrg === true).
              */}
              {showSubOrg && row.organizationName && (
                <span className="md:hidden text-xs text-muted-foreground">
                  {row.organizationName}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("address", {
        size: 200,
        header: ({ column }) => (
          <DataGridColumnHeader title="Adress" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      ...(showSubOrg
        ? [
            columnHelper.accessor("organizationName", {
              id: "organizationName",
              size: 160,
              enableSorting: false,
              header: () => (
                <span className="text-sm font-medium">Organisation</span>
              ),
              cell: (info) => (
                <span className="text-muted-foreground">
                  {info.getValue() || "—"}
                </span>
              ),
              // US-025b: hide this column below md; the sub-org name is
              // shown inline under the elevator number on mobile instead.
              meta: {
                cellClassName: "hidden md:table-cell",
                headerClassName: "hidden md:table-cell",
              },
            }),
          ]
        : []),
      columnHelper.accessor("district", {
        size: 140,
        header: ({ column }) => (
          <DataGridColumnHeader title="Distrikt" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("elevatorType", {
        size: 130,
        header: ({ column }) => (
          <DataGridColumnHeader title="Hisstyp" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("manufacturer", {
        size: 130,
        header: ({ column }) => (
          <DataGridColumnHeader title="Fabrikat" column={column} />
        ),
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("buildYear", {
        size: 100,
        header: ({ column }) => (
          <DataGridColumnHeader title="Byggår" column={column} />
        ),
        cell: (info) => (
          <span className="tabular-nums">{info.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.accessor("modernizationYear", {
        size: 140,
        header: ({ column }) => (
          <DataGridColumnHeader title="Moderniserad" column={column} />
        ),
        cell: (info) => (
          <span className="tabular-nums">{info.getValue() || "—"}</span>
        ),
      }),
    ];
    return cols;
  }, [showSubOrg, columnHelper]);

  const table = useReactTable({
    data,
    columns,
    manualSorting: true,
    manualPagination: true,
    columnResizeMode: "onChange",
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
    <DataGrid
      table={table}
      recordCount={data.length}
      tableLayout={{ width: "fixed", columnsResizable: true }}
      onRowClick={(row) => {
        // Use the router so we keep client-side state and the context
        // crossfade — a full page reload defeats both.
        navigate({
          to: "/$parentOrgId/hiss/$id",
          params: { parentOrgId, id: row.id },
        });
      }}
      emptyMessage={
        emptyMessageProp ?? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Building2 className="size-8" />
            <p>Inga hissar hittades.</p>
          </div>
        )
      }
    >
      <DataGridContainer>
        <div className="overflow-x-auto">
          <DataGridTable />
        </div>
      </DataGridContainer>
    </DataGrid>
  );
}
