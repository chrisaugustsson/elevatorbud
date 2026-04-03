import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { InspectionCalendarSection } from "../../features/maintenance/components/inspection-calendar-section";
import {
  MaintenanceCompaniesSection,
  type ForetagData,
} from "../../features/maintenance/components/maintenance-companies-section";
import {
  EmergencyPhoneSection,
  type NodData,
} from "../../features/maintenance/components/emergency-phone-section";
import { UnderhallSkeleton } from "../../features/maintenance/components/underhall-skeleton";
import type { InspectionListItem } from "../../features/maintenance/components/inspection-calendar-section";

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

function UnderhallPage() {
  const user = useQuery(api.users.me);
  const orgFilter = user?.organization_id
    ? ({ organization_id: user.organization_id } as never)
    : "skip";

  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const kalender = useQuery(
    api.elevators.maintenance.inspectionCalendar,
    orgFilter as never,
  );
  const foretag = useQuery(api.elevators.maintenance.companies, orgFilter as never);
  const nodtelefon = useQuery(
    api.elevators.maintenance.emergencyPhoneStatus,
    orgFilter as never,
  );

  const besiktningslistaArgs =
    selectedManad && user?.organization_id
      ? ({ organization_id: user.organization_id as never, month: selectedManad })
      : "skip";
  const besiktningslista = useQuery(
    api.elevators.maintenance.inspectionList,
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

  const kalenderData = (kalender as { month: string; count: number }[]).map(
    (k) => ({
      name: k.month.substring(0, 3),
      fullName: k.month,
      count: k.count,
      isCurrent: k.month === currentMonthName,
      isSelected: k.month === selectedManad,
    }),
  );

  const totalBesiktningar = kalenderData.reduce((s, k) => s + k.count, 0);
  const currentMonthCount =
    kalenderData.find((k) => k.isCurrent)?.count || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        Underhåll och besiktning
      </h1>

      <InspectionCalendarSection
        kalenderData={kalenderData}
        totalBesiktningar={totalBesiktningar}
        currentMonthCount={currentMonthCount}
        selectedManad={selectedManad}
        onSelectManad={setSelectedManad}
        besiktningslista={besiktningslista as InspectionListItem[] | undefined}
      />

      <MaintenanceCompaniesSection
        foretagData={foretag as ForetagData}
      />

      <EmergencyPhoneSection
        nodData={nodtelefon as NodData}
      />
    </div>
  );
}
