"use client";
import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";

export type ChartDataPoint = {
  name: string;
  count: number;
};

const COLORS = [
  "var(--color-chart-1, #2563eb)",
  "var(--color-chart-2, #16a34a)",
  "var(--color-chart-3, #d97706)",
  "var(--color-chart-4, #dc2626)",
  "var(--color-chart-5, #7c3aed)",
  "var(--color-chart-6, #0891b2)",
  "var(--color-chart-7, #be185d)",
  "var(--color-chart-8, #4f46e5)",
  "var(--color-chart-9, #059669)",
  "var(--color-chart-10, #ca8a04)",
];

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardBarChart({
  title,
  data,
  color,
  className,
}: {
  title: string;
  data: ChartDataPoint[];
  color?: string;
  className?: string;
}) {
  return (
    <ChartCard title={title} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value) => [String(value), "Antal"]}
          />
          <Bar
            dataKey="count"
            fill={color || COLORS[0]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DashboardPieChart({
  title,
  data,
  className,
  innerRadius,
}: {
  title: string;
  data: ChartDataPoint[];
  className?: string;
  innerRadius?: number;
}) {
  return (
    <ChartCard title={title} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius ?? 0}
            outerRadius={100}
            paddingAngle={2}
            dataKey="count"
            nameKey="name"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              (percent ?? 0) > 0.05
                ? `${name} (${Math.round((percent ?? 0) * 100)}%)`
                : ""
            }
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value) => [String(value), "Antal"]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value: string) => (
              <span className="text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
