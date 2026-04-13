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
import { useMemo, useCallback, useRef } from "react";
import type { ChartEvent, ActiveElement, Chart as ChartJS } from "chart.js";

type TimelineDataItem = {
  name: string;
  antal: number;
  fill: string;
};

type TimelineChartProps = {
  data: TimelineDataItem[];
  onYearClick?: (year: string) => void;
  selectedYear?: string | null;
};

export function TimelineChart({ data, onYearClick, selectedYear }: TimelineChartProps) {
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

  const backgroundColors = useMemo(
    () =>
      data.map((d) =>
        selectedYear && d.name !== selectedYear ? d.fill + "40" : d.fill,
      ),
    [data, selectedYear],
  );

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
                    data: data.map((d) => d.antal),
                    backgroundColor: backgroundColors,
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
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
