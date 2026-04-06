import { Badge } from "../ui/badge";

const currentYear = new Date().getFullYear();

export type TimelinePeriod = {
  label: string;
  yearFrom: number;
  yearTo: number;
};

export const PERIODS: TimelinePeriod[] = [
  { label: "Akut (≤1 år)", yearFrom: 0, yearTo: currentYear + 1 },
  { label: "2-4 år", yearFrom: currentYear + 2, yearTo: currentYear + 4 },
  { label: "5-9 år", yearFrom: currentYear + 5, yearTo: currentYear + 9 },
  { label: "10+ år", yearFrom: currentYear + 10, yearTo: 2099 },
];

export function getUrgencyColor(year: number): string {
  const diff = year - currentYear;
  if (diff <= 1) return "#dc2626"; // red
  if (diff <= 4) return "#d97706"; // orange
  if (diff <= 9) return "#eab308"; // yellow
  return "#16a34a"; // green
}

export function getUrgencyBadge(year: number) {
  const diff = year - currentYear;
  if (diff <= 1)
    return (
      <Badge variant="destructive" className="text-xs">
        Akut
      </Badge>
    );
  if (diff <= 4)
    return (
      <Badge className="bg-orange-500 text-xs text-white hover:bg-orange-600">
        2-4 år
      </Badge>
    );
  if (diff <= 9)
    return (
      <Badge className="bg-yellow-500 text-xs text-white hover:bg-yellow-600">
        5-9 år
      </Badge>
    );
  return (
    <Badge className="bg-green-600 text-xs text-white hover:bg-green-700">
      10+ år
    </Badge>
  );
}
