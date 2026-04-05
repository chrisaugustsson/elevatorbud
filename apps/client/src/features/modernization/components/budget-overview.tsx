import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import {
  useChartColors,
  sharedScaleOptions,
  sharedTooltipOptions,
  hoverColumnPlugin,
} from "@elevatorbud/ui/lib/chart-helpers";
import { Bar, Line } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

type BudgetYearItem = {
  name: string;
  amount: number;
  kumulativt: number;
};

type BudgetCategoryItem = {
  name: string;
  amount: number;
};

type BudgetOverviewProps = {
  totalBudget: number;
  budgetCumulative: BudgetYearItem[];
  budgetPerDistrikt: BudgetCategoryItem[];
  budgetPerTyp: BudgetCategoryItem[];
};

function EmptyBudget() {
  return (
    <p className="py-8 text-center text-muted-foreground">
      Ingen budgetdata tillgänglig.
    </p>
  );
}

function BudgetPerYearChart({ data }: { data: BudgetYearItem[] }) {
  const colors = useChartColors();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          type: "bar" as const,
          label: "Per år",
          data: data.map((d) => d.amount),
          backgroundColor: colors.chart1,
          borderRadius: 4,
          barPercentage: 0.7,
          order: 2,
        },
        {
          type: "line" as const,
          label: "Kumulativt",
          data: data.map((d) => d.kumulativt),
          borderColor: colors.chart4,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: colors.chart4,
          tension: 0.3,
          fill: false,
          order: 1,
        },
      ],
    }),
    [data, colors],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: colors.label,
            font: { size: 11, family: "Sora" },
            usePointStyle: true,
            pointStyle: "circle" as const,
            padding: 16,
          },
        },
        tooltip: {
          ...sharedTooltipOptions,
          callbacks: {
            label: (ctx: {
              dataset: { label?: string };
              parsed: { y: number | null };
            }) =>
              `${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString("sv-SE")} tkr`,
          },
        },
      },
      scales: sharedScaleOptions(colors),
    }),
    [colors],
  );

  return (
    <div className="h-[300px] w-full">
      <Line
        data={chartData as Parameters<typeof Line>[0]["data"]}
        options={options}
      />
    </div>
  );
}

function CategoryBarChart({
  data,
  color,
}: {
  data: BudgetCategoryItem[];
  color: string;
}) {
  const colors = useChartColors();

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Budget",
          data: data.map((d) => d.amount),
          backgroundColor: color,
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
    }),
    [data, color],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...sharedTooltipOptions,
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              `Budget: ${ctx.parsed.y?.toLocaleString("sv-SE")} tkr`,
          },
        },
      },
      scales: sharedScaleOptions(colors),
    }),
    [colors],
  );

  return (
    <div className="h-[300px] w-full">
      <Bar data={chartData} options={options} plugins={[hoverColumnPlugin]} />
    </div>
  );
}

export function BudgetOverview({
  totalBudget,
  budgetCumulative,
  budgetPerDistrikt,
  budgetPerTyp,
}: BudgetOverviewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const colors = useChartColors();

  if (!mounted) return null;

  return (
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
              <EmptyBudget />
            ) : (
              <BudgetPerYearChart data={budgetCumulative} />
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
              <EmptyBudget />
            ) : (
              <CategoryBarChart
                data={budgetPerDistrikt}
                color={colors.chart2}
              />
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
              <EmptyBudget />
            ) : (
              <CategoryBarChart
                data={budgetPerTyp}
                color={colors.chart3}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
