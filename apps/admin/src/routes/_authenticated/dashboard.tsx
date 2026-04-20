import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardOverviewOptions } from "~/server/dashboard";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import {
  Building2,
  Upload,
  Database,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
  Hammer,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { formatInspectionMonth } from "@elevatorbud/utils/format";

type DashboardData = {
  totalElevators: number;
  totalOrganizations: number;
  upcomingInspections: { count: number; month: number };
  modernizationSoon: number;
  topOrganizations: {
    id: string;
    name: string;
    elevatorCount: number;
  }[];
  recentActivity: {
    id: string;
    elevatorNumber: string;
    address: string | null;
    lastUpdatedAt: Date | null;
    organizationName: string | null;
  }[];
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(dashboardOverviewOptions());
  },
  component: Dashboard,
  pendingComponent: DashboardSkeleton,
});

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardOverviewOptions());

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Hissar totalt"
          value={data.totalElevators}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Organisationer"
          value={data.totalOrganizations}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label={`Besiktningar i ${formatInspectionMonth(data.upcomingInspections.month)}`}
          value={data.upcomingInspections.count}
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          label="Modernisering inom 3 år"
          value={data.modernizationSoon}
          icon={<Hammer className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Top orgs + shortcuts */}
        <div className="space-y-6 lg:col-span-1">
          {/* Top organizations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                Organisationer
              </CardTitle>
              <Link
                to="/admin/organisationer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Visa alla
              </Link>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {data.topOrganizations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Inga organisationer ännu
                </p>
              ) : (
                data.topOrganizations.map((org) => (
                  <Link
                    key={org.id}
                    to={
                      `/admin/organisationer/${org.id}` as string
                    }
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="font-medium truncate">{org.name}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">
                      {org.elevatorCount} hissar
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Shortcuts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Genvägar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Link to="/ny" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ny hiss
                </Button>
              </Link>
              <Link to="/admin/import" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importera
                </Button>
              </Link>
              <Link to="/admin/referensdata" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Database className="h-4 w-4" />
                  Referensdata
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Senaste aktivitet
            </CardTitle>
            <Link
              to="/register"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Visa register
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Ingen aktivitet ännu. Skapa eller redigera en hiss för att se
                senaste ändringar.
              </p>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    to="/hiss/$id"
                    params={{ id: item.id }}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {item.elevatorNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.organizationName}
                        </span>
                      </div>
                      {item.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(item.lastUpdatedAt)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(timestamp: Date | null): string {
  if (!timestamp) return "–";
  const diff = Date.now() - timestamp.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "igår";
  if (days < 7) return `${days} dagar sedan`;
  return timestamp.toLocaleDateString("sv-SE");
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
