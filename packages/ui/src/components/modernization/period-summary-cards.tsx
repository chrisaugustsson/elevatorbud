import {
  Card,
  CardContent,
} from "../ui/card";
import type { TimelinePeriod } from "./urgency-helpers";

type PeriodSummaryItem = TimelinePeriod & { count: number };

type PeriodSummaryCardsProps = {
  periods: PeriodSummaryItem[];
  selectedPeriod: TimelinePeriod | null;
  onSelectPeriod: (period: TimelinePeriod | null) => void;
};

export function PeriodSummaryCards({
  periods,
  selectedPeriod,
  onSelectPeriod,
}: PeriodSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {periods.map((p) => (
        <Card
          key={p.label}
          className={`cursor-pointer transition-shadow hover:shadow-md ${
            selectedPeriod?.label === p.label
              ? "ring-2 ring-primary"
              : ""
          }`}
          onClick={() =>
            onSelectPeriod(
              selectedPeriod?.label === p.label ? null : p,
            )
          }
        >
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{p.label}</div>
            <div className="mt-1 text-2xl font-bold">{p.count}</div>
            <div className="text-xs text-muted-foreground">hissar</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
