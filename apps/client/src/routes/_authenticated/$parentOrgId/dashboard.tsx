import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { meOptions } from "../../../server/user";
import { statsOptions, chartDataOptions } from "../../../server/analytics";
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

export const Route = createFileRoute("/_authenticated/$parentOrgId/dashboard")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(statsOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(chartDataOptions(params.parentOrgId));
  },
  component: DashboardPage,
  pendingComponent: DashboardSkeleton,
});

function DashboardPage() {
  const { parentOrgId } = Route.useParams();
  const { data: stats } = useSuspenseQuery(statsOptions(parentOrgId));

  const { data: chartData } = useSuspenseQuery(chartDataOptions(parentOrgId));

  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const goToRegister = useCallback(
    (searchParams: Record<string, string | number | string[]>) => {
      navigate({ to: "/$parentOrgId/register", params: { parentOrgId }, search: searchParams });
    },
    [navigate, parentOrgId],
  );

  const handleDistrictClick = useCallback(
    (label: string) => goToRegister({ district: [label] }),
    [goToRegister],
  );

  const handleTypeClick = useCallback(
    (label: string) => goToRegister({ elevatorType: [label] }),
    [goToRegister],
  );

  const handleManufacturerClick = useCallback(
    (label: string) => goToRegister({ manufacturer: [label] }),
    [goToRegister],
  );

  const handleMaintenanceCompanyClick = useCallback(
    (label: string) => goToRegister({ maintenanceCompany: [label] }),
    [goToRegister],
  );

  const handleAgeClick = useCallback(
    (label: string) => {
      // Labels: "0-9 ar", "10-19 ar", ..., "50+ ar", "Okant"
      if (label === "Okant") return;
      if (label.startsWith("50+")) {
        goToRegister({ buildYearMax: currentYear - 50 });
        return;
      }
      const match = label.match(/^(\d+)-(\d+)/);
      if (!match) return;
      const minAge = parseInt(match[1], 10);
      const maxAge = parseInt(match[2], 10);
      goToRegister({
        buildYearMin: currentYear - maxAge,
        buildYearMax: currentYear - minAge,
      });
    },
    [goToRegister, currentYear],
  );

  const handleTimelineClick = useCallback(
    (label: string) => {
      navigate({ to: "/$parentOrgId/modernisering", params: { parentOrgId }, search: { year: label } });
    },
    [navigate, parentOrgId],
  );

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
      value: stats.modernizationWithin3Years as number,
      description: "Rekommenderad modernisering",
      icon: <Hammer className="h-4 w-4" />,
    },
    {
      title: "Budget innevarande år",
      value: `${((stats.budgetCurrentYear as number) / 1000).toFixed(0)} tkr`,
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
            onBarClick={handleDistrictClick}
          />

          <DashboardBarChart
            title="Åldersfördelning"
            data={chartData.ageDistribution}
            color="var(--color-chart-2, #16a34a)"
            onBarClick={handleAgeClick}
          />

          <DashboardPieChart
            title="Hisstyper"
            data={chartData.byElevatorType}
            onSliceClick={handleTypeClick}
          />

          <DashboardBarChart
            title="Topp 10 fabrikat"
            data={chartData.topManufacturers}
            color="var(--color-chart-3, #d97706)"
            onBarClick={handleManufacturerClick}
          />

          <DashboardBarChart
            title="Moderniseringstidslinje"
            data={chartData.modernizationTimeline}
            color="var(--color-chart-4, #dc2626)"
            onBarClick={handleTimelineClick}
          />

          <DashboardPieChart
            title="Skötselföretag"
            data={chartData.byMaintenanceCompany}
            innerRadius={60}
            onSliceClick={handleMaintenanceCompanyClick}
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
