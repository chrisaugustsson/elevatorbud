import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@elevatorbud/ui/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { Plus, ArrowUpDown, Building2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/organisationer")({
  component: Organisationer,
});

type Organisation = {
  _id: string;
  name: string;
  organization_number?: string;
  contact_person?: string;
  phone_number?: string;
  email?: string;
  elevatorCount: number;
};

const columnHelper = createColumnHelper<Organisation>();

const columns = [
  columnHelper.accessor("name", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Namn
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: (info) => (
      <span className="font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("organization_number", {
    header: "Org.nummer",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("contact_person", {
    header: "Kontaktperson",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("email", {
    header: "E-post",
    cell: (info) => info.getValue() || "—",
  }),
  columnHelper.accessor("elevatorCount", {
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Antal hissar
        <ArrowUpDown className="ml-1 size-3" />
      </Button>
    ),
    cell: (info) => info.getValue(),
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
  const orgs = useQuery(api.organizations.list);
  const createOrg = useMutation(api.organizations.create);
  const updateOrg = useMutation(api.organizations.update);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Organisation | null>(null);

  const table = useReactTable({
    data: (orgs as Organisation[] | undefined) ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (orgs === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laddar organisationer...</p>
      </div>
    );
  }

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setEditOrg(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="size-8" />
                    <p>Inga organisationer hittades.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (values) => {
          await createOrg(values);
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
          await updateOrg({ id: editOrg._id as never, ...values });
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
    organization_number?: string;
    contact_person?: string;
    phone_number?: string;
    email?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      organization_number: "",
      contact_person: "",
      phone_number: "",
      email: "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        organization_number: value.organization_number || undefined,
        contact_person: value.contact_person || undefined,
        phone_number: value.phone_number || undefined,
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
            name="organization_number"
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

          <form.Field name="contact_person">
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

          <form.Field name="phone_number">
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
    organization_number?: string;
    contact_person?: string;
    phone_number?: string;
    email?: string;
  }) => Promise<void>;
}) {
  if (!org) return null;

  return (
    <EditOrgDialogInner
      key={org._id}
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
    organization_number?: string;
    contact_person?: string;
    phone_number?: string;
    email?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: org.name,
      organization_number: org.organization_number ?? "",
      contact_person: org.contact_person ?? "",
      phone_number: org.phone_number ?? "",
      email: org.email ?? "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        organization_number: value.organization_number || undefined,
        contact_person: value.contact_person || undefined,
        phone_number: value.phone_number || undefined,
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
            search={{ org: org._id, create: true }}
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
            name="organization_number"
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

          <form.Field name="contact_person">
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

          <form.Field name="phone_number">
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
