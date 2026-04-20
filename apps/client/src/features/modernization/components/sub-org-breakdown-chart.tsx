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
import { Bar } from "react-chartjs-2";
import { Building2 } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ChartEvent, ActiveElement, Chart as ChartJS } from "chart.js";

type SubOrgDataItem = {
  orgId: string;
  orgName: string;
  count: number;
};

type SubOrgBreakdownChartProps = {
  data: SubOrgDataItem[];
  onSubOrgClick?: (orgId: string) => void;
  selectedSubOrgId?: string | null;
};

export function SubOrgBreakdownChart({
  data,
  onSubOrgClick,
  selectedSubOrgId,
}: SubOrgBreakdownChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const colors = useChartColors();
  const chartRef = useRef<ChartJS<"bar">>(null);

  const handleClick = useCallback(
    (_event: ChartEvent, elements: ActiveElement[]) => {
      if (!onSubOrgClick || elements.length === 0) return;
      const index = elements[0].index;
      const item = data[index];
      if (item) onSubOrgClick(item.orgId);
    },
    [onSubOrgClick, data],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (!onSubOrgClick || !chartRef.current) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();

      const chart = chartRef.current;
      const active = chart.getActiveElements();
      if (active.length === 0) return;
      const index = active[0].index;
      const item = data[index];
      if (item) onSubOrgClick(item.orgId);
    },
    [onSubOrgClick, data],
  );

  const backgroundColors = useMemo(
    () =>
      data.map((d) =>
        selectedSubOrgId && d.orgId !== selectedSubOrgId
          ? withAlpha(colors.chart3, 0.25)
          : colors.chart3,
      ),
    [data, selectedSubOrgId, colors.chart3],
  );

  // Second, non-color cue for the selected bar: a visible outline.
  // Unselected bars get no border, so the selected bar stands out even
  // for users with color-vision deficiencies or on grayscale displays.
  // We use the theme-aware foreground color (via useChartColors) so the
  // outline stays legible on both light and dark themes and updates
  // immediately when the user toggles themes.
  const borderColors = useMemo(
    () =>
      data.map((d) =>
        selectedSubOrgId && d.orgId === selectedSubOrgId
          ? colors.foreground
          : "transparent",
      ),
    [data, selectedSubOrgId, colors.foreground],
  );

  const borderWidths = useMemo(
    () =>
      data.map((d) =>
        selectedSubOrgId && d.orgId === selectedSubOrgId ? 2 : 0,
      ),
    [data, selectedSubOrgId],
  );

  const selectedOrgName = useMemo(
    () =>
      selectedSubOrgId
        ? (data.find((d) => d.orgId === selectedSubOrgId)?.orgName ?? null)
        : null,
    [data, selectedSubOrgId],
  );

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" aria-hidden />
          Hissar per organisation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Ingen organisationsdata tillgänglig.
          </p>
        ) : (
          <>
            {/* Text legend — makes selection legible without relying on color alone. */}
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="inline-block size-3 shrink-0 rounded-sm"
                style={{ backgroundColor: colors.chart3 }}
                aria-hidden
              />
              <span>
                {selectedOrgName
                  ? `Vald: ${selectedOrgName}`
                  : "Antal hissar per organisation"}
              </span>
            </div>
            <div className="h-[300px] w-full overflow-hidden rounded-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <Bar
                ref={chartRef}
                data={{
                  labels: data.map((d) => d.orgName),
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
                      canvas.style.cursor =
                        elements.length > 0 ? "pointer" : "default";
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
                aria-label={
                  selectedOrgName
                    ? `Stapeldiagram över hissar per organisation. Valt: ${selectedOrgName}. Klicka på en stapel för att filtrera.`
                    : "Stapeldiagram över hissar per organisation. Klicka på en stapel för att filtrera."
                }
                onKeyDown={handleKeyDown}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
