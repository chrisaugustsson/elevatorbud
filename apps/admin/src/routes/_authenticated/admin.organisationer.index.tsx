import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listOrganizationsOptions, createOrganization, updateOrganization, previewParentChange } from "~/server/organization";
import { useForm } from "@tanstack/react-form";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import {
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridColumnHeader,
} from "@elevatorbud/ui/components/ui/data-grid-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@elevatorbud/ui/components/ui/dialog";
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
} from "@elevatorbud/ui/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@elevatorbud/ui/components/ui/tooltip";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Building2, UserPlus, Check, ChevronsUpDown, X, ChevronDown, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@elevatorbud/ui/components/ui/collapsible";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";

export const Route = createFileRoute(
  "/_authenticated/admin/organisationer/",
)({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(listOrganizationsOptions());
  },
  component: Organisationer,
  pendingComponent: OrganisationerSkeleton,
});

type Organisation = {
  id: string;
  name: string;
  organizationNumber: string | null;
  parentId: string | null;
  createdAt: Date;
};

const columnHelper = createColumnHelper<Organisation>();

const columns = [
  columnHelper.accessor("name", {
    size: 220,
    header: ({ column }) => (
      <DataGridColumnHeader title="Namn" column={column} />
    ),
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("organizationNumber", {
    size: 140,
    header: ({ column }) => (
      <DataGridColumnHeader title="Org.nummer" column={column} />
    ),
    enableSorting: false,
    cell: (info) => (
      <span className="tabular-nums">{info.getValue() || "—"}</span>
    ),
  }),
];

function validateOrganisationsnummer(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d{6}-\d{4}$/.test(value)) {
    return "Format: XXXXXX-XXXX (t.ex. 556677-8899)";
  }
  return undefined;
}

function Organisationer() {
  const queryClient = useQueryClient();
  const { data: orgs } = useSuspenseQuery(listOrganizationsOptions());
  const createOrg = useMutation({
    mutationFn: (input: { name: string; organizationNumber?: string; parentId?: string | null }) =>
      createOrganization({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organization"] }); },
  });
  const updateOrg = useMutation({
    mutationFn: (input: { id: string; name?: string; organizationNumber?: string; parentId?: string | null }) =>
      updateOrganization({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organization"] }); },
  });
  const navigate = useNavigate();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Organisation | null>(null);

  const table = useReactTable({
    data: orgs,
    columns,
    columnResizeMode: "onChange",
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organisationer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hantera kundorganisationer och deras kontaktuppgifter.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Ny organisation
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Sök organisation..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} organisationer
        </p>
      </div>

      <DataGrid
        table={table}
        recordCount={orgs.length}
        tableLayout={{ width: "fixed", columnsResizable: true }}
        onRowClick={(row) =>
          navigate({
            to: "/admin/organisationer/$id" as string,
            params: { id: row.id },
          })
        }
        emptyMessage={
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Building2 className="size-8" />
            <p>Inga organisationer hittades.</p>
          </div>
        }
      >
        <DataGridContainer>
          <div className="overflow-x-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
      </DataGrid>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgs={orgs}
        onSubmit={async (values) => {
          await createOrg.mutateAsync(values);
          setCreateOpen(false);
        }}
      />

      <EditOrgDialog
        org={editOrg}
        orgs={orgs}
        onOpenChange={(open) => {
          if (!open) setEditOrg(null);
        }}
        onSubmit={async (values) => {
          if (!editOrg) return;
          await updateOrg.mutateAsync({ id: editOrg.id, ...values });
          setEditOrg(null);
        }}
      />
    </div>
  );
}

function ParentOrgSelect({
  value,
  onChange,
  orgs,
  excludeId,
  disabled,
  disabledReason,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  orgs: Organisation[];
  excludeId?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);

  const rootOrgs = useMemo(
    () => orgs.filter((o) => o.parentId === null && o.id !== excludeId),
    [orgs, excludeId],
  );

  const selectedName = rootOrgs.find((o) => o.id === value)?.name;

  const trigger = (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedName ?? "Ingen (toppnivå)"}
          </span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Rensa val"
                className="rounded-sm hover:bg-accent p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(null);
                  }
                }}
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök organisation..." />
          <CommandList>
            <CommandEmpty>Inga organisationer hittades.</CommandEmpty>
            <CommandGroup>
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
                    className={org.id === value ? "opacity-100" : "opacity-0"}
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

  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{trigger}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return trigger;
}

function CreateOrgDialog({
  open,
  onOpenChange,
  orgs,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgs: Organisation[];
  onSubmit: (values: {
    name: string;
    organizationNumber?: string;
    parentId?: string | null;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      organizationNumber: "",
      parentId: null as string | null,
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        organizationNumber: value.organizationNumber || undefined,
        parentId: value.parentId,
      });
      form.reset();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ny organisation</DialogTitle>
          <DialogDescription>
            Skapa en ny kundorganisation. Namn är obligatoriskt.
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

          <form.Field
            name="organizationNumber"
            validators={{
              onChange: ({ value }) => validateOrganisationsnummer(value),
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Organisationsnummer</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="XXXXXX-XXXX"
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
                  orgs={orgs}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Sparar..." : "Skapa"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditOrgDialog({
  org,
  orgs,
  onOpenChange,
  onSubmit,
}: {
  org: Organisation | null;
  orgs: Organisation[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name?: string;
    organizationNumber?: string;
    parentId?: string | null;
  }) => Promise<void>;
}) {
  if (!org) return null;

  return (
    <EditOrgDialogInner
      key={org.id}
      org={org}
      orgs={orgs}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

type AffectedUser = { id: string; name: string; email: string };
type AccessImpact = { gained: AffectedUser[]; lost: AffectedUser[] };

function ParentChangeWarningDialog({
  open,
  onOpenChange,
  impact,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: AccessImpact;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Ändring påverkar användaråtkomst
          </DialogTitle>
          <DialogDescription>
            Att ändra moderorganisation påverkar vilka användare som har ärvd
            åtkomst till denna organisation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {impact.gained.length > 0 && (
              <Badge variant="outline" className="gap-1.5 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                <ArrowUp className="size-3" />
                {impact.gained.length} {impact.gained.length === 1 ? "användare får" : "användare får"} åtkomst
              </Badge>
            )}
            {impact.lost.length > 0 && (
              <Badge variant="outline" className="gap-1.5 border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <ArrowDown className="size-3" />
                {impact.lost.length} {impact.lost.length === 1 ? "användare förlorar" : "användare förlorar"} åtkomst
              </Badge>
            )}
          </div>

          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                <ChevronDown
                  className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
                Visa berörda användare
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {impact.gained.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300">
                      Får åtkomst
                    </p>
                    {impact.gained.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm">
                        <ArrowUp className="size-3 shrink-0 text-green-600" />
                        <span>{u.name}</span>
                        <span className="text-muted-foreground">{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                {impact.lost.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">
                      Förlorar åtkomst
                    </p>
                    {impact.lost.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm">
                        <ArrowDown className="size-3 shrink-0 text-red-600" />
                        <span>{u.name}</span>
                        <span className="text-muted-foreground">{u.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Avbryt
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Sparar..." : "Bekräfta ändring"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditOrgDialogInner({
  org,
  orgs,
  onOpenChange,
  onSubmit,
}: {
  org: Organisation;
  orgs: Organisation[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name?: string;
    organizationNumber?: string;
    parentId?: string | null;
  }) => Promise<void>;
}) {
  const hasChildren = useMemo(
    () => orgs.some((o) => o.parentId === org.id),
    [orgs, org.id],
  );

  const [warningOpen, setWarningOpen] = useState(false);
  const [accessImpact, setAccessImpact] = useState<AccessImpact | null>(null);
  const [pendingValues, setPendingValues] = useState<{
    name?: string;
    organizationNumber?: string;
    parentId?: string | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      name: org.name,
      organizationNumber: org.organizationNumber ?? "",
      parentId: org.parentId,
    },
    onSubmit: async ({ value }) => {
      const values = {
        name: value.name,
        organizationNumber: value.organizationNumber || undefined,
        parentId: value.parentId,
      };

      const parentChanged = value.parentId !== org.parentId;

      if (parentChanged) {
        const impact = await previewParentChange({
          data: {
            orgId: org.id,
            oldParentId: org.parentId,
            newParentId: value.parentId,
          },
        });

        if (impact.gained.length > 0 || impact.lost.length > 0) {
          setAccessImpact(impact);
          setPendingValues(values);
          setWarningOpen(true);
          return;
        }
      }

      await onSubmit(values);
    },
  });

  const handleConfirmParentChange = async () => {
    if (!pendingValues) return;
    setIsSubmitting(true);
    try {
      await onSubmit(pendingValues);
    } finally {
      setIsSubmitting(false);
      setWarningOpen(false);
      setPendingValues(null);
      setAccessImpact(null);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redigera organisation</DialogTitle>
            <DialogDescription>
              Uppdatera organisationens uppgifter.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Link
              to="/admin/anvandare"
              search={{ org: org.id, create: true }}
            >
              <Button variant="outline" size="sm" className="w-full">
                <UserPlus className="mr-1 size-4" />
                Lägg till kundanvändare
              </Button>
            </Link>
          </div>
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

            <form.Field
              name="organizationNumber"
              validators={{
                onChange: ({ value }) => validateOrganisationsnummer(value),
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Organisationsnummer</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="XXXXXX-XXXX"
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
                    orgs={orgs}
                    excludeId={org.id}
                    disabled={hasChildren}
                    disabledReason="Denna organisation har underorganisationer och kan inte själv ha en moderorganisation"
                  />
                </div>
              )}
            </form.Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Avbryt
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit}>
                    {isSubmitting ? "Sparar..." : "Spara"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {accessImpact && (
        <ParentChangeWarningDialog
          open={warningOpen}
          onOpenChange={(open) => {
            setWarningOpen(open);
            if (!open) {
              setPendingValues(null);
              setAccessImpact(null);
            }
          }}
          impact={accessImpact}
          onConfirm={handleConfirmParentChange}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}

function OrganisationerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-full max-w-sm" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {["w-24", "w-28", "w-32", "w-44", "w-20"].map((w, i) => (
                <TableHead key={i}>
                  <Skeleton className={`h-4 ${w}`} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
