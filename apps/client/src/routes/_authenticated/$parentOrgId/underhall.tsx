import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { meOptions } from "../../../server/user";
import {
  inspectionCalendarOptions,
  maintenanceCompaniesOptions,
  emergencyPhoneStatusOptions,
  inspectionListOptions,
} from "../../../server/maintenance";
import { InspectionCalendarSection } from "../../../features/maintenance/components/inspection-calendar-section";
import {
  MaintenanceCompaniesSection,
  type ForetagData,
} from "../../../features/maintenance/components/maintenance-companies-section";
import {
  EmergencyPhoneSection,
  type NodData,
} from "../../../features/maintenance/components/emergency-phone-section";
import { UnderhallSkeleton } from "../../../features/maintenance/components/underhall-skeleton";
import type { InspectionListItem } from "../../../features/maintenance/components/inspection-calendar-section";

export const Route = createFileRoute("/_authenticated/$parentOrgId/underhall")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(inspectionCalendarOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(maintenanceCompaniesOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(emergencyPhoneStatusOptions(params.parentOrgId));
  },
  component: UnderhallPage,
  pendingComponent: UnderhallSkeleton,
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
  const { parentOrgId } = Route.useParams();
  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions(parentOrgId));

  const { data: foretag } = useSuspenseQuery(
    maintenanceCompaniesOptions(parentOrgId),
  );

  const { data: nodtelefon } = useSuspenseQuery(
    emergencyPhoneStatusOptions(parentOrgId),
  );

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedManad!, parentOrgId),
    enabled: !!selectedManad,
  });

  const kalenderData = kalender.map((k) => ({
    name: k.month.substring(0, 3),
    fullName: k.month,
    count: k.count,
    isCurrent: k.month === currentMonthName,
    isSelected: k.month === selectedManad,
  }));

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
        besiktningslista={besiktningslista}
      />

      <MaintenanceCompaniesSection
        foretagData={foretag}
      />

      <EmergencyPhoneSection
        nodData={nodtelefon}
      />
    </div>
  );
}
