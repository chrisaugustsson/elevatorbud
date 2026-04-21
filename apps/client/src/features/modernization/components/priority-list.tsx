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
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Cog,
  Factory,
} from "lucide-react";
import { Link, useParams } from "@tanstack/react-router";
import type { TimelinePeriod } from "@elevatorbud/ui/components/modernization/urgency-helpers";
import {
  getUrgencyBadge,
  getUrgencyColor,
} from "@elevatorbud/ui/components/modernization/urgency-helpers";
import { formatKr, formatKrNumber } from "@elevatorbud/utils/format";
import { FilterChip } from "../../../shared/components/filter-chip";

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

function ExpandedRow({
  row,
  expanded,
}: {
  row: PriorityElevator;
  expanded: boolean;
}) {
  const { parentOrgId } = useParams({ strict: false }) as { parentOrgId: string };
  const measures = row.measures
    ? row.measures.split(",").map((m) => m.trim()).filter(Boolean)
    : [];
  const year = row.recommendedModernizationYear
    ? Number(row.recommendedModernizationYear)
    : null;
  // Urgency accent on the expanded panel's left edge — carries the row's
  // urgency cue into the detail so the user doesn't lose context. Hex
  // values match the urgency badges (red/orange/yellow/green).
  const accentColor =
    year != null && Number.isFinite(year) ? getUrgencyColor(year) : null;

  return (
    // Height-animation wrapper: grid-template-rows transitions 0fr ↔ 1fr
    // (see @keyframes expand-row / collapse-row in globals.css). The
    // inner `min-h-0` is required for the grid child to respect 0fr;
    // `overflow-hidden` clips content during the animation. `data-state`
    // selects which keyframe runs; `data-expand-row` lets the
    // prefers-reduced-motion query short-circuit both animations.
    <div
      data-expand-row
      data-state={expanded ? "open" : "closed"}
      className="grid overflow-hidden data-[state=open]:animate-[expand-row_250ms_cubic-bezier(0.16,1,0.3,1)_forwards] data-[state=closed]:animate-[collapse-row_220ms_cubic-bezier(0.4,0,0.6,1)_forwards]"
    >
      <div className="min-h-0">
        <div className="relative grid gap-6 px-5 py-5 lg:grid-cols-[1fr_320px]">
      {/* Left-edge urgency accent — 2px, full-height flush to the row
          divider above and below (no inset so it aligns with the urgency
          badge's column in the parent row). */}
      {accentColor && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px]"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* ── Left: Åtgärder as chips ────────────────────────────── */}
      <div className="min-w-0">
        <div className="mb-3 flex items-baseline gap-2">
          <h4 className="text-sm font-semibold">Åtgärder</h4>
          {measures.length > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
              {measures.length}
            </span>
          )}
        </div>
        {measures.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {measures.map((measure, i) => (
              <li
                key={i}
                className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-foreground/90"
              >
                {measure}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Inga åtgärder angivna.
          </p>
        )}
      </div>

      {/* ── Right: Budget stat + Specs + link ────────────────── */}
      <aside className="space-y-4 lg:border-l lg:pl-6">
        {row.budgetAmount != null && (
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Budget
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums leading-none">
                {formatKrNumber(row.budgetAmount)}
              </span>
              <span className="text-sm text-muted-foreground">kr</span>
            </p>
          </div>
        )}

        <dl className="space-y-2 rounded-md border bg-muted/20 p-3">
          {row.elevatorType && (
            <SpecRow icon={Cog} label="Hisstyp" value={row.elevatorType} />
          )}
          {row.manufacturer && (
            <SpecRow
              icon={Factory}
              label="Tillverkare"
              value={row.manufacturer}
            />
          )}
          {row.buildYear != null && (
            <SpecRow
              icon={Calendar}
              label="Byggnadsår"
              value={String(row.buildYear)}
              mono
            />
          )}
        </dl>

        <Link
          to="/$parentOrgId/hiss/$id"
          params={{ parentOrgId, id: row.id }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Visa hissdetaljer
          <ChevronRight className="size-3.5" />
        </Link>
      </aside>
        </div>
      </div>
    </div>
  );
}

function SpecRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Cog;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className={mono ? "tabular-nums font-medium" : "font-medium"}>
        {value}
      </dd>
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
          expandedContent: (row: PriorityElevator, expanded: boolean) => (
            <ExpandedRow row={row} expanded={expanded} />
          ),
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
              {formatKr(v)}
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
    // Key rows by elevator id so we can address them by id from the
    // onRowClick handler without relying on table-internal row indices.
    getRowId: (row) => row.id,
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
        {selectedYear && onClearYear && (
          <FilterChip label={selectedYear} onRemove={onClearYear} />
        )}
        {selectedPeriod && !selectedYear && (
          <FilterChip label={selectedPeriod.label} onRemove={onClearPeriod} />
        )}
        {selectedDistrict && onClearDistrict && (
          <FilterChip label={selectedDistrict} onRemove={onClearDistrict} />
        )}
        {selectedSubOrgName && onClearSubOrg && (
          <FilterChip label={selectedSubOrgName} onRemove={onClearSubOrg} />
        )}
        <span className="text-sm text-muted-foreground">
          ({totalCount} hissar)
        </span>
      </div>

      <DataGrid
        table={table}
        recordCount={totalCount}
        isLoading={isLoading}
        onRowClick={(r) => table.getRow(r.id).toggleExpanded()}
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
