export type KalenderEntry = {
  // Month number 1–12 — used as the filter-click payload and to look up
  // the Swedish name.
  monthNumber: number;
  // 3-letter Swedish abbreviation for bar axis labels ("Jan", "Feb"…).
  name: string;
  // Full Swedish month name for tooltips / section headings.
  fullName: string;
  antal: number;
  isCurrent: boolean;
  isSelected: boolean;
};

export type ForetagData = {
  company: string;
  total: number;
  districts: Record<string, number>;
}[];

export type NodData = {
  total: number;
  withPhone: number;
  withoutPhone: number;
  needsUpgrade: number;
  upgradeCost: number;
};

export type BesiktningsListaItem = {
  id: string;
  elevatorNumber: string;
  address: string | null;
  district: string | null;
  inspectionAuthority: string | null;
  maintenanceCompany: string | null;
  organizationName: string | null;
};
