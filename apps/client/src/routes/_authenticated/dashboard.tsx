import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { KpiCards } from "@elevatorbud/ui/components/dashboard/kpi-cards";
import type { KpiItem } from "@elevatorbud/ui/components/dashboard/kpi-cards";
import {
  DashboardBarChart,
  DashboardPieChart,
} from "@elevatorbud/ui/components/dashboard/charts";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Building2,
  Calendar,
  Clock,
  Hammer,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  pendingComponent: DashboardSkeleton,
});

function DashboardPage() {
  const userOpts = convexQuery(api.users.me, {});
  const { data: user } = useSuspenseQuery({
    queryKey: userOpts.queryKey,
    staleTime: userOpts.staleTime,
  });

  const statsOpts = convexQuery(api.elevators.analytics.stats, {
    organization_id: user!.organization_id,
  } as never);
  const { data: stats } = useSuspenseQuery({
    queryKey: statsOpts.queryKey,
    staleTime: statsOpts.staleTime,
  });

  const chartOpts = convexQuery(api.elevators.analytics.chartData, {
    organization_id: user!.organization_id,
  } as never);
  const { data: chartData } = useSuspenseQuery({
    queryKey: chartOpts.queryKey,
    staleTime: chartOpts.staleTime,
  });

  const kpiItems: KpiItem[] = [
    {
      title: "Totalt antal hissar",
      value: stats.totalCount,
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      title: "Medelålder",
      value: `${stats.averageAge} år`,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      title: "Modernisering inom 3 år",
      value: stats.modernizationWithin3Years,
      description: "Rekommenderad modernisering",
      icon: <Hammer className="h-4 w-4" />,
    },
    {
      title: "Budget innevarande år",
      value: `${(stats.totalBudgetCurrentYear / 1000).toFixed(0)} tkr`,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      title: "Utan modernisering",
      value: stats.withoutModernization,
      description: "Ej ombyggda",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      title: "Senaste inventering",
      value: stats.lastInventory
        ? new Date(stats.lastInventory).toLocaleDateString("sv-SE")
        : "–",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <KpiCards items={kpiItems} />

      {stats.totalCount === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Inga hissar registrerade ännu.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DashboardBarChart
            title="Hissar per distrikt"
            data={chartData.byDistrict}
            color="var(--color-chart-1, #2563eb)"
          />

          <DashboardBarChart
            title="Åldersfördelning"
            data={chartData.ageDistribution}
            color="var(--color-chart-2, #16a34a)"
          />

          <DashboardPieChart
            title="Hisstyper"
            data={chartData.byElevatorType}
          />

          <DashboardBarChart
            title="Topp 10 fabrikat"
            data={chartData.topManufacturers}
            color="var(--color-chart-3, #d97706)"
          />

          <DashboardBarChart
            title="Moderniseringstidslinje"
            data={chartData.modernizationTimeline}
            color="var(--color-chart-4, #dc2626)"
          />

          <DashboardPieChart
            title="Skötselföretag"
            data={chartData.byMaintenanceCompany}
            innerRadius={60}
          />
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[380px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
