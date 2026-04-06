import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { timelineOptions, budgetOptions, priorityListOptions } from "~/server/modernization";
import {
  PERIODS,
  getUrgencyColor,
  type TimelinePeriod,
} from "@elevatorbud/ui/components/modernization/urgency-helpers";
import { PeriodSummaryCards } from "@elevatorbud/ui/components/modernization/period-summary-cards";
import { TimelineChart } from "../../features/modernization/components/timeline-chart";
import { BudgetOverview } from "../../features/modernization/components/budget-overview";
import { PriorityList } from "../../features/modernization/components/priority-list";
import { ModernizationSkeleton } from "@elevatorbud/ui/components/modernization/modernization-skeleton";

export const Route = createFileRoute("/_authenticated/modernisering")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(timelineOptions());
    context.queryClient.prefetchQuery(budgetOptions());
    context.queryClient.prefetchQuery(priorityListOptions({ page: 1, pageSize: 50 }));
  },
  component: Modernisering,
  pendingComponent: ModernizationSkeleton,
});

function Modernisering() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(
    null,
  );

  const { data: tidslinje } = useSuspenseQuery(timelineOptions());

  const { data: budget } = useSuspenseQuery(budgetOptions());

  const prioritetslistaArgs = useMemo(() => {
    const base = { page: 1, pageSize: 50 };
    if (selectedPeriod) {
      return {
        ...base,
        yearFrom: selectedPeriod.yearFrom,
        yearTo: selectedPeriod.yearTo,
      };
    }
    return base;
  }, [selectedPeriod]);

  const { data: prioritetslista } = useSuspenseQuery(priorityListOptions(prioritetslistaArgs));

  // Timeline chart data with color coding
  const tidslinjeData = tidslinje.map((t: { year: string; count: number }) => ({
    name: t.year,
    antal: t.count,
    fill: getUrgencyColor(parseInt(t.year, 10)),
  }));

  // Period summary for clickable buttons
  const periodSummary = PERIODS.map((p) => {
    const count = tidslinje
      .filter((t: { year: string }) => {
        const y = parseInt(t.year, 10);
        return y >= p.yearFrom && y <= p.yearTo;
      })
      .reduce((sum: number, t: { count: number }) => sum + t.count, 0);
    return { ...p, count };
  });

  // Group flat budget array by year, district, and type
  const byYearMap = new Map<string, number>();
  const byDistrictMap = new Map<string, number>();
  const byTypeMap = new Map<string, number>();
  for (const b of budget) {
    const yr = b.year as string;
    const tb = b.totalBudget as number;
    byYearMap.set(yr, (byYearMap.get(yr) ?? 0) + tb);
    if (b.district) {
      const d = b.district as string;
      byDistrictMap.set(d, (byDistrictMap.get(d) ?? 0) + tb);
    }
    if (b.elevatorType) {
      const t = b.elevatorType as string;
      byTypeMap.set(t, (byTypeMap.get(t) ?? 0) + tb);
    }
  }

  const budgetPerAr = Array.from(byYearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, amount]) => ({
      name: year,
      belopp: Math.round(amount / 1000),
    }));

  let cumulative = 0;
  const budgetCumulative = budgetPerAr.map(
    (b: { name: string; belopp: number }) => {
      cumulative += b.belopp;
      return { ...b, kumulativt: cumulative };
    },
  );

  const budgetPerDistrikt = Array.from(byDistrictMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      belopp: Math.round(amount / 1000),
    }));

  const budgetPerTyp = Array.from(byTypeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      belopp: Math.round(amount / 1000),
    }));

  const totalBudget = Array.from(byYearMap.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  return (
    <div className="space-y-6 overflow-x-hidden">
      <h1 className="text-2xl font-bold text-foreground">
        Moderniseringsplanering
      </h1>

      <PeriodSummaryCards
        periods={periodSummary}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
      />

      <TimelineChart data={tidslinjeData} />

      <BudgetOverview
        totalBudget={totalBudget}
        budgetCumulative={budgetCumulative}
        budgetPerDistrikt={budgetPerDistrikt}
        budgetPerTyp={budgetPerTyp}
      />

      <PriorityList
        elevators={prioritetslista.items}
        selectedPeriod={selectedPeriod}
        onClearPeriod={() => setSelectedPeriod(null)}
      />
    </div>
  );
}
