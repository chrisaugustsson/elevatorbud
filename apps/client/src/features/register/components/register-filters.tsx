import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { MultiSelectFilter } from "@elevatorbud/ui/components/ui/multi-select-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { X } from "lucide-react";

interface FilterOptions {
  district: string[];
  elevator_type: string[];
  manufacturer: string[];
}

interface RegisterFiltersProps {
  filterOptions: FilterOptions | null;
  filterDistrict: string[];
  onFilterDistrictChange: (value: string[]) => void;
  filterElevatorType: string[];
  onFilterElevatorTypeChange: (value: string[]) => void;
  filterManufacturer: string[];
  onFilterManufacturerChange: (value: string[]) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  buildYearMin: string;
  onBuildYearMinChange: (value: string) => void;
  buildYearMax: string;
  onBuildYearMaxChange: (value: string) => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

export function RegisterFilters({
  filterOptions,
  filterDistrict,
  onFilterDistrictChange,
  filterElevatorType,
  onFilterElevatorTypeChange,
  filterManufacturer,
  onFilterManufacturerChange,
  statusFilter,
  onStatusFilterChange,
  buildYearMin,
  onBuildYearMinChange,
  buildYearMax,
  onBuildYearMaxChange,
  hasActiveFilters,
  onClearAllFilters,
}: RegisterFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterOptions && (
        <>
          <MultiSelectFilter
            title="Distrikt"
            options={filterOptions.district}
            selected={filterDistrict}
            onSelectedChange={onFilterDistrictChange}
            emptyText="Inga alternativ"
            clearText="Rensa"
          />
          <MultiSelectFilter
            title="Hisstyp"
            options={filterOptions.elevator_type}
            selected={filterElevatorType}
            onSelectedChange={onFilterElevatorTypeChange}
            emptyText="Inga alternativ"
            clearText="Rensa"
          />
          <MultiSelectFilter
            title="Fabrikat"
            options={filterOptions.manufacturer}
            selected={filterManufacturer}
            onSelectedChange={onFilterManufacturerChange}
            emptyText="Inga alternativ"
            clearText="Rensa"
          />
        </>
      )}

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Aktiva</SelectItem>
          <SelectItem value="demolished">Rivda</SelectItem>
          <SelectItem value="archived">Arkiverade</SelectItem>
          <SelectItem value="alla">Alla</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">Byggår:</span>
        <Input
          type="number"
          placeholder="Från"
          value={buildYearMin}
          onChange={(e) => onBuildYearMinChange(e.target.value)}
          className="h-9 w-20"
        />
        <span className="text-muted-foreground">{"\u2013"}</span>
        <Input
          type="number"
          placeholder="Till"
          value={buildYearMax}
          onChange={(e) => onBuildYearMaxChange(e.target.value)}
          className="h-9 w-20"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAllFilters}>
          <X className="mr-1 size-3" />
          Rensa filter
        </Button>
      )}
    </div>
  );
}
