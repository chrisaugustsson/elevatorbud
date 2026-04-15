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
import { Bar } from "react-chartjs-2";
import { Calendar } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ChartEvent, ActiveElement, Chart as ChartJS } from "chart.js";

type TimelineDataItem = {
  name: string;
  count: number;
  fill: string;
};

type TimelineChartProps = {
  data: TimelineDataItem[];
  onYearClick?: (year: string) => void;
  selectedYear?: string | null;
};

export function TimelineChart({ data, onYearClick, selectedYear }: TimelineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const colors = useChartColors();
  const chartRef = useRef<ChartJS<"bar">>(null);

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
      const chart = chartRef.current;
      const active = chart.getActiveElements();
      if (active.length === 0) return;
      const year = data[active[0].index]?.name;
      if (year) onYearClick(year);
    },
    [onYearClick, data],
  );

  const backgroundColors = useMemo(
    () =>
      data.map((d) =>
        selectedYear && d.name !== selectedYear ? d.fill + "40" : d.fill,
      ),
    [data, selectedYear],
  );

  // Non-color cue for the selected bar: a visible theme-aware outline.
  // Complements the 40%-opacity dimming of unselected bars so selection
  // is perceivable without relying on color or opacity alone.
  const borderColors = useMemo(
    () =>
      data.map((d) =>
        selectedYear && d.name === selectedYear ? colors.foreground : "transparent",
      ),
    [data, selectedYear, colors.foreground],
  );

  const borderWidths = useMemo(
    () => data.map((d) => (selectedYear && d.name === selectedYear ? 2 : 0)),
    [data, selectedYear],
  );

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Moderniseringstidslinje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Inga hissar med rekommenderat moderniseringsår.
          </p>
        ) : (
          <div className="h-[300px] w-full overflow-hidden">
            <Bar
              ref={chartRef}
              data={{
                labels: data.map((d) => d.name),
                datasets: [
                  {
                    label: "Antal hissar",
                    data: data.map((d) => d.count),
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    borderRadius: 4,
                    barPercentage: 0.7,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                onClick: handleClick,
                onHover: (_event, elements) => {
                  const canvas = chartRef.current?.canvas;
                  if (canvas) {
                    canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
                  }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    ...sharedTooltipOptions,
                    callbacks: {
                      label: (ctx) => `Antal hissar: ${ctx.parsed.y}`,
                    },
                  },
                },
                scales: sharedScaleOptions(colors),
              }}
              plugins={[hoverColumnPlugin]}
              tabIndex={0}
              role="img"
              aria-label="Stapeldiagram över moderniseringstidslinje. Klicka på en stapel för att filtrera per år."
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
