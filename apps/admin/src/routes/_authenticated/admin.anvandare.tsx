import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useAction } from "convex/react";
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
import { Badge } from "@elevatorbud/ui/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Plus, ArrowUpDown, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/anvandare")({
  validateSearch: (search: Record<string, unknown>) => ({
    org: (search.org as string) || undefined,
    create: search.create === "true" || search.create === true,
  }),
  component: Anvandare,
});

type Anvandare = {
  _id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  organization_id?: string;
  active: boolean;
  created_at: string;
  last_login?: string;
};

type Organisation = {
  _id: string;
  name: string;
};

function Anvandare() {
  const { org: orgFromSearch, create: createFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const orgs = useQuery(api.organizations.list);

  const [rollFilter, setRollFilter] = useState<string>("alla");
  const [orgFilter, setOrgFilter] = useState<string>(orgFromSearch ?? "alla");
  const [searchText, setSearchText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Auto-open create dialog when coming from org page with ?create=true
  useEffect(() => {
    if (createFromSearch) {
      setCreateOpen(true);
      // Clear the search param so it doesn't re-open on re-renders
      navigate({
        to: "/admin/anvandare",
        search: { org: orgFromSearch, create: false },
        replace: true,
      });
    }
  }, [createFromSearch, navigate, orgFromSearch]);

  const users = useQuery(api.userAdmin.list, {
    role:
      rollFilter === "alla"
        ? undefined
        : (rollFilter as "admin" | "customer"),
    organization_id:
      orgFilter === "alla" ? undefined : (orgFilter as never),
    search: searchText || undefined,
  });

  const createUser = useAction(api.userAdmin.create);
  const updateUser = useAction(api.userAdmin.update);

  const orgMap = new Map<string, string>();
  if (orgs) {
    for (const org of orgs as Organisation[]) {
      orgMap.set(org._id, org.name);
    }
  }

  const columnHelper = createColumnHelper<Anvandare>();

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
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("email", {
      header: "E-post",
    }),
    columnHelper.accessor("role", {
      header: "Roll",
      cell: (info) => (
        <Badge variant={info.getValue() === "admin" ? "default" : "secondary"}>
          {info.getValue() === "admin" ? "Admin" : "Kund"}
        </Badge>
      ),
    }),
    columnHelper.accessor("organization_id", {
      header: "Organisation",
      cell: (info) => {
        const orgId = info.getValue();
        return orgId ? orgMap.get(orgId) ?? "—" : "—";
      },
    }),
    columnHelper.accessor("active", {
      header: "Status",
      cell: (info) => (
        <Badge variant={info.getValue() ? "outline" : "destructive"}>
          {info.getValue() ? "Aktiv" : "Inaktiv"}
        </Badge>
      ),
    }),
    columnHelper.accessor("last_login", {
      header: "Senaste inloggning",
      cell: (info) => {
        const val = info.getValue();
        if (!val) return "—";
        return new Date(val).toLocaleDateString("sv-SE");
      },
    }),
  ];

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: (users as Anvandare[] | undefined) ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (users === undefined || orgs === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laddar användare...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Användare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hantera användarkonton och deras behörigheter.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Ny användare
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Sök namn eller e-post..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-sm"
        />
        <Select value={rollFilter} onValueChange={setRollFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Roll" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alla">Alla roller</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="customer">Kund</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Organisation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alla">Alla organisationer</SelectItem>
            {(orgs as Organisation[]).map((org) => (
              <SelectItem key={org._id} value={org._id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} användare
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
                <TableRow key={row.id}>
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
                    <Users className="size-8" />
                    <p>Inga användare hittades.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgs={orgs as Organisation[]}
        defaultOrgId={orgFromSearch}
        onSubmit={async (values) => {
          await createUser(values);
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  orgs,
  defaultOrgId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgs: Organisation[];
  defaultOrgId?: string;
  onSubmit: (values: {
    name: string;
    email: string;
    role: "admin" | "customer";
    organization_id?: string;
  }) => Promise<void>;
}) {
  if (!open) return null;

  return (
    <CreateUserDialogInner
      key={defaultOrgId ?? "new"}
      orgs={orgs}
      defaultOrgId={defaultOrgId}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

function CreateUserDialogInner({
  orgs,
  defaultOrgId,
  onOpenChange,
  onSubmit,
}: {
  orgs: Organisation[];
  defaultOrgId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    email: string;
    role: "admin" | "customer";
    organization_id?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      role: defaultOrgId ? "customer" : ("admin" as "admin" | "customer"),
      organization_id: defaultOrgId ?? "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        email: value.email,
        role: value.role,
        organization_id: value.organization_id
          ? (value.organization_id as never)
          : undefined,
      });
      form.reset();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ny användare</DialogTitle>
          <DialogDescription>
            Skapa en ny användare. En inbjudan skickas via e-post.
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
                  placeholder="Förnamn Efternamn"
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
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return "E-post krävs";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                  return "Ogiltig e-postadress";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  E-post <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="namn@foretag.se"
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

          <form.Field name="role">
            {(field) => (
              <div className="space-y-2">
                <Label>
                  Roll <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) =>
                    field.handleChange(val as "admin" | "customer")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="customer">Kund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.role}>
            {(role) =>
              role === "customer" ? (
                <form.Field
                  name="organization_id"
                  validators={{
                    onChange: ({ value }) => {
                      const currentRole = form.getFieldValue("role");
                      if (currentRole === "customer" && !value)
                        return "Organisation krävs för kundanvändare";
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label>
                        Organisation{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={field.state.value}
                        onValueChange={field.handleChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Välj organisation" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgs.map((org) => (
                            <SelectItem key={org._id} value={org._id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.state.meta.isTouched &&
                        field.state.meta.errors.map((error, i) => (
                          <p key={i} className="text-sm text-destructive">
                            {error}
                          </p>
                        ))}
                    </div>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>

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
                  {isSubmitting ? "Skapar..." : "Skapa"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
