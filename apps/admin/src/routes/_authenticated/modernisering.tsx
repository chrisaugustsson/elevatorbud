import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSelectedOrg } from "../../shared/lib/org-context";
import {
  PERIODS,
  getUrgencyColor,
  type TimelinePeriod,
} from "../../features/modernization/components/urgency-helpers";
import { PeriodSummaryCards } from "../../features/modernization/components/period-summary-cards";
import { TimelineChart } from "../../features/modernization/components/timeline-chart";
import { BudgetOverview } from "../../features/modernization/components/budget-overview";
import { MeasuresCard } from "../../features/modernization/components/measures-card";
import { PriorityList } from "../../features/modernization/components/priority-list";
import { ModernizationSkeleton } from "../../features/modernization/components/modernization-skeleton";

export const Route = createFileRoute("/_authenticated/modernisering")({
  component: Modernisering,
});

function Modernisering() {
  const { selectedOrgId } = useSelectedOrg();
  const orgFilter = selectedOrgId
    ? ({ organization_id: selectedOrgId } as never)
    : {};

  const [selectedPeriod, setSelectedPeriod] = useState<TimelinePeriod | null>(
    null,
  );

  const tidslinje = useQuery(api.elevators.modernization.timeline, orgFilter);
  const budget = useQuery(api.elevators.modernization.budget, orgFilter);
  const atgarder = useQuery(api.elevators.modernization.measures, orgFilter);

  const prioritetslistaArgs = useMemo(() => {
    const base = selectedOrgId
      ? { organization_id: selectedOrgId as never }
      : {};
    if (selectedPeriod) {
      return {
        ...base,
        yearFrom: selectedPeriod.yearFrom,
        yearTo: selectedPeriod.yearTo,
      };
    }
    return base;
  }, [selectedOrgId, selectedPeriod]);

  const prioritetslista = useQuery(
    api.elevators.modernization.priorityList,
    prioritetslistaArgs as never,
  );

  if (
    tidslinje === undefined ||
    budget === undefined ||
    atgarder === undefined ||
    prioritetslista === undefined
  ) {
    return <ModernizationSkeleton />;
  }

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

  // Budget per year with cumulative curve
  const budgetPerAr = budget.byYear.map(
    (b: { year: string; amount: number }) => ({
      name: b.year,
      belopp: Math.round(b.amount / 1000),
    }),
  );

  let cumulative = 0;
  const budgetCumulative = budgetPerAr.map(
    (b: { name: string; belopp: number }) => {
      cumulative += b.belopp;
      return { ...b, kumulativt: cumulative };
    },
  );

  // Budget per district
  const budgetPerDistrikt = budget.byDistrict.map(
    (b: { name: string; amount: number }) => ({
      name: b.name,
      belopp: Math.round(b.amount / 1000),
    }),
  );

  // Budget per type
  const budgetPerTyp = budget.byType.map(
    (b: { name: string; amount: number }) => ({
      name: b.name,
      belopp: Math.round(b.amount / 1000),
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

      <MeasuresCard
        measures={atgarder as { measure: string; count: number }[]}
      />

      <PriorityList
        elevators={
          prioritetslista as {
            _id: string;
            elevator_number: string;
            address?: string;
            district?: string;
            elevator_type?: string;
            recommended_modernization_year?: string;
            budget_amount?: number;
            modernization_measures?: string;
            organizationName: string;
          }[]
        }
        selectedPeriod={selectedPeriod}
        onClearPeriod={() => setSelectedPeriod(null)}
      />
    </div>
  );
}
