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

const currentMonthNumber = new Date().getMonth() + 1;
const currentMonthName = MANADER[currentMonthNumber - 1]!;

export function OrgMaintenanceView({
  organizationId,
}: {
  organizationId: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data: kalender } = useSuspenseQuery(inspectionCalendarOptions(organizationId));

  const { data: foretagData } = useSuspenseQuery(maintenanceCompaniesOptions(organizationId));

  const { data: nodData } = useSuspenseQuery(emergencyPhoneStatusOptions(organizationId));

  const { data: besiktningslista } = useQuery({
    ...inspectionListOptions(selectedMonth!, organizationId),
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
