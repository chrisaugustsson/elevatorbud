import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  inspectionCalendarOptions,
  maintenanceCompaniesOptions,
  emergencyPhoneStatusOptions,
  inspectionListOptions,
} from "~/server/maintenance";
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
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(inspectionCalendarOptions());
    context.queryClient.prefetchQuery(maintenanceCompaniesOptions());
    context.queryClient.prefetchQuery(emergencyPhoneStatusOptions());
  },
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

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions());

  const { data: foretagData } = useSuspenseQuery(maintenanceCompaniesOptions());

  const { data: nodData } = useSuspenseQuery(emergencyPhoneStatusOptions());

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedManad!),
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
        besiktningslista={besiktningslista}
      />

      <MaintenanceCompanies foretagData={foretagData} />

      <EmergencyPhoneStatus nodData={nodData} />
    </div>
  );
}
