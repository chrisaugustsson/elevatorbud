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
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  useChartColors,
  sharedScaleOptions,
  sharedTooltipOptions,
  hoverColumnPlugin,
} from "@elevatorbud/ui/lib/chart-helpers";
import { Bar } from "react-chartjs-2";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { KalenderEntry, BesiktningsListaItem } from "../types";

export function InspectionCalendar({
  kalenderData,
  totalBesiktningar,
  currentMonthCount,
  currentMonthName,
  selectedManad,
  onSelectManad,
  besiktningslista,
}: {
  kalenderData: KalenderEntry[];
  totalBesiktningar: number;
  currentMonthCount: number;
  currentMonthName: string;
  selectedManad: string | null;
  onSelectManad: (month: string | null) => void;
  besiktningslista: BesiktningsListaItem[] | undefined;
}) {
  const colors = useChartColors();

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarDays className="h-5 w-5" />
        Besiktningskalender
        <span className="text-sm font-normal text-muted-foreground">
          ({totalBesiktningar} hissar totalt)
        </span>
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Denna månad ({currentMonthName.substring(0, 3)})
            </div>
            <div className="mt-1 text-2xl font-bold">{currentMonthCount}</div>
            <div className="text-xs text-muted-foreground">besiktningar</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Totalt per år</div>
            <div className="mt-1 text-2xl font-bold">
              {totalBesiktningar}
            </div>
            <div className="text-xs text-muted-foreground">besiktningar</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Snitt per månad
            </div>
            <div className="mt-1 text-2xl font-bold">
              {Math.round(totalBesiktningar / 12)}
            </div>
            <div className="text-xs text-muted-foreground">besiktningar</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Besiktningar per månad
            {selectedManad && (
              <Badge variant="outline" className="ml-2 font-normal">
                {selectedManad}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectManad(null);
                  }}
                >
                  ×
                </button>
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalBesiktningar === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Inga hissar med besiktningsmånad registrerad.
            </p>
          ) : (
            <div className="h-[300px] w-full">
              <Bar
                data={{
                  labels: kalenderData.map((d) => d.name),
                  datasets: [
                    {
                      label: "Antal hissar",
                      data: kalenderData.map((d) => d.antal),
                      backgroundColor: kalenderData.map((entry) => {
                        const base = entry.isSelected
                          ? colors.chart4
                          : entry.isCurrent
                            ? colors.chart1
                            : colors.chart2;
                        return selectedManad && !entry.isSelected
                          ? base + "66"
                          : base;
                      }),
                      borderRadius: 4,
                      barPercentage: 0.7,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  onClick: (_event, elements) => {
                    if (elements[0]) {
                      const fullName = kalenderData[elements[0].index]?.fullName;
                      if (fullName) {
                        onSelectManad(selectedManad === fullName ? null : fullName);
                      }
                    }
                  },
                  onHover: (event, elements) => {
                    const canvas = event.native?.target as HTMLCanvasElement | undefined;
                    if (canvas) {
                      canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...sharedTooltipOptions,
                      callbacks: {
                        title: (items) =>
                          kalenderData[items[0]?.dataIndex ?? 0]?.fullName ?? "",
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

      {/* Elevator list for selected month */}
      {selectedManad && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Hissar med besiktning i {selectedManad}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {besiktningslista === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : besiktningslista.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                Inga hissar med besiktning i {selectedManad}.
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
                      <TableHead className="hidden lg:table-cell">
                        Besiktningsorgan
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Organisation
                      </TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {besiktningslista.map((h) => (
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
                        <TableCell className="hidden lg:table-cell">
                          {h.inspection_authority || "–"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Link
                            to="/admin/organisationer/$id"
                            params={{ id: h.organization_id }}
                            className="text-primary hover:underline"
                          >
                            {h.organizationName}
                          </Link>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
