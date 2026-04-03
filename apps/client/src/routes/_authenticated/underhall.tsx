import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
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
  const userOpts = convexQuery(api.users.me, {});
  const { data: user } = useSuspenseQuery({
    queryKey: userOpts.queryKey,
    staleTime: userOpts.staleTime,
  });

  const [selectedManad, setSelectedManad] = useState<string | null>(null);

  const orgArgs = { organization_id: user!.organization_id } as never;

  const kalenderOpts = convexQuery(api.elevators.maintenance.inspectionCalendar, orgArgs);
  const { data: kalender } = useSuspenseQuery({
    queryKey: kalenderOpts.queryKey,
    staleTime: kalenderOpts.staleTime,
  }) as { data: { month: string; count: number }[] };

  const foretagOpts = convexQuery(api.elevators.maintenance.companies, orgArgs);
  const { data: foretag } = useSuspenseQuery({
    queryKey: foretagOpts.queryKey,
    staleTime: foretagOpts.staleTime,
  }) as { data: ForetagData };

  const nodOpts = convexQuery(api.elevators.maintenance.emergencyPhoneStatus, orgArgs);
  const { data: nodtelefon } = useSuspenseQuery({
    queryKey: nodOpts.queryKey,
    staleTime: nodOpts.staleTime,
  }) as { data: NodData };

  const { data: besiktningslista } = useQuery({
    ...convexQuery(api.elevators.maintenance.inspectionList, {
      organization_id: user!.organization_id,
      month: selectedManad!,
    } as never),
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
