import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@elevatorbud/ui/components/ui/dialog";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
  Info,
  AlertCircle,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  listOrganizationsOptions,
  createOrganization,
} from "~/server/organization";

export type OrgMappingEntry = {
  excelName: string;
  orgId: string | null;
};

export function OrgMappingSection({
  orgNames,
  rowCount,
  priorMappings,
  onConfirm,
  onBack,
  headingRef,
}: {
  orgNames: string[];
  rowCount: number;
  priorMappings?: OrgMappingEntry[];
  onConfirm: (mappings: OrgMappingEntry[]) => void;
  onBack: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  const queryClient = useQueryClient();
  const { data: existingOrgs = [], isLoading: existingOrgsLoading } = useQuery(
    listOrganizationsOptions(),
  );

  const initialMappings = useMemo(() => {
    // Case-sensitive exact-string match only (FR-9). Different casing is not
    // auto-merged — the admin decides.
    const orgMap = new Map(existingOrgs.map((o) => [o.name, o.id]));
    const priorByName = new Map(
      (priorMappings ?? []).map((m) => [m.excelName, m.orgId]),
    );
    return orgNames.map((name): OrgMappingEntry => {
      if (priorByName.has(name)) {
        return { excelName: name, orgId: priorByName.get(name) ?? null };
      }
      const exactMatch = orgMap.get(name);
      return { excelName: name, orgId: exactMatch ?? null };
    });
  }, [orgNames, existingOrgs, priorMappings]);

  const [mappings, setMappings] = useState<OrgMappingEntry[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogName, setCreateDialogName] = useState("");
  const triggerRefMap = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeMappings = mappings.length > 0 ? mappings : initialMappings;

  const allResolved = activeMappings.every(
    (m) => m.orgId !== null,
  );

  // Only treat "no matches" as a real state once the fetch has completed —
  // otherwise the banner flashes in while orgs are loading.
  const noMatchesExist = !existingOrgsLoading && existingOrgs.length === 0;

  const handleOrgSelect = (excelName: string, orgId: string | null) => {
    const current = mappings.length > 0 ? mappings : [...initialMappings];
    setMappings(
      current.map((m) =>
        m.excelName === excelName ? { ...m, orgId } : m,
      ),
    );
  };

  const handleCreateRequest = (excelName: string) => {
    setCreateDialogName(excelName);
    setCreateDialogOpen(true);
  };

  const handleCreateSubmit = async (values: {
    name: string;
    parentId?: string | null;
  }) => {
    const newOrg = await createOrganization({
      data: {
        name: values.name,
        parentId: values.parentId ?? undefined,
      },
    });
    await queryClient.invalidateQueries({ queryKey: ["organization", "list"] });
    handleOrgSelect(createDialogName, newOrg.id);
    setCreateDialogOpen(false);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      requestAnimationFrame(() => {
        triggerRefMap.current.get(createDialogName)?.focus();
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle ref={headingRef} tabIndex={-1}>Organisationsmappning</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mappa {orgNames.length} organisationsnamn från Excel-filen till
            befintliga organisationer i systemet. {rowCount} rader totalt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {noMatchesExist && (
            <div
              className="rounded-md border bg-muted p-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Inga befintliga organisationer hittades. Använd &quot;Skapa
                  organisation&quot; för att skapa nya organisationer direkt
                  från denna vy.
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
              {existingOrgsLoading ? (
                // While the list of existing orgs is loading, show skeleton
                // rows so the admin sees structure rather than empty cells.
                Array.from({ length: Math.max(3, Math.min(orgNames.length, 6)) }).map(
                  (_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="grid grid-cols-[1fr_1fr] items-center gap-4 px-4 py-3"
                      aria-hidden="true"
                    >
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ),
                )
              ) : (
                activeMappings.map((mapping) => (
                  <OrgMappingRow
                    key={mapping.excelName}
                    mapping={mapping}
                    existingOrgs={existingOrgs}
                    onSelect={(orgId) =>
                      handleOrgSelect(mapping.excelName, orgId)
                    }
                    onCreateRequest={() =>
                      handleCreateRequest(mapping.excelName)
                    }
                    triggerRef={(el) => {
                      if (el) {
                        triggerRefMap.current.set(mapping.excelName, el);
                      } else {
                        triggerRefMap.current.delete(mapping.excelName);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {activeMappings.filter((m) => m.orgId !== null).length} av{" "}
              {activeMappings.length} mappade
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>
                Tillbaka
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

      <CreateOrgDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        defaultName={createDialogName}
        existingOrgs={existingOrgs}
        onSubmit={handleCreateSubmit}
      />
    </>
  );
}

function OrgMappingRow({
  mapping,
  existingOrgs,
  onSelect,
  onCreateRequest,
  triggerRef,
}: {
  mapping: OrgMappingEntry;
  existingOrgs: { id: string; name: string; parentId: string | null }[];
  onSelect: (orgId: string | null) => void;
  onCreateRequest: () => void;
  triggerRef: (el: HTMLButtonElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOrg = existingOrgs.find((o) => o.id === mapping.orgId);
  const isResolved = mapping.orgId !== null;

  const MAX_VISIBLE = 100;
  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? existingOrgs.filter((o) => o.name.toLowerCase().includes(q))
      : existingOrgs;
  }, [existingOrgs, search]);
  const visibleOrgs = useMemo(
    () => filteredOrgs.slice(0, MAX_VISIBLE),
    [filteredOrgs],
  );
  const hiddenCount = Math.max(0, filteredOrgs.length - visibleOrgs.length);

  return (
    <div className="grid grid-cols-[1fr_1fr] items-center gap-4 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate text-sm font-medium" title={mapping.excelName}>
          {mapping.excelName}
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={
              isResolved
                ? `Organisation mappad till ${selectedOrg?.name}`
                : `Omappad organisation: ${mapping.excelName}. Välj organisation eller skapa ny.`
            }
            title={selectedOrg?.name ?? undefined}
            className={cn(
              "w-full justify-between",
              !isResolved && "border-destructive text-destructive",
            )}
          >
            <span className="truncate">
              {selectedOrg ? (
                <span className="flex items-center gap-1.5">
                  <Check
                    className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  {selectedOrg.name}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Välj organisation...
                </span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Sök organisation..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Inga organisationer hittades.</CommandEmpty>
              <CommandGroup>
                {visibleOrgs.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    title={org.name}
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
                {hiddenCount > 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Visar {visibleOrgs.length} av {visibleOrgs.length + hiddenCount}. Skriv för att filtrera fler.
                  </div>
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value={`create-${mapping.excelName}`}
                  onSelect={() => {
                    setOpen(false);
                    onCreateRequest();
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

function CreateOrgDialog({
  open,
  onOpenChange,
  defaultName,
  existingOrgs,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  existingOrgs: { id: string; name: string; parentId: string | null }[];
  onSubmit: (values: { name: string; parentId?: string | null }) => Promise<void>;
}) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: defaultName,
      parentId: null as string | null,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        parentId: value.parentId,
      });
      form.reset();
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      form.setFieldValue("name", defaultName);
    }
  }, [open, defaultName]);

  const hasModifiedFields = () => {
    const name = form.getFieldValue("name");
    const parentId = form.getFieldValue("parentId");
    return name !== defaultName || parentId !== null;
  };

  const closeWithoutConfirm = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && hasModifiedFields()) {
      setConfirmDiscardOpen(true);
      return;
    }
    if (!next) form.reset();
    onOpenChange(next);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa organisation</DialogTitle>
          <DialogDescription>
            Skapa en ny organisation direkt från importflödet. Namn är
            förifylt från Excel-filen.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Namn krävs" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Namn <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Organisationsnamn"
                  aria-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  }
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {error}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field name="parentId">
            {(field) => (
              <div className="space-y-2">
                <Label>Moderorganisation</Label>
                <ParentOrgSelect
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                  orgs={existingOrgs}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Skapar..." : "Skapa"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Kasta ändringarna?</DialogTitle>
          <DialogDescription>
            Du har osparade ändringar. Om du stänger dialogen försvinner de.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDiscardOpen(false)}
          >
            Fortsätt redigera
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setConfirmDiscardOpen(false);
              closeWithoutConfirm();
            }}
          >
            Kasta ändringar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ParentOrgSelect({
  value,
  onChange,
  orgs,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  orgs: { id: string; name: string; parentId: string | null }[];
}) {
  const [open, setOpen] = useState(false);

  const rootOrgs = useMemo(
    () => orgs.filter((o) => o.parentId === null),
    [orgs],
  );

  const selectedName = rootOrgs.find((o) => o.id === value)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedName ?? "Ingen (toppnivå)"}
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
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0",
                  )}
                />
                Ingen (toppnivå)
              </CommandItem>
              {rootOrgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => {
                    onChange(org.id === value ? null : org.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      org.id === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {org.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
