import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listOrganizationsOptions, createOrganization, updateOrganization } from "~/server/organization";
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
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Building2, UserPlus } from "lucide-react";
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
  contactPerson: string | null;
  phoneNumber: string | null;
  email: string | null;
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
  columnHelper.accessor("contactPerson", {
    size: 180,
    header: ({ column }) => (
      <DataGridColumnHeader title="Kontaktperson" column={column} />
    ),
    enableSorting: false,
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("email", {
    size: 240,
    header: ({ column }) => (
      <DataGridColumnHeader title="E-post" column={column} />
    ),
    enableSorting: false,
    cell: (info) => info.getValue() || "—",
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
    mutationFn: (input: { name: string; organizationNumber?: string; contactPerson?: string; phoneNumber?: string; email?: string }) =>
      createOrganization({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["organization"] }); },
  });
  const updateOrg = useMutation({
    mutationFn: (input: { id: string; name?: string; organizationNumber?: string; contactPerson?: string; phoneNumber?: string; email?: string }) =>
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
        onSubmit={async (values) => {
          await createOrg.mutateAsync(values);
          setCreateOpen(false);
        }}
      />

      <EditOrgDialog
        org={editOrg}
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

function CreateOrgDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    organizationNumber?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      organizationNumber: "",
      contactPerson: "",
      phoneNumber: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        organizationNumber: value.organizationNumber || undefined,
        contactPerson: value.contactPerson || undefined,
        phoneNumber: value.phoneNumber || undefined,
        email: value.email || undefined,
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

          <form.Field name="contactPerson">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Kontaktperson</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Förnamn Efternamn"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="phoneNumber">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Telefonnummer</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="070-123 45 67"
                />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>E-post</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="kontakt@foretag.se"
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
  onOpenChange,
  onSubmit,
}: {
  org: Organisation | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name?: string;
    organizationNumber?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
  }) => Promise<void>;
}) {
  if (!org) return null;

  return (
    <EditOrgDialogInner
      key={org.id}
      org={org}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

function EditOrgDialogInner({
  org,
  onOpenChange,
  onSubmit,
}: {
  org: Organisation;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name?: string;
    organizationNumber?: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: org.name,
      organizationNumber: org.organizationNumber ?? "",
      contactPerson: org.contactPerson ?? "",
      phoneNumber: org.phoneNumber ?? "",
      email: org.email ?? "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        organizationNumber: value.organizationNumber || undefined,
        contactPerson: value.contactPerson || undefined,
        phoneNumber: value.phoneNumber || undefined,
        email: value.email || undefined,
      });
    },
  });

  return (
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

          <form.Field name="contactPerson">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Kontaktperson</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="phoneNumber">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Telefonnummer</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>E-post</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
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
