import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { InspectionCalendar } from "../../maintenance/components/inspection-calendar";
import { MaintenanceCompanies } from "../../maintenance/components/maintenance-companies";
import { EmergencyPhoneStatus } from "../../maintenance/components/emergency-phone-status";
import { MaintenanceSkeleton } from "../../maintenance/components/maintenance-skeleton";
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

  const kalender = useQuery(
    api.elevators.maintenance.inspectionCalendar,
    orgFilter,
  );
  const foretag = useQuery(api.elevators.maintenance.companies, orgFilter);
  const nodtelefon = useQuery(
    api.elevators.maintenance.emergencyPhoneStatus,
    orgFilter,
  );

  const besiktningslistaArgs = selectedManad
    ? { organization_id: organizationId as never, month: selectedManad }
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
