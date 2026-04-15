import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@elevatorbud/ui/components/ui/command";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
  Info,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import { listOrganizationsOptions } from "~/server/organization";

export type OrgMappingEntry = {
  excelName: string;
  orgId: string | null;
};

export function OrgMappingSection({
  orgNames,
  rowCount,
  onConfirm,
  onCancel,
}: {
  orgNames: string[];
  rowCount: number;
  onConfirm: (mappings: OrgMappingEntry[]) => void;
  onCancel: () => void;
}) {
  const { data: existingOrgs = [] } = useQuery(listOrganizationsOptions());

  const initialMappings = useMemo(() => {
    const orgMap = new Map(existingOrgs.map((o) => [o.name, o.id]));
    return orgNames.map((name): OrgMappingEntry => {
      const exactMatch = orgMap.get(name);
      return { excelName: name, orgId: exactMatch ?? null };
    });
  }, [orgNames, existingOrgs]);

  const [mappings, setMappings] = useState<OrgMappingEntry[]>([]);

  const activeMappings = mappings.length > 0 ? mappings : initialMappings;

  const allResolved = activeMappings.every(
    (m) => m.orgId !== null,
  );

  const noMatchesExist = existingOrgs.length === 0;

  const handleOrgSelect = (excelName: string, orgId: string | null) => {
    const current = mappings.length > 0 ? mappings : [...initialMappings];
    setMappings(
      current.map((m) =>
        m.excelName === excelName ? { ...m, orgId } : m,
      ),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisationsmappning</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mappa {orgNames.length} organisationsnamn från Excel-filen till
          befintliga organisationer i systemet. {rowCount} rader totalt.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {noMatchesExist && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Inga befintliga organisationer hittades. Alla namn kan mappas
                till &quot;Skapa organisation&quot; för att skapa nya
                organisationer vid import.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
            <span>Namn i Excel</span>
            <span>Organisation i systemet</span>
          </div>
          <div className="divide-y">
            {activeMappings.map((mapping) => (
              <OrgMappingRow
                key={mapping.excelName}
                mapping={mapping}
                existingOrgs={existingOrgs}
                onSelect={(orgId) =>
                  handleOrgSelect(mapping.excelName, orgId)
                }
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {activeMappings.filter((m) => m.orgId !== null).length} av{" "}
            {activeMappings.length} mappade
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Avbryt
            </Button>
            <Button
              onClick={() => onConfirm(activeMappings)}
              disabled={!allResolved}
            >
              Fortsätt
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrgMappingRow({
  mapping,
  existingOrgs,
  onSelect,
}: {
  mapping: OrgMappingEntry;
  existingOrgs: { id: string; name: string; parentId: string | null }[];
  onSelect: (orgId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const CREATE_SENTINEL = "__create__";

  const selectedOrg = existingOrgs.find((o) => o.id === mapping.orgId);
  const isCreate = mapping.orgId === CREATE_SENTINEL;
  const isResolved = mapping.orgId !== null;

  return (
    <div className="grid grid-cols-[1fr_1fr] items-center gap-4 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {mapping.excelName}
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !isResolved && "border-destructive text-destructive",
            )}
          >
            <span className="truncate">
              {isCreate ? (
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Skapa &quot;{mapping.excelName}&quot;
                </span>
              ) : selectedOrg ? (
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  {selectedOrg.name}
                </span>
              ) : (
                "Välj organisation..."
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Sök organisation..." />
            <CommandList>
              <CommandEmpty>Inga organisationer hittades.</CommandEmpty>
              <CommandGroup>
                {existingOrgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => {
                      onSelect(org.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        mapping.orgId === org.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="truncate">{org.name}</span>
                    {org.parentId && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        Underorg.
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value={`create-${mapping.excelName}`}
                  onSelect={() => {
                    onSelect(CREATE_SENTINEL);
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Skapa organisation &quot;{mapping.excelName}&quot;
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
