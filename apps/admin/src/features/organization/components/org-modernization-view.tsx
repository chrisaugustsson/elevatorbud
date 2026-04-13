import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useSuspenseQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { timelineOptions, budgetOptions, priorityListOptions } from "~/server/modernization";
import {
  PERIODS,
  getUrgencyColor,
  type TimelinePeriod,
} from "@elevatorbud/ui/components/modernization/urgency-helpers";
import { PeriodSummaryCards } from "@elevatorbud/ui/components/modernization/period-summary-cards";
import { TimelineChart } from "../../modernization/components/timeline-chart";
import { BudgetOverview } from "../../modernization/components/budget-overview";
import { PriorityList } from "../../modernization/components/priority-list";

export function OrgModernizationView({
  organizationId,
}: {
  organizationId: string;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const priorityListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(0);
  }, [selectedPeriod, selectedYear, selectedDistrict]);

  const scrollToPriorityList = useCallback(() => {
    setTimeout(() => {
      priorityListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

  const handleYearClick = useCallback((year: string) => {
    setSelectedYear((prev) => (prev === year ? null : year));
    setSelectedPeriod(null);
    scrollToPriorityList();
  }, [scrollToPriorityList]);

  const handlePeriodSelect = useCallback((period: TimelinePeriod | null) => {
    setSelectedPeriod(period);
    setSelectedYear(null);
  }, []);

  const handleDistrictClick = useCallback((district: string) => {
    setSelectedDistrict((prev) => (prev === district ? null : district));
    scrollToPriorityList();
  }, [scrollToPriorityList]);

  const { data: tidslinje } = useSuspenseQuery(timelineOptions(organizationId));

  const { data: budget } = useSuspenseQuery(budgetOptions(organizationId));

  const prioritetslistaArgs = useMemo(() => {
    const base: {
      organizationId: string;
      page: number;
      pageSize: number;
      yearFrom?: number;
      yearTo?: number;
      district?: string;
    } = { organizationId, page: page + 1, pageSize };
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
  }, [organizationId, selectedPeriod, selectedYear, selectedDistrict, page, pageSize]);

  const { data: prioritetslistaResult, isLoading } = useQuery({
    ...priorityListOptions(prioritetslistaArgs),
    placeholderData: keepPreviousData,
  });

  const tidslinjeData = tidslinje.map((t) => ({
    name: t.year,
    antal: t.count,
    fill: getUrgencyColor(parseInt(t.year, 10)),
  }));

  const periodSummary = PERIODS.map((p) => {
    const count = tidslinje
      .filter((t) => {
        const y = parseInt(t.year, 10);
        return y >= p.yearFrom && y <= p.yearTo;
      })
      .reduce((sum, t) => sum + t.count, 0);
    return { ...p, count };
  });

  // Group flat budget array by year and district
  const byYearMap = new Map<string, number>();
  const byDistrictMap = new Map<string, number>();
  for (const b of budget) {
    byYearMap.set(b.year, (byYearMap.get(b.year) ?? 0) + b.totalBudget);
    if (b.district) {
      byDistrictMap.set(b.district, (byDistrictMap.get(b.district) ?? 0) + b.totalBudget);
    }
  }

  const budgetPerAr = Array.from(byYearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, amount]) => ({
      name: year,
      belopp: Math.round(amount / 1000),
    }));

  let cumulative = 0;
  const budgetCumulative = budgetPerAr.map((b) => {
    cumulative += b.belopp;
    return { ...b, kumulativt: cumulative };
  });

  const budgetPerDistrikt = Array.from(byDistrictMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      belopp: Math.round(amount / 1000),
    }));

  const totalBudget = Array.from(byYearMap.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  const totalCount = prioritetslistaResult?.total ?? 0;
  const totalPages = prioritetslistaResult
    ? Math.ceil(prioritetslistaResult.total / prioritetslistaResult.pageSize)
    : 0;

  return (
    <div className="space-y-6 overflow-x-hidden">
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
          elevators={prioritetslistaResult?.items ?? []}
          selectedPeriod={selectedPeriod}
          selectedYear={selectedYear}
          selectedDistrict={selectedDistrict}
          onClearPeriod={() => setSelectedPeriod(null)}
          onClearYear={() => setSelectedYear(null)}
          onClearDistrict={() => setSelectedDistrict(null)}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
