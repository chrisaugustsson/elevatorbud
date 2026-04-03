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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CalendarDays, ChevronRight } from "lucide-react";

const MANADER = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

const currentMonthIndex = new Date().getMonth();
const currentMonthName = MANADER[currentMonthIndex];

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--popover-foreground))",
};

export type KalenderEntry = {
  name: string;
  fullName: string;
  count: number;
  isCurrent: boolean;
  isSelected: boolean;
};

export type InspectionListItem = {
  _id: string;
  elevator_number: string;
  address?: string;
  district?: string;
  inspection_authority?: string;
  organizationName: string;
};

interface InspectionCalendarSectionProps {
  kalenderData: KalenderEntry[];
  totalBesiktningar: number;
  currentMonthCount: number;
  selectedManad: string | null;
  onSelectManad: (month: string | null) => void;
  besiktningslista: InspectionListItem[] | undefined;
}

export function InspectionCalendarSection({
  kalenderData,
  totalBesiktningar,
  currentMonthCount,
  selectedManad,
  onSelectManad,
  besiktningslista,
}: InspectionCalendarSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarDays className="h-5 w-5" />
        Besiktningskalender
        <span className="text-sm font-normal text-muted-foreground">
          ({totalBesiktningar} hissar totalt)
        </span>
      </h2>

      <InspectionSummaryCards
        currentMonthCount={currentMonthCount}
        totalBesiktningar={totalBesiktningar}
      />

      <InspectionBarChart
        kalenderData={kalenderData}
        totalBesiktningar={totalBesiktningar}
        selectedManad={selectedManad}
        onSelectManad={onSelectManad}
      />

      {selectedManad && (
        <InspectionMonthList
          selectedManad={selectedManad}
          besiktningslista={besiktningslista}
        />
      )}
    </div>
  );
}

function InspectionSummaryCards({
  currentMonthCount,
  totalBesiktningar,
}: {
  currentMonthCount: number;
  totalBesiktningar: number;
}) {
  return (
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
          <div className="mt-1 text-2xl font-bold">{totalBesiktningar}</div>
          <div className="text-xs text-muted-foreground">besiktningar</div>
        </CardContent>
      </Card>
      <Card className="col-span-2 lg:col-span-1">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">Snitt per månad</div>
          <div className="mt-1 text-2xl font-bold">
            {Math.round(totalBesiktningar / 12)}
          </div>
          <div className="text-xs text-muted-foreground">besiktningar</div>
        </CardContent>
      </Card>
    </div>
  );
}

function InspectionBarChart({
  kalenderData,
  totalBesiktningar,
  selectedManad,
  onSelectManad,
}: {
  kalenderData: KalenderEntry[];
  totalBesiktningar: number;
  selectedManad: string | null;
  onSelectManad: (month: string | null) => void;
}) {
  return (
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={kalenderData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]) {
                    const fullName = data.activePayload[0].payload
                      .fullName as string;
                    onSelectManad(
                      selectedManad === fullName ? null : fullName,
                    );
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [String(value), "Antal hissar"]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {kalenderData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.isSelected
                          ? "var(--color-chart-4, #dc2626)"
                          : entry.isCurrent
                            ? "var(--color-chart-1, #2563eb)"
                            : "var(--color-chart-2, #16a34a)"
                      }
                      opacity={
                        selectedManad && !entry.isSelected ? 0.4 : 1
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InspectionMonthList({
  selectedManad,
  besiktningslista,
}: {
  selectedManad: string;
  besiktningslista: InspectionListItem[] | undefined;
}) {
  return (
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
  );
}
