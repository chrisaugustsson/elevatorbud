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
  withAlpha,
} from "@elevatorbud/ui/lib/chart-helpers";
import { Bar, Line } from "react-chartjs-2";
import { TrendingUp } from "lucide-react";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { ChartEvent, ActiveElement, Chart as ChartJS } from "chart.js";

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
  onYearClick?: (year: string) => void;
  selectedYear?: string | null;
  onDistrictClick?: (district: string) => void;
  selectedDistrict?: string | null;
};

function EmptyBudget() {
  return (
    <p className="py-8 text-center text-muted-foreground">
      Ingen budgetdata tillgänglig.
    </p>
  );
}

function BudgetPerYearChart({
  data,
  onYearClick,
  selectedYear,
}: {
  data: BudgetYearItem[];
  onYearClick?: (year: string) => void;
  selectedYear?: string | null;
}) {
  const colors = useChartColors();
  const chartRef = useRef<ChartJS<"line">>(null);

  const handleClick = useCallback(
    (_event: ChartEvent, elements: ActiveElement[]) => {
      if (!onYearClick || elements.length === 0) return;
      const index = elements[0].index;
      const year = data[index]?.name;
      if (year) onYearClick(year);
    },
    [onYearClick, data],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!onYearClick || !chartRef.current) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const active = chartRef.current.getActiveElements();
      if (active.length === 0) return;
      const year = data[active[0].index]?.name;
      if (year) onYearClick(year);
    },
    [onYearClick, data],
  );

  const barBackgrounds = useMemo(
    () =>
      data.map((d) =>
        selectedYear && d.name !== selectedYear
          ? withAlpha(colors.chart1, 0.25)
          : colors.chart1,
      ),
    [data, selectedYear, colors.chart1],
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          type: "bar" as const,
          label: "Per år",
          data: data.map((d) => d.amount),
          backgroundColor: barBackgrounds,
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
    [data, colors, barBackgrounds],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      onClick: handleClick,
      onHover: (_event: ChartEvent, elements: ActiveElement[]) => {
        const canvas = chartRef.current?.canvas;
        if (canvas) {
          canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
        }
      },
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
    [colors, handleClick],
  );

  return (
    <div className="h-[300px] w-full">
      <Line
        ref={chartRef}
        data={chartData as Parameters<typeof Line>[0]["data"]}
        options={options}
        tabIndex={0}
        role="img"
        aria-label="Stapeldiagram över budget per år. Klicka på en stapel för att filtrera."
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

function BudgetPerDistrictChart({
  data,
  color,
  onDistrictClick,
  selectedDistrict,
}: {
  data: BudgetCategoryItem[];
  color: string;
  onDistrictClick?: (district: string) => void;
  selectedDistrict?: string | null;
}) {
  const colors = useChartColors();
  const districtChartRef = useRef<ChartJS<"bar">>(null);

  const handleClick = useCallback(
    (_event: ChartEvent, elements: ActiveElement[]) => {
      if (!onDistrictClick || elements.length === 0) return;
      const index = elements[0].index;
      const district = data[index]?.name;
      if (district) onDistrictClick(district);
    },
    [onDistrictClick, data],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!onDistrictClick || !districtChartRef.current) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const active = districtChartRef.current.getActiveElements();
      if (active.length === 0) return;
      const district = data[active[0].index]?.name;
      if (district) onDistrictClick(district);
    },
    [onDistrictClick, data],
  );

  const backgroundColors = useMemo(
    () =>
      data.map((d) =>
        selectedDistrict && d.name !== selectedDistrict ? color + "40" : color,
      ),
    [data, selectedDistrict, color],
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Budget",
          data: data.map((d) => d.amount),
          backgroundColor: backgroundColors,
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
    }),
    [data, backgroundColors],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      onClick: handleClick,
      onHover: (_event: ChartEvent, elements: ActiveElement[]) => {
        const canvas = districtChartRef.current?.canvas;
        if (canvas) {
          canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
        }
      },
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
    [colors, handleClick],
  );

  return (
    <div className="h-[300px] w-full">
      <Bar
        ref={districtChartRef}
        data={chartData}
        options={options}
        plugins={[hoverColumnPlugin]}
        tabIndex={0}
        role="img"
        aria-label="Stapeldiagram över budget per distrikt. Klicka på en stapel för att filtrera."
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export function BudgetOverview({
  totalBudget,
  budgetCumulative,
  budgetPerDistrikt,
  onYearClick,
  selectedYear,
  onDistrictClick,
  selectedDistrict,
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
              <BudgetPerYearChart data={budgetCumulative} onYearClick={onYearClick} selectedYear={selectedYear} />
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
              <BudgetPerDistrictChart
                data={budgetPerDistrikt}
                color={colors.chart2}
                onDistrictClick={onDistrictClick}
                selectedDistrict={selectedDistrict}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
