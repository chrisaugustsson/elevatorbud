import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSelectedOrg } from "../../lib/org-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Calendar,
  TrendingUp,
  Wrench,
  Building2,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/modernisering")({
  component: Modernisering,
});

const currentYear = new Date().getFullYear();

function getUrgencyColor(year: number): string {
  const diff = year - currentYear;
  if (diff <= 1) return "var(--color-chart-4, #dc2626)"; // red
  if (diff <= 4) return "var(--color-chart-3, #d97706)"; // orange
  if (diff <= 9) return "#eab308"; // yellow
  return "var(--color-chart-2, #16a34a)"; // green
}

function getUrgencyBadge(year: number) {
  const diff = year - currentYear;
  if (diff <= 1)
    return (
      <Badge variant="destructive" className="text-xs">
        Akut
      </Badge>
    );
  if (diff <= 4)
    return (
      <Badge className="bg-orange-500 text-xs text-white hover:bg-orange-600">
        2-4 år
      </Badge>
    );
  if (diff <= 9)
    return (
      <Badge className="bg-yellow-500 text-xs text-white hover:bg-yellow-600">
        5-9 år
      </Badge>
    );
  return (
    <Badge className="bg-green-600 text-xs text-white hover:bg-green-700">
      10+ år
    </Badge>
  );
}

type TimelinePeriod = {
  label: string;
  yearFrom: number;
  yearTo: number;
};

const PERIODS: TimelinePeriod[] = [
  { label: "Akut (≤1 år)", yearFrom: 0, yearTo: currentYear + 1 },
  { label: "2-4 år", yearFrom: currentYear + 2, yearTo: currentYear + 4 },
  { label: "5-9 år", yearFrom: currentYear + 5, yearTo: currentYear + 9 },
  { label: "10+ år", yearFrom: currentYear + 10, yearTo: 2099 },
];

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
    return <ModerniseringSkeleton />;
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

      {/* Period summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {periodSummary.map((p) => (
          <Card
            key={p.label}
            className={`cursor-pointer transition-shadow hover:shadow-md ${
              selectedPeriod?.label === p.label
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() =>
              setSelectedPeriod(
                selectedPeriod?.label === p.label ? null : p,
              )
            }
          >
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{p.label}</div>
              <div className="mt-1 text-2xl font-bold">{p.count}</div>
              <div className="text-xs text-muted-foreground">hissar</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Moderniseringstidslinje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tidslinjeData.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Inga hissar med rekommenderat moderniseringsår.
            </p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tidslinjeData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value) => [String(value), "Antal hissar"]}
                  />
                  <Bar dataKey="antal" radius={[4, 4, 0, 0]}>
                    {tidslinjeData.map(
                      (entry: { fill: string }, index: number) => (
                        <rect key={index} fill={entry.fill} />
                      ),
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget section */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5" />
          Budgetöversikt
          <span className="text-sm font-normal text-muted-foreground">
            (Totalt: {(totalBudget / 1000).toFixed(0)} tkr)
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Budget per year with cumulative */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Budget per år (tkr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {budgetCumulative.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Ingen budgetdata tillgänglig.
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={budgetCumulative}
                      margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value, name) => [
                          `${String(value)} tkr`,
                          name === "belopp" ? "Per år" : "Kumulativt",
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        formatter={(value: string) => (
                          <span className="text-foreground">
                            {value === "belopp" ? "Per år" : "Kumulativt"}
                          </span>
                        )}
                      />
                      <Bar
                        dataKey="belopp"
                        fill="var(--color-chart-1, #2563eb)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="kumulativt"
                        stroke="var(--color-chart-4, #dc2626)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget per district */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Budget per distrikt (tkr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {budgetPerDistrikt.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Ingen budgetdata tillgänglig.
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={budgetPerDistrikt}
                      margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value) => [`${String(value)} tkr`, "Budget"]}
                      />
                      <Bar
                        dataKey="belopp"
                        fill="var(--color-chart-2, #16a34a)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget per type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Budget per hisstyp (tkr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {budgetPerTyp.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Ingen budgetdata tillgänglig.
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={budgetPerTyp}
                      margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value) => [`${String(value)} tkr`, "Budget"]}
                      />
                      <Bar
                        dataKey="belopp"
                        fill="var(--color-chart-3, #d97706)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" />
                Vanligaste åtgärder
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atgarder.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Inga åtgärder registrerade.
                </p>
              ) : (
                <div className="space-y-3">
                  {(atgarder as { measure: string; count: number }[]).map(
                    (a) => (
                      <div
                        key={a.measure}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate text-sm">{a.measure}</span>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {a.count}
                        </Badge>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Priority list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Prioritetslista
            {selectedPeriod && (
              <Badge variant="outline" className="ml-2 font-normal">
                {selectedPeriod.label}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPeriod(null);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(prioritetslista as any[]).length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Inga hissar med rekommenderat moderniseringsår
              {selectedPeriod ? " i vald period" : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hissnummer</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Adress
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Distrikt
                    </TableHead>
                    <TableHead>Rek. år</TableHead>
                    <TableHead>Brådskande</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Budget
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Åtgärd
                    </TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
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
                  ).map((h) => {
                    const year = parseInt(
                      h.recommended_modernization_year || "0",
                      10,
                    );
                    return (
                      <TableRow key={h._id}>
                        <TableCell className="font-medium">
                          {h.elevator_number}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {h.address || "–"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {h.district || "–"}
                        </TableCell>
                        <TableCell>{h.recommended_modernization_year}</TableCell>
                        <TableCell>{getUrgencyBadge(year)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {h.budget_amount
                            ? `${h.budget_amount.toLocaleString("sv-SE")} kr`
                            : "–"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {h.modernization_measures || "–"}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`/hiss/${h._id}`}
                            className="inline-flex items-center text-muted-foreground hover:text-foreground"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ModerniseringSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[380px] rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[380px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}
