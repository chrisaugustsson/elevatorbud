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
import { useState, useEffect } from "react";

type TimelineDataItem = {
  name: string;
  count: number;
  fill: string;
};

type TimelineChartProps = {
  data: TimelineDataItem[];
};

export function TimelineChart({ data }: TimelineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const colors = useChartColors();

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
              data={{
                labels: data.map((d) => d.name),
                datasets: [
                  {
                    label: "Antal hissar",
                    data: data.map((d) => d.count),
                    backgroundColor: data.map((d) => d.fill),
                    borderRadius: 4,
                    barPercentage: 0.7,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
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
