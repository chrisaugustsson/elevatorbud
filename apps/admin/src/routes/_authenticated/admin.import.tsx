import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: ImportPage,
});

function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Import</h1>
      <p className="mt-2 text-muted-foreground">
        Excel-import kommer i en framtida version.
      </p>
    </div>
  );
}
