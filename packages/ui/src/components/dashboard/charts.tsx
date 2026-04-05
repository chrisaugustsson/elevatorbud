"use client";
import * as React from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  useChartColors,
  sharedScaleOptions,
  hoverColumnPlugin,
  sharedTooltipOptions,
  resolveToHex,
  type ChartColors,
} from "@elevatorbud/ui/lib/chart-helpers";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";

export type ChartDataPoint = {
  name: string;
  count: number;
};

/**
 * Build the 10-color palette: 5 theme colors from useChartColors(),
 * then cycle those 5 to fill slots 6-10.
 */
function buildPalette(colors: ChartColors): string[] {
  const base = [
    colors.chart1,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.chart5,
  ];
  return [...base, ...base];
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardBarChart({
  title,
  data,
  color,
  className,
}: {
  title: string;
  data: ChartDataPoint[];
  color?: string;
  className?: string;
}) {
  const colors = useChartColors();
  const palette = React.useMemo(() => buildPalette(colors), [colors]);

  const chartData = React.useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Antal",
          data: data.map((d) => d.count),
          backgroundColor: color ? resolveToHex(color) : palette[0],
          borderRadius: 4,
          borderSkipped: "bottom" as const,
        },
      ],
    }),
    [data, color, palette],
  );

  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      scales: sharedScaleOptions(colors),
      plugins: {
        legend: { display: false },
        tooltip: {
          ...sharedTooltipOptions,
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              `Antal: ${ctx.parsed.y ?? 0}`,
          },
        },
      },
    }),
    [colors],
  );

  return (
    <ChartCard title={title} className={className}>
      <Bar data={chartData} options={options} plugins={[hoverColumnPlugin]} />
    </ChartCard>
  );
}

export function DashboardPieChart({
  title,
  data,
  className,
  innerRadius,
}: {
  title: string;
  data: ChartDataPoint[];
  className?: string;
  innerRadius?: number;
}) {
  const colors = useChartColors();
  const palette = React.useMemo(() => buildPalette(colors), [colors]);

  const chartData = React.useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          data: data.map((d) => d.count),
          backgroundColor: data.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
          spacing: 2,
        },
      ],
    }),
    [data, palette],
  );

  /**
   * Convert innerRadius (pixels in original Recharts API) to a cutout
   * percentage relative to the default outer radius (~100px).
   * When innerRadius is 0 or undefined, cutout is 0 → renders as a pie.
   */
  const cutout = React.useMemo(() => {
    if (!innerRadius) return 0;
    // outerRadius was 100 in the Recharts version; map linearly to percentage.
    return `${Math.min(Math.round((innerRadius / 100) * 100), 99)}%`;
  }, [innerRadius]);

  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: colors.label,
            font: { size: 12, family: "Sora" },
            padding: 12,
          },
        },
        tooltip: {
          ...sharedTooltipOptions,
          callbacks: {
            label: (ctx: {
              label: string;
              parsed: number;
              dataset: { data: number[] };
            }) => {
              const total = ctx.dataset.data.reduce(
                (sum: number, v: number) => sum + v,
                0,
              );
              const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
              return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
            },
          },
        },
      },
    }),
    [colors, cutout],
  );

  return (
    <ChartCard title={title} className={className}>
      <Doughnut data={chartData} options={options} />
    </ChartCard>
  );
}
