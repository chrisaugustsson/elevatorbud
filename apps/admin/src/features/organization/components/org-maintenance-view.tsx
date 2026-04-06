import { useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  inspectionCalendarOptions,
  maintenanceCompaniesOptions,
  emergencyPhoneStatusOptions,
  inspectionListOptions,
} from "~/server/maintenance";
import { InspectionCalendar } from "../../maintenance/components/inspection-calendar";
import { MaintenanceCompanies } from "../../maintenance/components/maintenance-companies";
import { EmergencyPhoneStatus } from "../../maintenance/components/emergency-phone-status";
import type {
  ForetagData,
  NodData,
  BesiktningsListaItem,
} from "../../maintenance/types";

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

export function OrgMaintenanceView({
  organizationId,
}: {
  organizationId: string;
}) {
  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions(organizationId));

  const { data: foretagData } = useSuspenseQuery(maintenanceCompaniesOptions(organizationId));

  const { data: nodData } = useSuspenseQuery(emergencyPhoneStatusOptions(organizationId));

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedManad!, organizationId),
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
