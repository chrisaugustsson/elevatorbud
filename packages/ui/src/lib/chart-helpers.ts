import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { useMemo } from "react";

if (typeof document !== "undefined") {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend
  );
}

export function resolveToHex(cssColor: string): string {
  if (typeof document === "undefined") return cssColor;
  // Resolve CSS var() references via a temporary DOM element
  if (cssColor.includes("var(")) {
    const el = document.createElement("div");
    el.style.color = cssColor;
    document.body.appendChild(el);
    const resolved = getComputedStyle(el).color;
    document.body.removeChild(el);
    return resolved;
  }
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return cssColor;
  ctx.fillStyle = cssColor;
  return ctx.fillStyle;
}

const defaultColors = {
  chart1: "#2563eb",
  chart2: "#16a34a",
  chart3: "#d97706",
  chart4: "#dc2626",
  chart5: "#7c3aed",
  grid: "rgba(255,255,255,0.1)",
  label: "rgba(255,255,255,0.5)",
};

export function useChartColors() {
  return useMemo(() => {
    if (typeof document === "undefined") return defaultColors;
    const root = document.documentElement;
    const get = (name: string) =>
      getComputedStyle(root).getPropertyValue(name).trim();
    return {
      chart1: resolveToHex(get("--chart-1") || "#2563eb"),
      chart2: resolveToHex(get("--chart-2") || "#16a34a"),
      chart3: resolveToHex(get("--chart-3") || "#d97706"),
      chart4: resolveToHex(get("--chart-4") || "#dc2626"),
      chart5: resolveToHex(get("--chart-5") || "#7c3aed"),
      grid: get("--chart-grid") || "rgba(255,255,255,0.1)",
      label: get("--chart-label") || "rgba(255,255,255,0.5)",
    };
  }, []);
}

export type ChartColors = ReturnType<typeof useChartColors>;

export function sharedScaleOptions(colors: ChartColors) {
  return {
    x: {
      ticks: {
        color: colors.label,
        font: { size: 11, family: "Sora" },
        maxRotation: 45,
        minRotation: 45,
      },
      grid: { display: false as const },
      border: { display: false as const },
    },
    y: {
      ticks: {
        color: colors.label,
        font: { size: 11, family: "Sora" },
        callback: (value: string | number) => {
          const n = typeof value === "string" ? parseFloat(value) : value;
          return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
        },
      },
      grid: {
        color: colors.grid,
        drawTicks: false as const,
      },
      border: { display: false as const, dash: [4, 4] as number[] },
    },
  };
}

export const hoverColumnPlugin = {
  id: "hoverColumn",
  beforeDatasetsDraw(chart: ChartJS) {
    const active = chart.getActiveElements();
    if (active.length === 0) return;

    const { ctx, chartArea } = chart;
    const element = active[0];
    if (!element) return;

    const meta = chart.getDatasetMeta(element.datasetIndex);
    const bar = meta.data[element.index];
    if (!bar) return;

    const isHorizontal =
      (chart.options as { indexAxis?: string }).indexAxis === "y";

    ctx.save();
    ctx.fillStyle = "rgba(128, 128, 128, 0.08)";
    ctx.beginPath();

    if (isHorizontal) {
      const barHeight = (bar as unknown as { height: number }).height;
      const padding = barHeight * 0.3;
      const y = bar.y - barHeight / 2 - padding;
      const height = barHeight + padding * 2;
      ctx.roundRect(chartArea.left, y, chartArea.right - chartArea.left, height, 6);
    } else {
      const barWidth = (bar as unknown as { width: number }).width;
      const padding = barWidth * 0.3;
      const x = bar.x - barWidth / 2 - padding;
      const width = barWidth + padding * 2;
      ctx.roundRect(x, chartArea.top, width, chartArea.bottom - chartArea.top, 6);
    }

    ctx.fill();
    ctx.restore();
  },
};

export const sharedTooltipOptions = {
  backgroundColor: "rgba(0,0,0,0.8)" as const,
  titleFont: { family: "Sora", size: 12 },
  bodyFont: { family: "Sora", size: 12 },
  padding: 10,
  cornerRadius: 8,
};
