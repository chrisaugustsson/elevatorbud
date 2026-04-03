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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Wrench } from "lucide-react";
import type { ForetagData } from "../types";

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--popover-foreground))",
};

export function MaintenanceCompanies({
  foretagData,
}: {
  foretagData: ForetagData;
}) {
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
            {foretagData.companies.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Inga skötselföretag registrerade.
              </p>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={foretagData.companies.map((f) => ({
                      name: f.name,
                      antal: f.count,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [String(value), "Antal hissar"]}
                    />
                    <Bar
                      dataKey="antal"
                      fill="var(--color-chart-1, #2563eb)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
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
            {foretagData.companies.length === 0 ? (
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
                      {foretagData.districts.map((d) => (
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
                    {foretagData.companies.map((f) => (
                      <TableRow key={f.name}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium text-sm">
                          {f.name}
                        </TableCell>
                        {f.byDistrict.map((pd) => (
                          <TableCell
                            key={pd.district}
                            className="text-center text-sm"
                          >
                            {pd.count || "–"}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold text-sm">
                          {f.count}
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
