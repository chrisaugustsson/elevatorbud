import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsersOptions, createUser as createUserFn, updateUser as updateUserFn, deactivateUser as deactivateUserFn, activateUser as activateUserFn, deleteUser as deleteUserFn } from "~/server/user";
import { listOrganizationsOptions } from "~/server/organization";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@elevatorbud/ui/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  Pencil,
  MoreHorizontal,
  UserX,
  UserCheck,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { useUser } from "@elevatorbud/auth";

export const Route = createFileRoute("/_authenticated/admin/anvandare")({
  validateSearch: (search: Record<string, unknown>) => ({
    org: (search.org as string) || undefined,
    create: search.create === "true" || search.create === true,
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(listOrganizationsOptions());
  },
  component: Anvandare,
  pendingComponent: AnvandareSkeleton,
});

type Anvandare = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  active: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  userOrganizations: Array<{
    userId: string;
    organizationId: string;
    createdAt: Date;
    organization: { id: string; name: string; organizationNumber: string | null; parentId: string | null; createdAt: Date };
  }>;
};

type Organisation = {
  id: string;
  name: string;
};

function Anvandare() {
  const { org: orgFromSearch, create: createFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orgs } = useSuspenseQuery(listOrganizationsOptions());

  const [rollFilter, setRollFilter] = useState<string>("alla");
  const [orgFilter, setOrgFilter] = useState<string>(orgFromSearch ?? "alla");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Anvandare | null>(null);

  // Debounce search text — clear immediately, otherwise wait 300ms
  useEffect(() => {
    if (!searchText) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

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

  const userListArgs = {
    role:
      rollFilter === "alla"
        ? undefined
        : (rollFilter as "admin" | "customer"),
    organizationId:
      orgFilter === "alla" ? undefined : orgFilter,
    search: debouncedSearch || undefined,
  };
  const { data: users } = useSuspenseQuery(listUsersOptions(userListArgs));

  const { user: currentClerkUser } = useUser();
  const createUser = useMutation({
    mutationFn: (input: { name: string; email: string; role: "admin" | "customer"; organizationId?: string }) =>
      createUserFn({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user"] }); },
  });
  const updateUser = useMutation({
    mutationFn: (input: { id: string; name?: string; email?: string; role?: "admin" | "customer"; organizationId?: string }) =>
      updateUserFn({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user"] }); },
  });
  const deactivateUser = useMutation({
    mutationFn: (input: { id: string }) => deactivateUserFn({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user"] }); },
  });
  const activateUser = useMutation({
    mutationFn: (input: { id: string }) => activateUserFn({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user"] }); },
  });
  const removeUser = useMutation({
    mutationFn: (input: { id: string }) => deleteUserFn({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user"] }); },
  });
  const [deactivatingUser, setDeactivatingUser] = useState<Anvandare | null>(
    null,
  );
  const [deletingUser, setDeletingUser] = useState<Anvandare | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const orgMap = new Map<string, string>();
  for (const org of orgs) {
    orgMap.set(org.id, org.name);
  }

  const columnHelper = createColumnHelper<Anvandare>();

  const columns = [
    columnHelper.accessor("name", {
      size: 180,
      header: ({ column }) => <DataGridColumnHeader title="Namn" column={column} />,
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("email", {
      size: 220,
      header: ({ column }) => <DataGridColumnHeader title="E-post" column={column} />,
      enableSorting: false,
    }),
    columnHelper.accessor("role", {
      size: 90,
      header: ({ column }) => <DataGridColumnHeader title="Roll" column={column} />,
      enableSorting: false,
      cell: (info) => (
        <Badge variant={info.getValue() === "admin" ? "default" : "secondary"}>
          {info.getValue() === "admin" ? "Admin" : "Kund"}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "organization",
      size: 180,
      header: ({ column }) => <DataGridColumnHeader title="Organisation" column={column} />,
      enableSorting: false,
      cell: ({ row }) => {
        const orgs = row.original.userOrganizations;
        if (orgs.length === 0) return "—";
        return orgs.map((uo) => uo.organization.name).join(", ");
      },
    }),
    columnHelper.accessor("active", {
      size: 100,
      header: ({ column }) => <DataGridColumnHeader title="Status" column={column} />,
      enableSorting: false,
      cell: (info) => (
        <Badge variant={info.getValue() ? "outline" : "destructive"}>
          {info.getValue() ? "Aktiv" : "Inaktiv"}
        </Badge>
      ),
    }),
    columnHelper.accessor("lastLogin", {
      size: 160,
      header: ({ column }) => <DataGridColumnHeader title="Senaste inloggning" column={column} />,
      enableSorting: false,
      cell: (info) => {
        const val = info.getValue();
        if (!val) return "—";
        return (
          <span className="tabular-nums">
            {new Date(val).toLocaleDateString("sv-SE")}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      size: 90,
      enableResizing: false,
      header: "",
      cell: (info) => {
        const row = info.row.original;
        const isSelf =
          currentClerkUser?.id === row.clerkUserId;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditingUser(row)}
              title="Redigera användare"
            >
              <Pencil className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Åtgärder</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setDeactivatingUser(row)}
                >
                  {row.active ? (
                    <>
                      <UserX className="mr-2 size-4" />
                      Inaktivera
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 size-4" />
                      Aktivera
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={isSelf}
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeletingUser(row)}
                >
                  <Trash2 className="mr-2 size-4" />
                  {isSelf ? "Kan inte ta bort dig själv" : "Ta bort"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ];

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: users,
    columns,
    columnResizeMode: "onChange",
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {table.getRowModel().rows.length} användare
        </p>
      </div>

      <DataGrid
        table={table}
        recordCount={users.length}
        tableLayout={{ width: "fixed", columnsResizable: true }}
      >
        <DataGridContainer>
          <div className="overflow-x-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
      </DataGrid>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgs={orgs}
        defaultOrgId={orgFromSearch}
        onSubmit={async (values) => {
          await createUser.mutateAsync(values);
          setCreateOpen(false);
        }}
      />

      <EditUserDialog
        user={editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
        orgs={orgs}
        onSubmit={async (values) => {
          await updateUser.mutateAsync(values);
          setEditingUser(null);
        }}
      />

      {/* Deactivate / Activate confirmation dialog */}
      <Dialog
        open={!!deactivatingUser}
        onOpenChange={(open) => {
          if (!open) setDeactivatingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deactivatingUser?.active
                ? "Inaktivera användare"
                : "Aktivera användare"}
            </DialogTitle>
            <DialogDescription>
              {deactivatingUser?.active
                ? `Är du säker på att du vill inaktivera ${deactivatingUser?.name}? Användaren kommer inte längre kunna logga in.`
                : `Är du säker på att du vill aktivera ${deactivatingUser?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivatingUser(null)}
              disabled={actionLoading}
            >
              Avbryt
            </Button>
            <Button
              variant={deactivatingUser?.active ? "destructive" : "default"}
              disabled={actionLoading}
              onClick={async () => {
                if (!deactivatingUser) return;
                setActionLoading(true);
                try {
                  if (deactivatingUser.active) {
                    await deactivateUser.mutateAsync({
                      id: deactivatingUser.id,
                    });
                  } else {
                    await activateUser.mutateAsync({
                      id: deactivatingUser.id,
                    });
                  }
                } finally {
                  setActionLoading(false);
                  setDeactivatingUser(null);
                }
              }}
            >
              {actionLoading
                ? "Sparar..."
                : deactivatingUser?.active
                  ? "Inaktivera"
                  : "Aktivera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ta bort användare</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill ta bort {deletingUser?.name}? Denna
              åtgärd kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingUser(null)}
              disabled={actionLoading}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={async () => {
                if (!deletingUser) return;
                setActionLoading(true);
                try {
                  await removeUser.mutateAsync({ id: deletingUser.id });
                } finally {
                  setActionLoading(false);
                  setDeletingUser(null);
                }
              }}
            >
              {actionLoading ? "Tar bort..." : "Ta bort"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    organizationId?: string;
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
    organizationId?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      role: defaultOrgId ? "customer" : ("admin" as "admin" | "customer"),
      organizationId: defaultOrgId ?? "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        name: value.name,
        email: value.email,
        role: value.role,
        organizationId: value.organizationId || undefined,
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
                  onValueChange={(val) => {
                    field.handleChange(val as "admin" | "customer");
                    if (val === "admin") {
                      form.setFieldValue("organizationId", "");
                    }
                  }}
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
                  name="organizationId"
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
                            <SelectItem key={org.id} value={org.id}>
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

function EditUserDialog({
  user,
  onOpenChange,
  orgs,
  onSubmit,
}: {
  user: Anvandare | null;
  onOpenChange: (open: boolean) => void;
  orgs: Organisation[];
  onSubmit: (values: {
    id: string;
    name?: string;
    email?: string;
    role?: "admin" | "customer";
    organizationId?: string;
  }) => Promise<void>;
}) {
  if (!user) return null;

  return (
    <EditUserDialogInner
      key={user.id}
      user={user}
      orgs={orgs}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

function EditUserDialogInner({
  user,
  orgs,
  onOpenChange,
  onSubmit,
}: {
  user: Anvandare;
  orgs: Organisation[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    id: string;
    name?: string;
    email?: string;
    role?: "admin" | "customer";
    organizationId?: string;
  }) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "customer",
      organizationId: user.userOrganizations[0]?.organizationId ?? "",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        id: user.id,
        name: value.name,
        email: value.email,
        role: value.role,
        organizationId: value.organizationId || undefined,
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
          <DialogTitle>Redigera användare</DialogTitle>
          <DialogDescription>
            Ändra uppgifter för {user.name}.
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
                  onValueChange={(val) => {
                    field.handleChange(val as "admin" | "customer");
                    if (val === "admin") {
                      form.setFieldValue("organizationId", "");
                    }
                  }}
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
                  name="organizationId"
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
                            <SelectItem key={org.id} value={org.id}>
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

function AnvandareSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-[140px]" />
        <Skeleton className="h-9 w-[200px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {["w-32", "w-48", "w-16", "w-32", "w-16", "w-28", "w-16"].map(
                (w, i) => (
                  <TableHead key={i}>
                    <Skeleton className={`h-4 ${w}`} />
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
