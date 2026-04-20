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

const currentMonthNumber = new Date().getMonth() + 1;

function UnderhallPage() {
  const { parentOrgId } = Route.useParams();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions(parentOrgId));

  const { data: foretag } = useSuspenseQuery(
    maintenanceCompaniesOptions(parentOrgId),
  );

  const { data: nodtelefon } = useSuspenseQuery(
    emergencyPhoneStatusOptions(parentOrgId),
  );

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedMonth!, parentOrgId),
    enabled: selectedMonth != null,
  });

  const kalenderData = kalender.map((k) => {
    const fullName = MANADER[k.month - 1] ?? String(k.month);
    return {
      monthNumber: k.month,
      name: fullName.substring(0, 3),
      fullName,
      count: k.count,
      isCurrent: k.month === currentMonthNumber,
      isSelected: k.month === selectedMonth,
    };
  });

  const totalBesiktningar = kalenderData.reduce((s, k) => s + k.count, 0);
  const currentMonthCount =
    kalenderData.find((k) => k.isCurrent)?.count || 0;

  return (
    <div className="space-y-6">
      <h1
        id="page-heading"
        className="text-2xl font-bold text-foreground focus:outline-none"
      >
        Underhåll och besiktning
      </h1>

      <InspectionCalendarSection
        kalenderData={kalenderData}
        totalBesiktningar={totalBesiktningar}
        currentMonthCount={currentMonthCount}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
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
