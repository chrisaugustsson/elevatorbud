import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
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
import {
  CalendarDays,
  Wrench,
  Phone,
  PhoneOff,
  ArrowUpCircle,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/underhall")({
  component: UnderhallPage,
});

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

function UnderhallPage() {
  const user = useQuery(api.users.me);
  const orgFilter = user?.organisation_id
    ? ({ organisation_id: user.organisation_id } as never)
    : "skip";

  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const kalender = useQuery(
    api.hissar.besiktningskalender,
    orgFilter as never,
  );
  const foretag = useQuery(api.hissar.skotselforetag, orgFilter as never);
  const nodtelefon = useQuery(
    api.hissar.nodtelefonstatus,
    orgFilter as never,
  );

  const besiktningslistaArgs =
    selectedManad && user?.organisation_id
      ? ({ organisation_id: user.organisation_id as never, manad: selectedManad })
      : "skip";
  const besiktningslista = useQuery(
    api.hissar.besiktningslista,
    besiktningslistaArgs as never,
  );

  if (
    user === undefined ||
    kalender === undefined ||
    foretag === undefined ||
    nodtelefon === undefined
  ) {
    return <UnderhallSkeleton />;
  }

  const kalenderData = (kalender as { manad: string; antal: number }[]).map(
    (k) => ({
      name: k.manad.substring(0, 3),
      fullName: k.manad,
      antal: k.antal,
      isCurrent: k.manad === currentMonthName,
      isSelected: k.manad === selectedManad,
    }),
  );

  const totalBesiktningar = kalenderData.reduce((s, k) => s + k.antal, 0);
  const currentMonthCount =
    kalenderData.find((k) => k.isCurrent)?.antal || 0;

  const foretagData = foretag as {
    foretag: {
      namn: string;
      antal: number;
      perDistrikt: { distrikt: string; antal: number }[];
    }[];
    distrikt: string[];
  };

  const nodData = nodtelefon as {
    medNodtelefon: number;
    utanNodtelefon: number;
    behoverUppgradering: number;
    totalUppgraderingskostnad: number;
    perDistrikt: {
      distrikt: string;
      med: number;
      utan: number;
      uppgradering: number;
      kostnad: number;
    }[];
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        Underhåll och besiktning
      </h1>

      {/* Section 1: Besiktningskalender */}
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
                      setSelectedManad(null);
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
                        setSelectedManad(
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
                    <Bar dataKey="antal" radius={[4, 4, 0, 0]}>
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
              ) : (besiktningslista as any[]).length === 0 ? (
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
                      {(
                        besiktningslista as {
                          _id: string;
                          hissnummer: string;
                          adress?: string;
                          distrikt?: string;
                          besiktningsorgan?: string;
                          organisationsnamn: string;
                        }[]
                      ).map((h) => (
                        <TableRow key={h._id}>
                          <TableCell className="font-medium">
                            {h.hissnummer}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {h.adress || "–"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {h.distrikt || "–"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {h.besiktningsorgan || "–"}
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

      {/* Section 2: Skötselföretag */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Wrench className="h-5 w-5" />
          Skötselföretag
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Count per company */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Antal hissar per företag</CardTitle>
            </CardHeader>
            <CardContent>
              {foretagData.foretag.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Inga skötselföretag registrerade.
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={foretagData.foretag.map((f) => ({
                        name: f.namn,
                        antal: f.antal,
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

          {/* Matrix company × district */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Företag per distrikt
              </CardTitle>
            </CardHeader>
            <CardContent>
              {foretagData.foretag.length === 0 ? (
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
                        {foretagData.distrikt.map((d) => (
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
                      {foretagData.foretag.map((f) => (
                        <TableRow key={f.namn}>
                          <TableCell className="sticky left-0 bg-background font-medium text-sm">
                            {f.namn}
                          </TableCell>
                          {f.perDistrikt.map((pd) => (
                            <TableCell
                              key={pd.distrikt}
                              className="text-center text-sm"
                            >
                              {pd.antal || "–"}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold text-sm">
                            {f.antal}
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

      {/* Section 3: Nödtelefonstatus */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Phone className="h-5 w-5" />
          Nödtelefonstatus
        </h2>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-green-600" />
                Med nödtelefon
              </div>
              <div className="mt-1 text-2xl font-bold">
                {nodData.medNodtelefon}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneOff className="h-4 w-4 text-red-600" />
                Utan nödtelefon
              </div>
              <div className="mt-1 text-2xl font-bold">
                {nodData.utanNodtelefon}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                Behöver uppgradering
              </div>
              <div className="mt-1 text-2xl font-bold">
                {nodData.behoverUppgradering}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                Total uppgraderingskostnad
              </div>
              <div className="mt-1 text-2xl font-bold">
                {nodData.totalUppgraderingskostnad.toLocaleString("sv-SE")} kr
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per district table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Nödtelefonstatus per distrikt
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nodData.perDistrikt.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Ingen data tillgänglig.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Distrikt</TableHead>
                      <TableHead className="text-center">Med</TableHead>
                      <TableHead className="text-center">Utan</TableHead>
                      <TableHead className="text-center">
                        Uppgradering
                      </TableHead>
                      <TableHead className="text-right">Kostnad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodData.perDistrikt.map((d) => (
                      <TableRow key={d.distrikt}>
                        <TableCell className="font-medium">
                          {d.distrikt}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            {d.med}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {d.utan > 0 ? (
                            <Badge variant="destructive">{d.utan}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {d.uppgradering > 0 ? (
                            <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                              {d.uppgradering}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.kostnad > 0
                            ? `${d.kostnad.toLocaleString("sv-SE")} kr`
                            : "–"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>Totalt</TableCell>
                      <TableCell className="text-center">
                        {nodData.medNodtelefon}
                      </TableCell>
                      <TableCell className="text-center">
                        {nodData.utanNodtelefon}
                      </TableCell>
                      <TableCell className="text-center">
                        {nodData.behoverUppgradering}
                      </TableCell>
                      <TableCell className="text-right">
                        {nodData.totalUppgraderingskostnad.toLocaleString(
                          "sv-SE",
                        )}{" "}
                        kr
                      </TableCell>
                    </TableRow>
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

function UnderhallSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[380px] rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[380px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}
