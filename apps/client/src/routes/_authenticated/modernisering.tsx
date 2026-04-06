import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import {
  PERIODS,
  getUrgencyColor,
  type TimelinePeriod,
} from "../../features/modernization/components/urgency-helpers";
import { PeriodSummaryCards } from "../../features/modernization/components/period-summary-cards";
import { TimelineChart } from "../../features/modernization/components/timeline-chart";
import { BudgetOverview } from "../../features/modernization/components/budget-overview";
import { PriorityList } from "../../features/modernization/components/priority-list";
import { ModernizationSkeleton } from "../../features/modernization/components/modernization-skeleton";

export const Route = createFileRoute("/_authenticated/modernisering")({
  component: ModerniseringPage,
  pendingComponent: ModernizationSkeleton,
});

function ModerniseringPage() {
  const userOpts = convexQuery(api.users.me, {});
  const { data: user } = useSuspenseQuery({
    queryKey: userOpts.queryKey,
    staleTime: userOpts.staleTime,
  });

  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(
    null,
  );

  const orgArgs = { organization_id: user!.organization_id } as never;

  const tidslinjeOpts = convexQuery(api.elevators.modernization.timeline, orgArgs);
  const { data: tidslinje } = useSuspenseQuery({
    queryKey: tidslinjeOpts.queryKey,
    staleTime: tidslinjeOpts.staleTime,
  });

  const budgetOpts = convexQuery(api.elevators.modernization.budget, orgArgs);
  const { data: budget } = useSuspenseQuery({
    queryKey: budgetOpts.queryKey,
    staleTime: budgetOpts.staleTime,
  });

  const prioritetslistaArgs = useMemo(() => {
    const base = { organization_id: user!.organization_id } as Record<string, unknown>;
    if (selectedPeriod) {
      return { ...base, yearFrom: selectedPeriod.yearFrom, yearTo: selectedPeriod.yearTo };
    }
    return base;
  }, [user, selectedPeriod]);

  const { data: prioritetslista } = useSuspenseQuery({
    ...convexQuery(api.elevators.modernization.priorityList, prioritetslistaArgs as never),
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

  const budgetPerAr = budget.byYear.map(
    (b: { year: string; amount: number }) => ({
      name: b.year,
      amount: Math.round(b.amount / 1000),
    }),
  );

  let cumulative = 0;
  const budgetCumulative = budgetPerAr.map(
    (b: { name: string; amount: number }) => {
      cumulative += b.amount;
      return { ...b, kumulativt: cumulative };
    },
  );

  const budgetPerDistrikt = budget.byDistrict.map(
    (b: { name: string; amount: number }) => ({
      name: b.name,
      amount: Math.round(b.amount / 1000),
    }),
  );

  const budgetPerTyp = budget.byType.map(
    (b: { name: string; amount: number }) => ({
      name: b.name,
      amount: Math.round(b.amount / 1000),
    }),
  );

  const totalBudget = budget.byYear.reduce(
    (sum: number, b: { amount: number }) => sum + b.amount,
    0,
  );

  return (
    <div className="space-y-6">
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
        elevators={
          prioritetslista as {
            _id: string;
            elevator_number: string;
            address?: string;
            district?: string;
            recommended_modernization_year?: string;
            budget_amount?: number;
            measures?: string;
          }[]
        }
        selectedPeriod={selectedPeriod}
        onClearPeriod={() => setSelectedPeriod(null)}
      />
    </div>
  );
}
