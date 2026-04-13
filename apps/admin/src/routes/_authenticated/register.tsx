import { useState, useEffect, useMemo, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { listElevatorsOptions, exportElevatorDataOptions } from "~/server/elevator";
import { suggestedValuesOptions } from "~/server/suggested-values";
import { downloadCSV, downloadExcel } from "@elevatorbud/utils/export";
import type { SortingState } from "@tanstack/react-table";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { RegisterToolbar } from "~/features/register/components/register-toolbar";
import { RegisterFilters } from "~/features/register/components/register-filters";
import { RegisterTable } from "~/features/register/components/register-table";

type SortField =
  | "elevatorNumber"
  | "address"
  | "district"
  | "elevatorType"
  | "manufacturer"
  | "buildYear"
  | "maintenanceCompany"
  | "inspectionMonth"
  | "recommendedModernizationYear"
  | "budgetAmount";

const VALID_SORT_FIELDS: SortField[] = [
  "elevatorNumber",
  "address",
  "district",
  "elevatorType",
  "manufacturer",
  "buildYear",
  "maintenanceCompany",
  "inspectionMonth",
  "recommendedModernizationYear",
  "budgetAmount",
];

const VALID_STATUSES = ["active", "demolished", "archived", "all"];

type RegisterSearch = {
  search?: string;
  district?: string[];
  elevatorType?: string[];
  manufacturer?: string[];
  maintenanceCompany?: string[];
  buildYearMin?: number;
  buildYearMax?: number;
  status?: string;
  sortBy?: SortField;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function parseStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const arr = value.filter((v): v is string => typeof v === "string" && v.length > 0);
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return undefined;
}

export const Route = createFileRoute("/_authenticated/register")({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    search: typeof search.search === "string" && search.search ? search.search : undefined,
    district: parseStringArray(search.district),
    elevatorType: parseStringArray(search.elevatorType),
    manufacturer: parseStringArray(search.manufacturer),
    maintenanceCompany: parseStringArray(search.maintenanceCompany),
    buildYearMin:
      typeof search.buildYearMin === "number" ? search.buildYearMin : undefined,
    buildYearMax:
      typeof search.buildYearMax === "number" ? search.buildYearMax : undefined,
    status:
      typeof search.status === "string" && VALID_STATUSES.includes(search.status)
        ? search.status
        : undefined,
    sortBy: VALID_SORT_FIELDS.includes(search.sortBy as SortField)
      ? (search.sortBy as SortField)
      : undefined,
    sortOrder:
      search.sortOrder === "asc" || search.sortOrder === "desc"
        ? search.sortOrder
        : undefined,
    page: typeof search.page === "number" && search.page > 0 ? search.page : undefined,
    pageSize:
      typeof search.pageSize === "number" && [25, 50, 100].includes(search.pageSize)
        ? search.pageSize
        : undefined,
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(suggestedValuesOptions("district"));
    context.queryClient.prefetchQuery(suggestedValuesOptions("elevator_type"));
    context.queryClient.prefetchQuery(suggestedValuesOptions("manufacturer"));
  },
  component: Register,
  pendingComponent: RegisterSkeleton,
});

