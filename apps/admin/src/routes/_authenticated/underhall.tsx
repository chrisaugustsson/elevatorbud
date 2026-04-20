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

const currentMonthNumber = new Date().getMonth() + 1;
const currentMonthName = MANADER[currentMonthNumber - 1]!;

function Underhall() {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions());

  const { data: foretagData } = useSuspenseQuery(maintenanceCompaniesOptions());

  const { data: nodData } = useSuspenseQuery(emergencyPhoneStatusOptions());

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedMonth!),
    enabled: selectedMonth != null,
  });

  const kalenderData = kalender.map((k) => {
    const fullName = MANADER[k.month - 1] ?? String(k.month);
    return {
      monthNumber: k.month,
      name: fullName.substring(0, 3),
      fullName,
      antal: k.count,
      isCurrent: k.month === currentMonthNumber,
      isSelected: k.month === selectedMonth,
    };
  });

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
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        besiktningslista={besiktningslista}
      />

      <MaintenanceCompanies foretagData={foretagData} />

      <EmergencyPhoneStatus nodData={nodData} />
    </div>
  );
}
