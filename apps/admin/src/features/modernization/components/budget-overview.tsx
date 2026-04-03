import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

type BudgetYearItem = {
  name: string;
  belopp: number;
  kumulativt: number;
};

type BudgetCategoryItem = {
  name: string;
  belopp: number;
};

type BudgetOverviewProps = {
  totalBudget: number;
  budgetCumulative: BudgetYearItem[];
  budgetPerDistrikt: BudgetCategoryItem[];
  budgetPerTyp: BudgetCategoryItem[];
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--popover-foreground))",
};

function EmptyBudget() {
  return (
    <p className="py-8 text-center text-muted-foreground">
      Ingen budgetdata tillgänglig.
    </p>
  );
}

export function BudgetOverview({
  totalBudget,
  budgetCumulative,
  budgetPerDistrikt,
  budgetPerTyp,
}: BudgetOverviewProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <TrendingUp className="h-5 w-5" />
        Budgetöversikt
        <span className="text-sm font-normal text-muted-foreground">
          (Totalt: {(totalBudget / 1000).toFixed(0)} tkr)
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Budget per year with cumulative */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Budget per år (tkr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetCumulative.length === 0 ? (
              <EmptyBudget />
            ) : (
              <div className="h-[300px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={budgetCumulative}
                    margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      interval="preserveStartEnd"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        `${String(value)} tkr`,
                        name === "belopp" ? "Per år" : "Kumulativt",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px" }}
                      formatter={(value: string) => (
                        <span className="text-foreground">
                          {value === "belopp" ? "Per år" : "Kumulativt"}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="belopp"
                      fill="var(--color-chart-1, #2563eb)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="kumulativt"
                      stroke="var(--color-chart-4, #dc2626)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget per district */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Budget per distrikt (tkr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetPerDistrikt.length === 0 ? (
              <EmptyBudget />
            ) : (
              <div className="h-[300px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetPerDistrikt}
                    margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      interval="preserveStartEnd"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${String(value)} tkr`, "Budget"]}
                    />
                    <Bar
                      dataKey="belopp"
                      fill="var(--color-chart-2, #16a34a)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget per type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Budget per hisstyp (tkr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetPerTyp.length === 0 ? (
              <EmptyBudget />
            ) : (
              <div className="h-[300px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetPerTyp}
                    margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      interval="preserveStartEnd"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${String(value)} tkr`, "Budget"]}
                    />
                    <Bar
                      dataKey="belopp"
                      fill="var(--color-chart-3, #d97706)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
