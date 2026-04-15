import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useCallback, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { meOptions } from "../../../server/user";
import { statsOptions, singleChartOptions } from "../../../server/analytics";
import type { ChartType } from "../../../server/analytics";
import { KpiCards } from "@elevatorbud/ui/components/dashboard/kpi-cards";
import type { KpiItem } from "@elevatorbud/ui/components/dashboard/kpi-cards";
import {
  DashboardBarChart,
  DashboardPieChart,
} from "@elevatorbud/ui/components/dashboard/charts";
import type { ChartDataPoint } from "@elevatorbud/ui/components/dashboard/charts";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import {
  Building2,
  Calendar,
  Clock,
  Hammer,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  BarChart3,
} from "lucide-react";

const CHART_TYPES: ChartType[] = [
  "byDistrict",
  "byElevatorType",
  "topManufacturers",
  "byMaintenanceCompany",
  "ageDistribution",
  "modernizationTimeline",
];

export const Route = createFileRoute("/_authenticated/$parentOrgId/dashboard")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(statsOptions(params.parentOrgId));
    for (const chartType of CHART_TYPES) {
      context.queryClient.prefetchQuery(
        singleChartOptions(params.parentOrgId, chartType),
      );
    }
  },
  component: DashboardPage,
  pendingComponent: DashboardSkeleton,
});

// --- Error Boundary ---

interface ChartErrorBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
  title: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Error logged by React
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{this.props.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">Kunde inte ladda data</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onRetry();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Försök igen
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// --- Chart Skeleton ---

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// --- Empty Chart ---

function EmptyChart({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8" aria-hidden="true" />
          <p className="text-sm font-medium">Ingen data ännu</p>
          {subtitle && (
            <p className="max-w-[260px] text-xs">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Individual Chart Components ---

function DistrictChart({ parentOrgId }: { parentOrgId: string }) {
  const { data } = useSuspenseQuery(
    singleChartOptions(parentOrgId, "byDistrict"),
  );
  if (data.length === 0)
    return (
      <EmptyChart
        title="Hissar per distrikt"
        subtitle="Inga hissar har tilldelats ett distrikt ännu."
      />
    );
  return (
    <DistrictChartInner data={data} parentOrgId={parentOrgId} />
  );
}

function DistrictChartInner({
  data,
  parentOrgId,
}: {
  data: ChartDataPoint[];
  parentOrgId: string;
}) {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (label: string) =>
      navigate({
        to: "/$parentOrgId/register",
        params: { parentOrgId },
        search: { district: [label] },
      }),
    [navigate, parentOrgId],
  );
  return (
    <DashboardBarChart
      title="Hissar per distrikt"
      data={data}
      color="var(--color-chart-1, #2563eb)"
      onBarClick={handleClick}
    />
  );
}

function AgeDistributionChart({ parentOrgId }: { parentOrgId: string }) {
  const { data } = useSuspenseQuery(
    singleChartOptions(parentOrgId, "ageDistribution"),
  );
  if (data.length === 0)
    return (
      <EmptyChart
        title="Åldersfördelning"
        subtitle="Ingen byggår registrerat på hissarna ännu."
      />
    );
  return (
    <AgeDistributionChartInner data={data} parentOrgId={parentOrgId} />
  );
}

function AgeDistributionChartInner({
  data,
  parentOrgId,
}: {
  data: ChartDataPoint[];
  parentOrgId: string;
}) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const handleClick = useCallback(
    (label: string) => {
      if (label === "Okant") return;
      if (label.startsWith("50+")) {
        navigate({
          to: "/$parentOrgId/register",
          params: { parentOrgId },
          search: { buildYearMax: currentYear - 50 },
        });
        return;
      }
      const match = label.match(/^(\d+)-(\d+)/);
      if (!match) return;
      const minAge = parseInt(match[1], 10);
      const maxAge = parseInt(match[2], 10);
      navigate({
        to: "/$parentOrgId/register",
        params: { parentOrgId },
        search: { buildYearMin: currentYear - maxAge, buildYearMax: currentYear - minAge },
      });
    },
    [navigate, parentOrgId, currentYear],
  );
  return (
    <DashboardBarChart
      title="Åldersfördelning"
      data={data}
      color="var(--color-chart-2, #16a34a)"
      onBarClick={handleClick}
    />
  );
}

function ElevatorTypeChart({ parentOrgId }: { parentOrgId: string }) {
  const { data } = useSuspenseQuery(
    singleChartOptions(parentOrgId, "byElevatorType"),
  );
  if (data.length === 0)
    return (
      <EmptyChart
        title="Hisstyper"
        subtitle="Inga hisstyper är registrerade ännu."
      />
    );
  return <ElevatorTypeChartInner data={data} parentOrgId={parentOrgId} />;
}

function ElevatorTypeChartInner({
  data,
  parentOrgId,
}: {
  data: ChartDataPoint[];
  parentOrgId: string;
}) {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (label: string) =>
      navigate({
        to: "/$parentOrgId/register",
        params: { parentOrgId },
        search: { elevatorType: [label] },
      }),
    [navigate, parentOrgId],
  );
  return (
    <DashboardPieChart title="Hisstyper" data={data} onSliceClick={handleClick} />
  );
}

function ManufacturerChart({ parentOrgId }: { parentOrgId: string }) {
  const { data } = useSuspenseQuery(
    singleChartOptions(parentOrgId, "topManufacturers"),
  );
  if (data.length === 0)
    return (
      <EmptyChart
        title="Topp 10 fabrikat"
        subtitle="Inga fabrikat är registrerade på hissarna ännu."
      />
    );
  return <ManufacturerChartInner data={data} parentOrgId={parentOrgId} />;
}

function ManufacturerChartInner({
  data,
  parentOrgId,
}: {
  data: ChartDataPoint[];
  parentOrgId: string;
}) {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (label: string) =>
      navigate({
        to: "/$parentOrgId/register",
        params: { parentOrgId },
        search: { manufacturer: [label] },
      }),
    [navigate, parentOrgId],
  );
  return (
    <DashboardBarChart
      title="Topp 10 fabrikat"
      data={data}
      color="var(--color-chart-3, #d97706)"
      onBarClick={handleClick}
    />
  );
}

function ModernizationTimelineChart({
  parentOrgId,
}: {
  parentOrgId: string;
}) {
  const { data } = useSuspenseQuery(
    singleChartOptions(parentOrgId, "modernizationTimeline"),
  );
  if (data.length === 0)
    return (
      <EmptyChart
        title="Moderniseringstidslinje"
        subtitle="Inga planerade moderniseringar registrerade ännu."
      />
    );
  return (
    <ModernizationTimelineChartInner data={data} parentOrgId={parentOrgId} />
  );
}

function ModernizationTimelineChartInner({
  data,
  parentOrgId,
}: {
  data: ChartDataPoint[];
  parentOrgId: string;
}) {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (label: string) =>
      navigate({
        to: "/$parentOrgId/modernisering",
        params: { parentOrgId },
        search: { year: label },
      }),
    [navigate, parentOrgId],
  );
  return (
    <DashboardBarChart
      title="Moderniseringstidslinje"
      data={data}
      color="var(--color-chart-4, #dc2626)"
      onBarClick={handleClick}
    />
  );
}

