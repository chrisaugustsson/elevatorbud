export type KalenderEntry = {
  name: string;
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
