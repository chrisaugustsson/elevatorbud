import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { InspectionCalendar } from "../../features/maintenance/components/inspection-calendar";
import { MaintenanceCompanies } from "../../features/maintenance/components/maintenance-companies";
import { EmergencyPhoneStatus } from "../../features/maintenance/components/emergency-phone-status";
import { MaintenanceSkeleton } from "../../features/maintenance/components/maintenance-skeleton";
import type {
  ForetagData,
  NodData,
  BesiktningsListaItem,
} from "../../features/maintenance/types";

export const Route = createFileRoute("/_authenticated/underhall")({
  component: Underhall,
  pendingComponent: MaintenanceSkeleton,
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

function Underhall() {
  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const kalenderOpts = convexQuery(
    api.elevators.maintenance.inspectionCalendar,
    {},
  );
  const { data: kalender } = useSuspenseQuery({
    queryKey: kalenderOpts.queryKey,
    staleTime: kalenderOpts.staleTime,
  }) as { data: { month: string; count: number }[] };

  const foretagOpts = convexQuery(api.elevators.maintenance.companies, {});
  const { data: foretagData } = useSuspenseQuery({
    queryKey: foretagOpts.queryKey,
    staleTime: foretagOpts.staleTime,
  }) as { data: ForetagData };

  const nodOpts = convexQuery(
    api.elevators.maintenance.emergencyPhoneStatus,
    {},
  );
  const { data: nodData } = useSuspenseQuery({
    queryKey: nodOpts.queryKey,
    staleTime: nodOpts.staleTime,
  }) as { data: NodData };

  const { data: besiktningslista } = useQuery({
    ...convexQuery(api.elevators.maintenance.inspectionList, {
      month: selectedManad!,
    }),
    enabled: !!selectedManad,
  });

  const kalenderData = kalender.map((k) => ({
    name: k.month.substring(0, 3),
    fullName: k.month,
    antal: k.count,
    isCurrent: k.month === currentMonthName,
    isSelected: k.month === selectedManad,
  }));

  const totalBesiktningar = kalenderData.reduce((s, k) => s + k.antal, 0);
  const currentMonthCount =
    kalenderData.find((k) => k.isCurrent)?.antal || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        Underhåll och besiktning
      </h1>

      <InspectionCalendar
        kalenderData={kalenderData}
        totalBesiktningar={totalBesiktningar}
        currentMonthCount={currentMonthCount}
        currentMonthName={currentMonthName}
        selectedManad={selectedManad}
        onSelectManad={setSelectedManad}
        besiktningslista={besiktningslista as BesiktningsListaItem[] | undefined}
      />

      <MaintenanceCompanies foretagData={foretagData} />

      <EmergencyPhoneStatus nodData={nodData} />
    </div>
  );
}
