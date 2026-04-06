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
import { useMemo } from "react";

export type ForetagData = {
  company: string;
  total: number;
  districts: Record<string, number>;
}[];

interface MaintenanceCompaniesSectionProps {
  foretagData: ForetagData;
}

export function MaintenanceCompaniesSection({
  foretagData,
}: MaintenanceCompaniesSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Wrench className="h-5 w-5" />
        Skötselföretag
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompanyCountChart companies={foretagData} />
        <CompanyDistrictMatrix foretagData={foretagData} />
      </div>
    </div>
  );
}

function CompanyCountChart({
  companies,
}: {
  companies: ForetagData;
}) {
  const colors = useChartColors();

  const chartData = useMemo(
    () => ({
      labels: companies.map((f) => f.company),
      datasets: [
        {
          label: "Antal hissar",
          data: companies.map((f) => f.total),
          backgroundColor: colors.chart1,
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
    }),
    [companies, colors],
  );

  const scales = useMemo(() => {
    const base = sharedScaleOptions(colors);
    return {
      x: {
        ...base.y,
        ticks: {
          ...base.y.ticks,
          callback: undefined,
        },
      },
      y: {
        ...base.x,
        ticks: {
          ...base.x.ticks,
          font: { size: 11, family: "Sora" },
          maxRotation: 0,
          minRotation: 0,
        },
      },
    };
  }, [colors]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y" as const,
      interaction: { mode: "index" as const, intersect: false, axis: "y" as const },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...sharedTooltipOptions,
          callbacks: {
            label: (ctx: { parsed: { x: number | null } }) =>
              `Antal hissar: ${ctx.parsed.x}`,
          },
        },
      },
      scales,
    }),
    [scales],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Antal hissar per företag</CardTitle>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Inga skötselföretag registrerade.
          </p>
        ) : (
          <div className="h-[300px] w-full">
            <Bar
              data={chartData}
              options={options}
              plugins={[hoverColumnPlugin]}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompanyDistrictMatrix({
  foretagData,
}: {
  foretagData: ForetagData;
}) {
  const allDistricts = [
    ...new Set(foretagData.flatMap((f) => Object.keys(f.districts))),
  ].sort((a, b) => a.localeCompare(b, "sv"));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Företag per distrikt</CardTitle>
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
                  <TableHead className="sticky left-0 bg-background">
                    Företag
                  </TableHead>
                  {allDistricts.map((d) => (
                    <TableHead key={d} className="text-center text-xs">
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
                    <TableCell className="sticky left-0 bg-background font-medium text-sm">
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
  );
}
