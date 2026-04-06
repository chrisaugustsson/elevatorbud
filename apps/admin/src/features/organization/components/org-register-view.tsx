import { useState, useEffect, useMemo, useCallback } from "react";
import { useSuspenseQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { listElevatorsOptions, exportElevatorDataOptions } from "~/server/elevator";
import { suggestedValuesOptions } from "~/server/suggested-values";
import { downloadCSV, downloadExcel } from "@elevatorbud/utils/export";
import type { SortingState } from "@tanstack/react-table";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { RegisterToolbar } from "~/features/register/components/register-toolbar";
import { RegisterFilters } from "~/features/register/components/register-filters";
import { RegisterTable } from "~/features/register/components/register-table";

type ListResult = {
  items: Array<{
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
    inspectionAuthority: string | null;
    status: string;
    organizationId: string;
    organizationName: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

type SuggestedValueItem = {
  id: string;
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

  const { data: districtSuggestions } = useSuspenseQuery(suggestedValuesOptions("district"));
  const { data: elevatorTypeSuggestions } = useSuspenseQuery(suggestedValuesOptions("elevator_type"));
  const { data: manufacturerSuggestions } = useSuspenseQuery(suggestedValuesOptions("manufacturer"));

  const filterOptions = useMemo(() => {
    const toSorted = (items: SuggestedValueItem[]) =>
      items
        .filter((s) => s.active)
        .map((s) => s.value)
        .sort((a, b) => a.localeCompare(b, "sv"));
    return {
      district: toSorted(districtSuggestions),
      elevator_type: toSorted(elevatorTypeSuggestions),
      manufacturer: toSorted(manufacturerSuggestions),
    };
  }, [districtSuggestions, elevatorTypeSuggestions, manufacturerSuggestions]);

  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const filterBaseArgs = {
    organizationId,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filterDistrict.length > 0 ? { district: filterDistrict } : {}),
    ...(filterElevatorType.length > 0
      ? { elevatorType: filterElevatorType }
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

  const { data: result, isLoading } = useQuery({
    ...listElevatorsOptions(queryArgs),
    placeholderData: keepPreviousData,
  });

  const [exportRequested, setExportRequested] = useState<
    "csv" | "xlsx" | null
  >(null);
  const { data: exportData } = useQuery({
    ...exportElevatorDataOptions(filterBaseArgs as never),
    enabled: !!exportRequested,
  });

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

  const totalCount = result?.total ?? 0;
  const pageSize = result?.pageSize ?? limit;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

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
        data={result?.items ?? []}
        sorting={sorting}
        onSortingChange={setSorting}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
        isLoading={isLoading}
      />
    </div>
  );
}

export function RegisterViewSkeleton() {
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
