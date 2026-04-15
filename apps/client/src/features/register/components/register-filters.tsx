import { Badge } from "@elevatorbud/ui/components/ui/badge";
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

type SubOrg = { id: string; name: string };

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
  childOrgs?: SubOrg[];
  subOrgId?: string;
  onSubOrgChange?: (value: string | undefined) => void;
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
  childOrgs,
  subOrgId,
  onSubOrgChange,
}: RegisterFiltersProps) {
  const selectedSubOrgName = childOrgs?.find((o) => o.id === subOrgId)?.name;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {childOrgs && childOrgs.length > 0 && onSubOrgChange && (
          <Select
            value={subOrgId ?? "__all__"}
            onValueChange={(v) => onSubOrgChange(v === "__all__" ? undefined : v)}
          >
            <SelectTrigger className="h-10 w-48">
              <SelectValue placeholder="Alla underorganisationer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Alla underorganisationer</SelectItem>
              {childOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
        <SelectTrigger className="h-10 w-36">
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
          className="h-10 w-20"
        />
        <span className="text-muted-foreground">{"–"}</span>
        <Input
          type="number"
          placeholder="Till"
          value={buildYearMax}
          onChange={(e) => onBuildYearMaxChange(e.target.value)}
          className="h-10 w-20"
        />
      </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAllFilters}>
            <X className="mr-1 size-3" />
            Rensa filter
          </Button>
        )}
      </div>

      {subOrgId && selectedSubOrgName && onSubOrgChange && (
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 py-1 pl-2 pr-1 text-sm"
          >
            {selectedSubOrgName}
            <button
              type="button"
              onClick={() => onSubOrgChange(undefined)}
              className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Rensa filter: ${selectedSubOrgName}`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </Badge>
        </div>
      )}
    </div>
  );
}
