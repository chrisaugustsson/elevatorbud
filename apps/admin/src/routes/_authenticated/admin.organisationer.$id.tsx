import { useState, Suspense } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { organizationOptions } from "~/server/organization";
import { statsOptions, chartDataOptions } from "~/server/analytics";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@elevatorbud/ui/components/ui/tabs";
import { KpiCards } from "@elevatorbud/ui/components/dashboard/kpi-cards";
import type { KpiItem } from "@elevatorbud/ui/components/dashboard/kpi-cards";
import {
  DashboardBarChart,
  DashboardPieChart,
} from "@elevatorbud/ui/components/dashboard/charts";
import {
  ArrowLeft,
  Building2,
  Clock,
  Hammer,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Users,
  ClipboardList,
  Wrench,
} from "lucide-react";
import {
  OrgRegisterView,
  RegisterViewSkeleton,
} from "~/features/organization/components/org-register-view";
import { OrgModernizationView } from "~/features/organization/components/org-modernization-view";
import { OrgMaintenanceView } from "~/features/organization/components/org-maintenance-view";
import {
  OrgUsersView,
  OrgUsersSkeleton,
} from "~/features/organization/components/org-users-view";
import { ModernizationSkeleton } from "~/features/modernization/components/modernization-skeleton";
import { MaintenanceSkeleton } from "~/features/maintenance/components/maintenance-skeleton";

export const Route = createFileRoute(
  "/_authenticated/admin/organisationer/$id",
)({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(organizationOptions(params.id));
    context.queryClient.prefetchQuery(statsOptions(params.id));
    context.queryClient.prefetchQuery(chartDataOptions(params.id));
  },
  component: OrganisationDetail,
  pendingComponent: DetailSkeleton,
});

const tabSlugs = [
  "oversikt",
  "hissar",
  "modernisering",
  "underhall",
  "anvandare",
] as const;
type TabSlug = (typeof tabSlugs)[number];

function getInitialTab(): TabSlug {
  if (typeof window === "undefined") return "oversikt";
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && tabSlugs.includes(tab as TabSlug)) return tab as TabSlug;
  return "oversikt";
}

function OrganisationDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabSlug>(getInitialTab);

  const { data: org } = useSuspenseQuery(organizationOptions(id));

  const { data: stats } = useSuspenseQuery(statsOptions(id));

  const { data: chartData } = useSuspenseQuery(chartDataOptions(id));

  function handleTabChange(value: string) {
    const tab = value as TabSlug;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="size-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">
          Organisationen hittades inte
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Den begärda organisationen finns inte eller har tagits bort.
        </p>
        <Link to="/admin/organisationer">
          <Button variant="outline" className="mt-4">
            Tillbaka till organisationer
          </Button>
        </Link>
      </div>
    );
  }

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
      value: `${(stats.budgetCurrentYear / 1000).toFixed(0)} tkr`,
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
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => router.history.back()}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-2xl font-bold">{org.name}</h1>
          </div>
          <div className="ml-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {org.organizationNumber && <span>{org.organizationNumber}</span>}
            {org.contactPerson && <span>{org.contactPerson}</span>}
            {org.email && <span>{org.email}</span>}
            {org.phoneNumber && <span>{org.phoneNumber}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="-mx-6 px-6">
          <TabsTrigger value="oversikt">Översikt</TabsTrigger>
          <TabsTrigger value="hissar" className="flex items-center gap-1.5">
            <ClipboardList className="size-3.5" />
            Hissar
          </TabsTrigger>
          <TabsTrigger
            value="modernisering"
            className="flex items-center gap-1.5"
          >
            <Hammer className="size-3.5" />
            Modernisering
          </TabsTrigger>
          <TabsTrigger value="underhall" className="flex items-center gap-1.5">
            <Wrench className="size-3.5" />
            Underhåll
          </TabsTrigger>
          <TabsTrigger value="anvandare" className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            Användare
          </TabsTrigger>
        </TabsList>

        {/* Översikt tab */}
        <TabsContent value="oversikt" className="space-y-6">
          {stats.totalCount === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Inga hissar registrerade för denna organisation.
            </div>
          ) : (
            <>
              <KpiCards items={kpiItems} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DashboardPieChart
                  title="Hisstyper"
                  data={chartData.byElevatorType}
                />
                <DashboardBarChart
                  title="Hissar per distrikt"
                  data={chartData.byDistrict}
                  color="var(--color-chart-1, #2563eb)"
                />
                <DashboardPieChart
                  title="Skötselföretag"
                  data={chartData.byMaintenanceCompany}
                  innerRadius={60}
                />
                <DashboardBarChart
                  title="Moderniseringstidslinje"
                  data={chartData.modernizationTimeline}
                  color="var(--color-chart-4, #dc2626)"
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Hissar tab */}
        <TabsContent value="hissar">
          <Suspense fallback={<RegisterViewSkeleton />}>
            <OrgRegisterView organizationId={id} />
          </Suspense>
        </TabsContent>

        {/* Modernisering tab */}
        <TabsContent value="modernisering">
          <Suspense fallback={<ModernizationSkeleton />}>
            <OrgModernizationView organizationId={id} />
          </Suspense>
        </TabsContent>

        {/* Underhåll tab */}
        <TabsContent value="underhall">
          <Suspense fallback={<MaintenanceSkeleton />}>
            <OrgMaintenanceView organizationId={id} />
          </Suspense>
        </TabsContent>

        {/* Användare tab */}
        <TabsContent value="anvandare">
          <Suspense fallback={<OrgUsersSkeleton />}>
            <OrgUsersView organizationId={id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="ml-10 flex items-center gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-xl" />
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[380px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
