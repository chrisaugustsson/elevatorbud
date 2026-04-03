import { useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
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
  const orgFilter = { organization_id: organizationId } as never;

  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const kalenderOpts = convexQuery(
    api.elevators.maintenance.inspectionCalendar,
    orgFilter,
  );
  const { data: kalender } = useSuspenseQuery({
    queryKey: kalenderOpts.queryKey,
    staleTime: kalenderOpts.staleTime,
  }) as { data: { month: string; count: number }[] };

  const foretagOpts = convexQuery(
    api.elevators.maintenance.companies,
    orgFilter,
  );
  const { data: foretagData } = useSuspenseQuery({
    queryKey: foretagOpts.queryKey,
    staleTime: foretagOpts.staleTime,
  }) as { data: ForetagData };

  const nodOpts = convexQuery(
    api.elevators.maintenance.emergencyPhoneStatus,
    orgFilter,
  );
  const { data: nodData } = useSuspenseQuery({
    queryKey: nodOpts.queryKey,
    staleTime: nodOpts.staleTime,
  }) as { data: NodData };

  const besiktningslistaArgs = selectedManad
    ? { organization_id: organizationId as never, month: selectedManad }
    : "skip";
  const { data: besiktningslista } = useQuery({
    ...convexQuery(
      api.elevators.maintenance.inspectionList,
      besiktningslistaArgs as never,
    ),
  }) as { data: BesiktningsListaItem[] | undefined };

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
