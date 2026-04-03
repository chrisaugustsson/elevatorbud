export type KalenderEntry = {
  name: string;
  fullName: string;
  antal: number;
  isCurrent: boolean;
  isSelected: boolean;
};

export type ForetagData = {
  companies: {
    name: string;
    count: number;
    byDistrict: { district: string; count: number }[];
  }[];
  districts: string[];
};

export type NodData = {
  withEmergencyPhone: number;
  withoutEmergencyPhone: number;
  needsUpgrade: number;
  totalUpgradeCost: number;
  byDistrict: {
    district: string;
    with: number;
    without: number;
    upgrade: number;
    cost: number;
  }[];
};

export type BesiktningsListaItem = {
  _id: string;
  elevator_number: string;
  address?: string;
  district?: string;
  inspection_authority?: string;
  organizationName: string;
};
