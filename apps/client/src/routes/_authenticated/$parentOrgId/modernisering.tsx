import { useMemo, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { meOptions } from "../../../server/user";
import {
  timelineOptions,
  budgetOptions,
  priorityListOptions,
  subOrgBreakdownOptions,
} from "../../../server/modernization";
import { childOrgsOptions } from "../../../server/context";
import {
  PERIODS,
  getUrgencyColor,
  getPeriodByKey,
  type TimelinePeriod,
  type PeriodKey,
} from "@elevatorbud/ui/components/modernization/urgency-helpers";
import { PeriodSummaryCards } from "@elevatorbud/ui/components/modernization/period-summary-cards";
import { TimelineChart } from "../../../features/modernization/components/timeline-chart";
import { BudgetOverview } from "../../../features/modernization/components/budget-overview";
import { PriorityList } from "../../../features/modernization/components/priority-list";
import { SubOrgBreakdownChart } from "../../../features/modernization/components/sub-org-breakdown-chart";
import { ModernizationSkeleton } from "@elevatorbud/ui/components/modernization/modernization-skeleton";
import { FilterChip } from "../../../shared/components/filter-chip";

type ModerniseringSearch = {
  period?: PeriodKey;
  year?: string;
  district?: string;
  subOrg?: string;
  page?: number;
  pageSize?: number;
};

const VALID_PERIODS: PeriodKey[] = ["akut", "2-4", "5-9", "10+"];

export const Route = createFileRoute("/_authenticated/$parentOrgId/modernisering")({
  validateSearch: (search: Record<string, unknown>): ModerniseringSearch => ({
    period: VALID_PERIODS.includes(search.period as PeriodKey)
      ? (search.period as PeriodKey)
      : undefined,
    year: typeof search.year === "string" && /^\d+$/.test(search.year)
      ? search.year
      : undefined,
    district:
      typeof search.district === "string" && search.district
        ? search.district
        : undefined,
    subOrg:
      typeof search.subOrg === "string" && search.subOrg
        ? search.subOrg
        : undefined,
    page: typeof search.page === "number" && search.page > 0 ? search.page : undefined,
    pageSize:
      typeof search.pageSize === "number" && [25, 50, 100].includes(search.pageSize)
        ? search.pageSize
        : undefined,
  }),
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(timelineOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(budgetOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(priorityListOptions({ parentOrgId: params.parentOrgId, page: 1, pageSize: 25 }));
    context.queryClient.prefetchQuery(childOrgsOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(subOrgBreakdownOptions(params.parentOrgId));
  },
  component: ModerniseringPage,
  pendingComponent: ModernizationSkeleton,
});

function ModerniseringPage() {
  const { parentOrgId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const priorityListRef = useRef<HTMLDivElement>(null);

  const selectedPeriod: TimelinePeriod | null = getPeriodByKey(search.period);
  const selectedYear = search.year ?? null;
  const selectedDistrict = search.district ?? null;
  const selectedSubOrg = search.subOrg ?? null;
  const page = (search.page ?? 1) - 1;
  const pageSize = search.pageSize ?? 25;

  const { data: childOrgs } = useQuery(childOrgsOptions(parentOrgId));
  const hasChildren = (childOrgs?.length ?? 0) > 0;
  const { data: subOrgBreakdown } = useQuery({
    ...subOrgBreakdownOptions(parentOrgId),
    enabled: hasChildren,
  });

  const selectedSubOrgName = useMemo(() => {
    if (!selectedSubOrg || !childOrgs) return null;
    return childOrgs.find((o) => o.id === selectedSubOrg)?.name ?? null;
  }, [selectedSubOrg, childOrgs]);

  const updateSearch = useCallback(
    (next: Partial<ModerniseringSearch>) => {
      navigate({
        search: (prev) => {
          const merged = { ...prev, ...next };
          if (!merged.period) delete merged.period;
          if (!merged.year) delete merged.year;
          if (!merged.district) delete merged.district;
          if (!merged.subOrg) delete merged.subOrg;
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

  const scrollToPriorityList = useCallback(() => {
    setTimeout(() => {
      priorityListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  const handleYearClick = useCallback(
    (year: string) => {
      updateSearch({
        year: selectedYear === year ? undefined : year,
        period: undefined,
        page: undefined,
      });
      scrollToPriorityList();
    },
    [selectedYear, updateSearch, scrollToPriorityList],
  );

  const handlePeriodSelect = useCallback(
    (period: TimelinePeriod | null) => {
      updateSearch({
        period: period?.key,
        year: undefined,
        page: undefined,
      });
    },
    [updateSearch],
  );

  const handleDistrictClick = useCallback(
    (district: string) => {
      updateSearch({
        district: selectedDistrict === district ? undefined : district,
        page: undefined,
      });
      scrollToPriorityList();
    },
    [selectedDistrict, updateSearch, scrollToPriorityList],
  );

  const handleSubOrgClick = useCallback(
    (orgId: string) => {
      updateSearch({
        subOrg: selectedSubOrg === orgId ? undefined : orgId,
        page: undefined,
      });
    },
    [selectedSubOrg, updateSearch],
  );

  const { data: tidslinje } = useSuspenseQuery(timelineOptions(parentOrgId, selectedSubOrg ?? undefined));
  const { data: budget } = useSuspenseQuery(budgetOptions(parentOrgId, selectedSubOrg ?? undefined));

  const prioritetslistaArgs = useMemo(() => {
    const base: {
      parentOrgId: string;
      subOrgId?: string;
      page: number;
      pageSize: number;
      yearFrom?: number;
      yearTo?: number;
      district?: string;
    } = { parentOrgId, page: page + 1, pageSize, subOrgId: selectedSubOrg ?? undefined };
    if (selectedYear) {
      const y = parseInt(selectedYear, 10);
      base.yearFrom = y;
      base.yearTo = y;
    } else if (selectedPeriod) {
      base.yearFrom = selectedPeriod.yearFrom;
      base.yearTo = selectedPeriod.yearTo;
    }
    if (selectedDistrict) {
      base.district = selectedDistrict;
    }
    return base;
  }, [parentOrgId, selectedPeriod, selectedYear, selectedDistrict, selectedSubOrg, page, pageSize]);

  const { data: prioritetslista, isLoading } = useQuery({
    ...priorityListOptions(prioritetslistaArgs),
    placeholderData: keepPreviousData,
  });

  const tidslinjeData = tidslinje.map((t: { year: string; count: number }) => ({
    name: t.year,
    count: t.count,
    fill: getUrgencyColor(parseInt(t.year, 10)),
  }));

  const periodSummary = PERIODS.map((p) => {
    const count = tidslinje
      .filter((t: { year: string }) => {
        const y = parseInt(t.year, 10);
        return y >= p.yearFrom && y <= p.yearTo;
      })
      .reduce((sum: number, t: { count: number }) => sum + t.count, 0);
    return { ...p, count };
  });

  const byYearMap = new Map<string, number>();
  const byDistrictMap = new Map<string, number>();
  for (const b of budget) {
    const yr = b.year as string;
    const tb = b.totalBudget as number;
    byYearMap.set(yr, (byYearMap.get(yr) ?? 0) + tb);
    if (b.district) {
      const d = b.district as string;
      byDistrictMap.set(d, (byDistrictMap.get(d) ?? 0) + tb);
    }
  }

  const budgetPerAr = Array.from(byYearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, amount]) => ({
      name: year,
      amount: Math.round(amount / 1000),
    }));

  let cumulative = 0;
  const budgetCumulative = budgetPerAr.map(
    (b: { name: string; amount: number }) => {
      cumulative += b.amount;
      return { ...b, kumulativt: cumulative };
    },
  );

  const budgetPerDistrikt = Array.from(byDistrictMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount / 1000),
    }));

  const totalBudget = Array.from(byYearMap.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  const totalCount = prioritetslista?.total ?? 0;
  const totalPages = prioritetslista
    ? Math.ceil(prioritetslista.total / prioritetslista.pageSize)
    : 0;

  return (
    <div className="space-y-6">
      <h1
        id="page-heading"
        className="text-2xl font-bold text-foreground focus:outline-none"
      >
        Moderniseringsplanering
      </h1>

      {selectedSubOrgName && (
        <div className="flex items-center gap-2">
          <FilterChip
            label={selectedSubOrgName}
            onRemove={() =>
              updateSearch({ subOrg: undefined, page: undefined })
            }
          />
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {selectedSubOrgName
          ? `Filtrerad till ${selectedSubOrgName}`
          : "Visar alla organisationer"}
      </div>

      {hasChildren && subOrgBreakdown && (
        <SubOrgBreakdownChart
          data={subOrgBreakdown}
          onSubOrgClick={handleSubOrgClick}
          selectedSubOrgId={selectedSubOrg}
        />
      )}

      <PeriodSummaryCards
        periods={periodSummary}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={handlePeriodSelect}
      />

      <TimelineChart data={tidslinjeData} onYearClick={handleYearClick} selectedYear={selectedYear} />

      <BudgetOverview
        totalBudget={totalBudget}
        budgetCumulative={budgetCumulative}
        budgetPerDistrikt={budgetPerDistrikt}
        onYearClick={handleYearClick}
        selectedYear={selectedYear}
        onDistrictClick={handleDistrictClick}
        selectedDistrict={selectedDistrict}
      />

      <div ref={priorityListRef}>
        <PriorityList
          elevators={
            (prioritetslista?.items ?? []) as {
              id: string;
              elevatorNumber: string;
              address?: string;
              district?: string;
              recommendedModernizationYear?: string;
              budgetAmount?: number;
              modernizationMeasures?: string;
            }[]
          }
          selectedPeriod={selectedPeriod}
          selectedYear={selectedYear}
          selectedDistrict={selectedDistrict}
          selectedSubOrgName={selectedSubOrgName}
          onClearPeriod={() => updateSearch({ period: undefined, page: undefined })}
          onClearYear={() => updateSearch({ year: undefined, page: undefined })}
          onClearDistrict={() => updateSearch({ district: undefined, page: undefined })}
          onClearSubOrg={() => updateSearch({ subOrg: undefined, page: undefined })}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          onPageChange={(p) => updateSearch({ page: p + 1 })}
          onPageSizeChange={(s) => updateSearch({ pageSize: s, page: undefined })}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