type ListResult = {
  items: Array<{
    id: string;
    elevatorNumber: string;
    address: string | null;
    district: string | null;
    elevatorType: string | null;
    manufacturer: string | null;
    buildYear: number | null;
    modernizationYear: string | null;
    organizationId: string;
    organizationName: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

function Register() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Derived state from URL
  const debouncedSearch = searchParams.search ?? "";
  const filterDistrict = useMemo(() => searchParams.district ?? [], [searchParams.district]);
  const filterElevatorType = useMemo(
    () => searchParams.elevatorType ?? [],
    [searchParams.elevatorType],
  );
  const filterManufacturer = useMemo(
    () => searchParams.manufacturer ?? [],
    [searchParams.manufacturer],
  );
  const filterMaintenanceCompany = useMemo(
    () => searchParams.maintenanceCompany ?? [],
    [searchParams.maintenanceCompany],
  );
  const buildYearMin = searchParams.buildYearMin?.toString() ?? "";
  const buildYearMax = searchParams.buildYearMax?.toString() ?? "";
  const statusFilter = searchParams.status ?? "active";
  const page = (searchParams.page ?? 1) - 1;
  const limit = searchParams.pageSize ?? 25;

  const sorting: SortingState = useMemo(
    () =>
      searchParams.sortBy
        ? [{ id: searchParams.sortBy, desc: searchParams.sortOrder === "desc" }]
        : [],
    [searchParams.sortBy, searchParams.sortOrder],
  );

  // Local-only state for the search input (so typing doesn't spam URL)
  const [search, setSearch] = useState(debouncedSearch);

  // Debounce search → URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== debouncedSearch) {
        navigate({
          search: (prev) => {
            const merged = { ...prev, search: search || undefined, page: undefined };
            if (!merged.search) delete merged.search;
            if (!merged.page) delete merged.page;
            return merged;
          },
          replace: true,
          resetScroll: false,
        });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Sync URL search back into local input when cleared externally
  useEffect(() => {
    if (debouncedSearch !== search && debouncedSearch === "") {
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const updateSearch = useCallback(
    (next: Partial<RegisterSearch>) => {
      navigate({
        search: (prev) => {
          const merged = { ...prev, ...next } as RegisterSearch;
          if (!merged.search) delete merged.search;
          if (!merged.district || merged.district.length === 0) delete merged.district;
          if (!merged.elevatorType || merged.elevatorType.length === 0)
            delete merged.elevatorType;
          if (!merged.manufacturer || merged.manufacturer.length === 0)
            delete merged.manufacturer;
          if (!merged.maintenanceCompany || merged.maintenanceCompany.length === 0)
            delete merged.maintenanceCompany;
          if (merged.buildYearMin === undefined) delete merged.buildYearMin;
          if (merged.buildYearMax === undefined) delete merged.buildYearMax;
          if (!merged.status || merged.status === "active") delete merged.status;
          if (!merged.sortBy) delete merged.sortBy;
          if (!merged.sortOrder) delete merged.sortOrder;
          if (!merged.page || merged.page === 1) delete merged.page;
          if (!merged.pageSize || merged.pageSize === 25) delete merged.pageSize;
          return merged;
        },
        replace: true,
        resetScroll: false,
      });
    },
    [navigate],
  );

  const setFilterDistrict = useCallback(
    (next: string[]) =>
      updateSearch({
        district: next.length > 0 ? next : undefined,
        page: undefined,
      }),
    [updateSearch],
  );
  const setFilterElevatorType = useCallback(
    (next: string[]) =>
      updateSearch({
        elevatorType: next.length > 0 ? next : undefined,
        page: undefined,
      }),
    [updateSearch],
  );
  const setFilterManufacturer = useCallback(
    (next: string[]) =>
      updateSearch({
        manufacturer: next.length > 0 ? next : undefined,
        page: undefined,
      }),
    [updateSearch],
  );
  const setBuildYearMin = useCallback(
    (val: string) => {
      const n = val && !isNaN(parseInt(val)) ? parseInt(val) : undefined;
      updateSearch({ buildYearMin: n, page: undefined });
    },
    [updateSearch],
  );
  const setBuildYearMax = useCallback(
    (val: string) => {
      const n = val && !isNaN(parseInt(val)) ? parseInt(val) : undefined;
      updateSearch({ buildYearMax: n, page: undefined });
    },
    [updateSearch],
  );
  const setStatusFilter = useCallback(
    (val: string) => updateSearch({ status: val, page: undefined }),
    [updateSearch],
  );
  const setSorting = useCallback(
    (next: SortingState) => {
      if (next.length === 0) {
        updateSearch({ sortBy: undefined, sortOrder: undefined });
      } else {
        updateSearch({
          sortBy: next[0].id as SortField,
          sortOrder: next[0].desc ? "desc" : "asc",
        });
      }
    },
    [updateSearch],
  );
  const setPage = useCallback(
    (p: number) => updateSearch({ page: p + 1 }),
    [updateSearch],
  );
  const setLimit = useCallback(
    (s: number) => updateSearch({ pageSize: s, page: undefined }),
    [updateSearch],
  );

  // Get filter options from suggestedValues (one query per category)
  const { data: districtSuggestions } = useSuspenseQuery(suggestedValuesOptions("district"));
  const { data: elevatorTypeSuggestions } = useSuspenseQuery(suggestedValuesOptions("elevator_type"));
  const { data: manufacturerSuggestions } = useSuspenseQuery(suggestedValuesOptions("manufacturer"));
  const filterOptions = useMemo(() => {
    const toSorted = (items: { value: string; active: boolean }[]) =>
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

  // Build query args
  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const filterBaseArgs = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filterDistrict.length > 0 ? { district: filterDistrict } : {}),
    ...(filterElevatorType.length > 0
      ? { elevatorType: filterElevatorType }
      : {}),
    ...(filterManufacturer.length > 0
      ? { manufacturer: filterManufacturer }
      : {}),
    ...(filterMaintenanceCompany.length > 0
      ? { maintenanceCompany: filterMaintenanceCompany }
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
    ...(sortField ? { sortBy: sortField } : {}),
    ...(sortOrder ? { sortOrder } : {}),
    page: page + 1,
    pageSize: limit,
  } as never;

  const { data: result, isLoading } = useQuery({
    ...listElevatorsOptions(queryArgs),
    placeholderData: keepPreviousData,
  });

  // Export data query
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

  // Trigger download when export data arrives
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
    filterMaintenanceCompany.length > 0 ||
    buildYearMin !== "" ||
    buildYearMax !== "" ||
    statusFilter !== "active";

  function clearAllFilters() {
    updateSearch({
      district: undefined,
      elevatorType: undefined,
      manufacturer: undefined,
      maintenanceCompany: undefined,
      buildYearMin: undefined,
      buildYearMax: undefined,
      status: undefined,
      page: undefined,
    });
  }

  const totalCount = result?.total ?? 0;
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="min-w-0 space-y-4">
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

function RegisterSkeleton() {
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
