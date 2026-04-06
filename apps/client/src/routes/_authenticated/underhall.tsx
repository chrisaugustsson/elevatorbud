import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { meOptions } from "../../server/user";
import {
  inspectionCalendarOptions,
  maintenanceCompaniesOptions,
  emergencyPhoneStatusOptions,
  inspectionListOptions,
} from "../../server/maintenance";
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
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(inspectionCalendarOptions());
    context.queryClient.prefetchQuery(maintenanceCompaniesOptions());
    context.queryClient.prefetchQuery(emergencyPhoneStatusOptions());
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
  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions());

  const { data: foretag } = useSuspenseQuery(
    maintenanceCompaniesOptions(),
  );

  const { data: nodtelefon } = useSuspenseQuery(
    emergencyPhoneStatusOptions(),
  );

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedManad!),
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
