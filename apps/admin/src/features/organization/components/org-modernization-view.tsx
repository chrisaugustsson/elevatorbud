import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { timelineOptions, budgetOptions, priorityListOptions } from "~/server/modernization";
import {
  PERIODS,
  getUrgencyColor,
  type TimelinePeriod,
} from "../../modernization/components/urgency-helpers";
import { PeriodSummaryCards } from "../../modernization/components/period-summary-cards";
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

  const { data: tidslinje } = useSuspenseQuery(timelineOptions(organizationId));

  const { data: budget } = useSuspenseQuery(budgetOptions(organizationId));

  const prioritetslistaArgs = useMemo(() => {
    const base = { organizationId, page: 1, pageSize: 50 };
    if (selectedPeriod) {
      return {
        ...base,
        yearFrom: selectedPeriod.yearFrom,
        yearTo: selectedPeriod.yearTo,
      };
    }
    return base;
  }, [organizationId, selectedPeriod]);

  const { data: prioritetslistaResult } = useSuspenseQuery(priorityListOptions(prioritetslistaArgs));

  const prioritetslista = prioritetslistaResult.items;

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

  // Group flat budget array by year, district, and type
  const byYearMap = new Map<string, number>();
  const byDistrictMap = new Map<string, number>();
  const byTypeMap = new Map<string, number>();
  for (const b of budget) {
    byYearMap.set(b.year, (byYearMap.get(b.year) ?? 0) + b.totalBudget);
    if (b.district) {
      byDistrictMap.set(b.district, (byDistrictMap.get(b.district) ?? 0) + b.totalBudget);
    }
    if (b.elevatorType) {
      byTypeMap.set(b.elevatorType, (byTypeMap.get(b.elevatorType) ?? 0) + b.totalBudget);
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
        elevators={prioritetslista}
        selectedPeriod={selectedPeriod}
        onClearPeriod={() => setSelectedPeriod(null)}
      />
    </div>
  );
}