function MaintenanceCompanyChart({
  parentOrgId,
}: {
  parentOrgId: string;
}) {
  const { data } = useSuspenseQuery(
    singleChartOptions(parentOrgId, "byMaintenanceCompany"),
  );
  if (data.length === 0)
    return (
      <EmptyChart
        title="Skötselföretag"
        subtitle="Inget skötselföretag är registrerat på hissarna ännu."
      />
    );
  return (
    <MaintenanceCompanyChartInner data={data} parentOrgId={parentOrgId} />
  );
}

function MaintenanceCompanyChartInner({
  data,
  parentOrgId,
}: {
  data: ChartDataPoint[];
  parentOrgId: string;
}) {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (label: string) =>
      navigate({
        to: "/$parentOrgId/register",
        params: { parentOrgId },
        search: { maintenanceCompany: [label] },
      }),
    [navigate, parentOrgId],
  );
  return (
    <DashboardPieChart
      title="Skötselföretag"
      data={data}
      innerRadius={60}
      onSliceClick={handleClick}
    />
  );
}

// --- Chart Wrapper ---

function ChartWithBoundary({
  title,
  parentOrgId,
  chartType,
  children,
}: {
  title: string;
  parentOrgId: string;
  chartType: ChartType;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["analytics", "chart", parentOrgId, chartType],
    });
  }, [queryClient, parentOrgId, chartType]);

  return (
    <ChartErrorBoundary title={title} onRetry={handleRetry}>
      <Suspense fallback={<ChartSkeleton />}>{children}</Suspense>
    </ChartErrorBoundary>
  );
}

// --- Main Dashboard ---

function DashboardPage() {
  const { parentOrgId } = Route.useParams();
  const { data: stats } = useSuspenseQuery(statsOptions(parentOrgId));

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
      <h1
        id="page-heading"
        className="text-2xl font-bold text-foreground focus:outline-none"
      >
        Dashboard
      </h1>

      <KpiCards items={kpiItems} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartWithBoundary
          title="Hissar per distrikt"
          parentOrgId={parentOrgId}
          chartType="byDistrict"
        >
          <DistrictChart parentOrgId={parentOrgId} />
        </ChartWithBoundary>

        <ChartWithBoundary
          title="Åldersfördelning"
          parentOrgId={parentOrgId}
          chartType="ageDistribution"
        >
          <AgeDistributionChart parentOrgId={parentOrgId} />
        </ChartWithBoundary>

        <ChartWithBoundary
          title="Hisstyper"
          parentOrgId={parentOrgId}
          chartType="byElevatorType"
        >
          <ElevatorTypeChart parentOrgId={parentOrgId} />
        </ChartWithBoundary>

        <ChartWithBoundary
          title="Topp 10 fabrikat"
          parentOrgId={parentOrgId}
          chartType="topManufacturers"
        >
          <ManufacturerChart parentOrgId={parentOrgId} />
        </ChartWithBoundary>

        <ChartWithBoundary
          title="Moderniseringstidslinje"
          parentOrgId={parentOrgId}
          chartType="modernizationTimeline"
        >
          <ModernizationTimelineChart parentOrgId={parentOrgId} />
        </ChartWithBoundary>

        <ChartWithBoundary
          title="Skötselföretag"
          parentOrgId={parentOrgId}
          chartType="byMaintenanceCompany"
        >
          <MaintenanceCompanyChart parentOrgId={parentOrgId} />
        </ChartWithBoundary>
      </div>
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
          <ChartSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
