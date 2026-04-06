import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
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
  const orgFilter = { organization_id: organizationId } as never;

  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(
    null,
  );

  const tidslinjeOpts = convexQuery(
    api.elevators.modernization.timeline,
    orgFilter,
  );
  const { data: tidslinje } = useSuspenseQuery({
    queryKey: tidslinjeOpts.queryKey,
    staleTime: tidslinjeOpts.staleTime,
  }) as { data: { year: string; count: number }[] };

  const budgetOpts = convexQuery(
    api.elevators.modernization.budget,
    orgFilter,
  );
  const { data: budget } = useSuspenseQuery({
    queryKey: budgetOpts.queryKey,
    staleTime: budgetOpts.staleTime,
  }) as {
    data: {
      byYear: { year: string; amount: number }[];
      byDistrict: { name: string; amount: number }[];
      byType: { name: string; amount: number }[];
    };
  };

  const prioritetslistaArgs = useMemo(() => {
    const base = { organization_id: organizationId as never };
    if (selectedPeriod) {
      return {
        ...base,
        yearFrom: selectedPeriod.yearFrom,
        yearTo: selectedPeriod.yearTo,
      };
    }
    return base;
  }, [organizationId, selectedPeriod]);

  const prioritetslistaOpts = convexQuery(
    api.elevators.modernization.priorityList,
    prioritetslistaArgs as never,
  );
  const { data: prioritetslista } = useSuspenseQuery({
    queryKey: prioritetslistaOpts.queryKey,
    staleTime: prioritetslistaOpts.staleTime,
  }) as {
    data: {
      _id: string;
      elevator_number: string;
      address?: string;
      district?: string;
      elevator_type?: string;
      recommended_modernization_year?: string;
      budget_amount?: number;
      measures?: string;
      organization_id: string;
      organizationName: string;
    }[];
  };

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

  const budgetPerAr = budget.byYear.map((b) => ({
    name: b.year,
    belopp: Math.round(b.amount / 1000),
  }));

  let cumulative = 0;
  const budgetCumulative = budgetPerAr.map((b) => {
    cumulative += b.belopp;
    return { ...b, kumulativt: cumulative };
  });

  const budgetPerDistrikt = budget.byDistrict.map((b) => ({
    name: b.name,
    belopp: Math.round(b.amount / 1000),
  }));

  const budgetPerTyp = budget.byType.map((b) => ({
    name: b.name,
    belopp: Math.round(b.amount / 1000),
  }));

  const totalBudget = budget.byYear.reduce((sum, b) => sum + b.amount, 0);

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
