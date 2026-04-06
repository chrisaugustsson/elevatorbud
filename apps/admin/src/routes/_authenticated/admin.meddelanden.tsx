import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listContactsOptions, updateContactStatus } from "~/server/contact";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@elevatorbud/ui/components/ui/dialog";
import {
  DataGrid,
  DataGridContainer,
  DataGridTable,
  DataGridColumnHeader,
} from "@elevatorbud/ui/components/ui/data-grid-table";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import { Mail, Eye, Archive, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/meddelanden")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(listContactsOptions());
  },
  component: Meddelanden,
  pendingComponent: MeddelandenSkeleton,
});

type Submission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: Date;
};

function Meddelanden() {
  const [statusFilter, setStatusFilter] = useState<string>("alla");
  const [selected, setSelected] = useState<Submission | null>(null);
  const queryClient = useQueryClient();

  const queryArgs =
    statusFilter === "alla"
      ? undefined
      : { status: statusFilter as "new" | "read" | "archived" };
  const { data: submissions } = useSuspenseQuery(listContactsOptions(queryArgs));

  const updateStatusMutation = useMutation({
    mutationFn: (input: { id: string; status: "new" | "read" | "archived" }) =>
      updateContactStatus({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact"] });
    },
  });

  const columnHelper = createColumnHelper<Submission>();

  const columns = [
    columnHelper.accessor("status", {
      header: ({ column }) => (
        <DataGridColumnHeader title="Status" column={column} />
      ),
      cell: (info) => {
        const status = info.getValue();
        return (
          <Badge
            variant={
              status === "new"
                ? "default"
                : status === "read"
                  ? "secondary"
                  : "outline"
            }
          >
            {status === "new" ? "Ny" : status === "read" ? "Läst" : "Arkiverad"}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <DataGridColumnHeader title="Namn" column={column} />
      ),
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("email", {
      header: ({ column }) => (
        <DataGridColumnHeader title="E-post" column={column} />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor("phone", {
      header: ({ column }) => (
        <DataGridColumnHeader title="Telefon" column={column} />
      ),
      enableSorting: false,
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("message", {
      header: ({ column }) => (
        <DataGridColumnHeader title="Meddelande" column={column} />
      ),
      enableSorting: false,
      cell: (info) => (
        <span className="line-clamp-1 max-w-xs">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: ({ column }) => (
        <DataGridColumnHeader title="Datum" column={column} />
      ),
      cell: (info) =>
        new Date(info.getValue()).toLocaleDateString("sv-SE", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                setSelected(row);
                if (row.status === "new") {
                  updateStatusMutation.mutate({ id: row.id, status: "read" });
                }
              }}
              title="Visa meddelande"
            >
              <Eye className="size-4" />
            </Button>
          </div>
        );
      },
    }),
  ];

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: submissions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const newCount = submissions.filter((s) => s.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Mail className="size-6" />
          Meddelanden
          {newCount > 0 && (
            <Badge variant="default">{newCount} nya</Badge>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kontaktförfrågningar från webbplatsen.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alla">Alla</SelectItem>
            <SelectItem value="new">Nya</SelectItem>
            <SelectItem value="read">Lästa</SelectItem>
            <SelectItem value="archived">Arkiverade</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {submissions.length} meddelanden
        </p>
      </div>

      <DataGrid table={table} recordCount={submissions.length}>
        <DataGridContainer>
          <div className="overflow-x-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
      </DataGrid>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Meddelande från {selected.name}</DialogTitle>
              <DialogDescription>
                {selected.email}
                {selected.phone ? ` · ${selected.phone}` : ""} ·{" "}
                {new Date(selected.createdAt).toLocaleDateString("sv-SE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 whitespace-pre-wrap text-sm text-foreground">
              {selected.message}
            </div>
            <div className="mt-6 flex items-center gap-2">
              {selected.status !== "archived" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateStatusMutation.mutate({ id: selected.id, status: "archived" });
                    setSelected(null);
                  }}
                >
                  <Archive className="mr-2 size-4" />
                  Arkivera
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateStatusMutation.mutate({ id: selected.id, status: "read" });
                    setSelected(null);
                  }}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Återställ
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${selected.email}`}>
                  <Mail className="mr-2 size-4" />
                  Svara via e-post
                </a>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function MeddelandenSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-[160px]" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {["w-16", "w-28", "w-40", "w-24", "w-48", "w-28", "w-12"].map(
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
                <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
