import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/referensdata")({
  component: Referensdata,
});

function Referensdata() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Referensdata</h1>
      <p className="mt-2 text-muted-foreground">
        Referensdatahantering kommer i en framtida version.
      </p>
    </div>
  );
}
