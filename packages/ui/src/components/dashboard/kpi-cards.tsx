import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { cn } from "@elevatorbud/ui/lib/utils";

export type KpiItem = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
};

export function KpiCards({
  items,
  className,
}: {
  items: KpiItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            {item.icon && (
              <div className="text-muted-foreground">{item.icon}</div>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            {item.description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {item.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
