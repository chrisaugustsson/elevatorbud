import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { downloadCSV, downloadExcel } from "@elevatorbud/utils/export";
import type { SortingState } from "@tanstack/react-table";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { RegisterToolbar } from "~/features/register/components/register-toolbar";
import { RegisterFilters } from "~/features/register/components/register-filters";
import { RegisterTable } from "~/features/register/components/register-table";
import { RegisterPagination } from "~/features/register/components/register-pagination";

type ListResult = {
  data: Array<{
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
  }>;
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

export function OrgRegisterView({
  organizationId,
}: {
  organizationId: string;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [filterDistrict, setFilterDistrict] = useState<string[]>([]);
  const [filterElevatorType, setFilterElevatorType] = useState<string[]>([]);
  const [filterManufacturer, setFilterManufacturer] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [buildYearMin, setBuildYearMin] = useState("");
  const [buildYearMax, setBuildYearMax] = useState("");

  useEffect(() => {
    if (!search) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    filterDistrict,
    filterElevatorType,
    filterManufacturer,
    buildYearMin,
    buildYearMax,
    statusFilter,
  ]);

  const allSuggestions = useQuery(api.suggestedValues.list, {});
  const filterOptions = useMemo(() => {
    if (!allSuggestions) return null;
    const active = (allSuggestions as SuggestedValueItem[]).filter(
      (s) => s.active,
    );
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

  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const filterBaseArgs = {
    organization_id: organizationId,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filterDistrict.length > 0 ? { district: filterDistrict } : {}),
    ...(filterElevatorType.length > 0
      ? { elevator_type: filterElevatorType }
      : {}),
    ...(filterManufacturer.length > 0
      ? { manufacturer: filterManufacturer }
      : {}),
    ...(buildYearMin && !isNaN(parseInt(buildYearMin))
      ? { buildYearMin: parseInt(buildYearMin) }
      : {}),
    ...(buildYearMax && !isNaN(parseInt(buildYearMax))
      ? { buildYearMax: parseInt(buildYearMax) }
      : {}),
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

  const [exportRequested, setExportRequested] = useState<
    "csv" | "xlsx" | null
  >(null);
  const exportArgs = exportRequested ? (filterBaseArgs as never) : "skip";
  const exportData = useQuery(
    api.elevators.listing.exportData,
    exportArgs as never,
  ) as Record<string, unknown>[] | undefined;

  const handleExport = useCallback((format: "csv" | "xlsx") => {
    setExportRequested(format);
  }, []);

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

  if (result === undefined) {
    return <RegisterViewSkeleton />;
  }

  const { totalCount, totalPages } = result;

  return (
    <div className="space-y-4">
      <RegisterToolbar
        totalCount={totalCount}
        search={search}
        onSearchChange={setSearch}
        exportRequested={exportRequested}
        onExport={handleExport}
      />
      <RegisterFilters
        filterOptions={filterOptions}
        filterDistrict={filterDistrict}
        onFilterDistrictChange={setFilterDistrict}
        filterElevatorType={filterElevatorType}
        onFilterElevatorTypeChange={setFilterElevatorType}
        filterManufacturer={filterManufacturer}
        onFilterManufacturerChange={setFilterManufacturer}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        buildYearMin={buildYearMin}
        onBuildYearMinChange={setBuildYearMin}
        buildYearMax={buildYearMax}
        onBuildYearMaxChange={setBuildYearMax}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={clearAllFilters}
      />
      <RegisterTable
        data={result.data}
        sorting={sorting}
        onSortingChange={setSorting}
        totalPages={totalPages}
        page={page}
        pageSize={limit}
      />
      <RegisterPagination
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </div>
  );
}

function RegisterViewSkeleton() {
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
