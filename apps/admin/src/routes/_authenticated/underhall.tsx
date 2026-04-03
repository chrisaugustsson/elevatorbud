import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
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

  const kalender = useQuery(api.elevators.maintenance.inspectionCalendar, {});
  const foretag = useQuery(api.elevators.maintenance.companies, {});
  const nodtelefon = useQuery(api.elevators.maintenance.emergencyPhoneStatus, {});

  const besiktningslistaArgs = selectedManad
    ? { month: selectedManad }
    : "skip";
  const besiktningslista = useQuery(
    api.elevators.maintenance.inspectionList,
    besiktningslistaArgs as never,
  );

  if (
    kalender === undefined ||
    foretag === undefined ||
    nodtelefon === undefined
  ) {
    return <MaintenanceSkeleton />;
  }

  const kalenderData = (kalender as { month: string; count: number }[]).map(
    (k) => ({
      name: k.month.substring(0, 3),
      fullName: k.month,
      antal: k.count,
      isCurrent: k.month === currentMonthName,
      isSelected: k.month === selectedManad,
    }),
  );

  const totalBesiktningar = kalenderData.reduce((s, k) => s + k.antal, 0);
  const currentMonthCount =
    kalenderData.find((k) => k.isCurrent)?.antal || 0;

  const foretagData = foretag as ForetagData;
  const nodData = nodtelefon as NodData;

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
