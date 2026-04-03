import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
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
import { OrgRegisterView } from "~/features/organization/components/org-register-view";
import { OrgModernizationView } from "~/features/organization/components/org-modernization-view";
import { OrgMaintenanceView } from "~/features/organization/components/org-maintenance-view";
import { OrgUsersView } from "~/features/organization/components/org-users-view";

export const Route = createFileRoute(
  "/_authenticated/admin/organisationer/$id",
)({
  component: OrganisationDetail,
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

  const org = useQuery(api.organizations.get, { id } as never) as
    | {
        _id: string;
        name: string;
        organization_number?: string;
        contact_person?: string;
        phone_number?: string;
        email?: string;
      }
    | null
    | undefined;

  const stats = useQuery(
    api.elevators.analytics.stats,
    { organization_id: id } as never,
  ) as
    | {
        totalCount: number;
        averageAge: number;
        modernizationWithin3Years: number;
        totalBudgetCurrentYear: number;
        withoutModernization: number;
        lastInventory: number | null;
      }
    | undefined;

  const chartData = useQuery(
    api.elevators.analytics.chartData,
    { organization_id: id } as never,
  ) as
    | {
        byDistrict: { name: string; count: number }[];
        ageDistribution: { name: string; count: number }[];
        byElevatorType: { name: string; count: number }[];
        topManufacturers: { name: string; count: number }[];
        modernizationTimeline: { name: string; count: number }[];
        byMaintenanceCompany: { name: string; count: number }[];
      }
    | undefined;

  function handleTabChange(value: string) {
    const tab = value as TabSlug;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }

  if (org === undefined) {
    return <DetailSkeleton />;
  }

  if (org === null) {
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

  const kpiItems: KpiItem[] = stats
    ? [
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
      ]
    : [];

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
            {org.organization_number && <span>{org.organization_number}</span>}
            {org.contact_person && <span>{org.contact_person}</span>}
            {org.email && <span>{org.email}</span>}
            {org.phone_number && <span>{org.phone_number}</span>}
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
          {stats === undefined || chartData === undefined ? (
            <OverviewSkeleton />
          ) : stats.totalCount === 0 ? (
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
          <OrgRegisterView organizationId={id} />
        </TabsContent>

        {/* Modernisering tab */}
        <TabsContent value="modernisering">
          <OrgModernizationView organizationId={id} />
        </TabsContent>

        {/* Underhåll tab */}
        <TabsContent value="underhall">
          <OrgMaintenanceView organizationId={id} />
        </TabsContent>

        {/* Användare tab */}
        <TabsContent value="anvandare">
          <OrgUsersView organizationId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[380px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-10 w-96" />
      <OverviewSkeleton />
    </div>
  );
}
