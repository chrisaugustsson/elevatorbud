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
import {
  useChartColors,
  sharedScaleOptions,
  sharedTooltipOptions,
  hoverColumnPlugin,
} from "@elevatorbud/ui/lib/chart-helpers";
import { Bar } from "react-chartjs-2";
import { Wrench } from "lucide-react";
import type { ForetagData } from "../types";

export function MaintenanceCompanies({
  foretagData,
}: {
  foretagData: ForetagData;
}) {
  const colors = useChartColors();
  const scales = sharedScaleOptions(colors);

  // Collect all unique district names across all companies
  const allDistricts = [
    ...new Set(foretagData.flatMap((f) => Object.keys(f.districts))),
  ].sort((a, b) => a.localeCompare(b, "sv"));

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Wrench className="h-5 w-5" />
        Skötselföretag
      </h2>

      <div className="space-y-6">
        {/* Count per company */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antal hissar per företag</CardTitle>
          </CardHeader>
          <CardContent>
            {foretagData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Inga skötselföretag registrerade.
              </p>
            ) : (
              <div className="h-[300px] w-full">
                <Bar
                  data={{
                    labels: foretagData.map((f) => f.company),
                    datasets: [
                      {
                        label: "Antal hissar",
                        data: foretagData.map((f) => f.total),
                        backgroundColor: colors.chart1,
                        borderRadius: 4,
                        barPercentage: 0.7,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index" as const, intersect: false, axis: "y" as const },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        ...sharedTooltipOptions,
                        callbacks: {
                          label: (ctx) => `Antal hissar: ${ctx.parsed.x}`,
                        },
                      },
                    },
                    scales: {
                      y: {
                        ticks: {
                          color: colors.label,
                          font: { size: 11, family: "Sora" },
                        },
                        grid: { display: false },
                        border: { display: false },
                      },
                      x: scales.y,
                    },
                  }}
                  plugins={[hoverColumnPlugin]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matrix company x district */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Företag per distrikt
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foretagData.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Inga data tillgängliga.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-background">
                        Företag
                      </TableHead>
                      {allDistricts.map((d) => (
                        <TableHead
                          key={d}
                          className="text-center text-xs"
                        >
                          {d}
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-bold">
                        Totalt
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foretagData.map((f) => (
                      <TableRow key={f.company}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium text-sm">
                          {f.company}
                        </TableCell>
                        {allDistricts.map((d) => (
                          <TableCell
                            key={d}
                            className="text-center text-sm"
                          >
                            {f.districts[d] || "–"}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold text-sm">
                          {f.total}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
