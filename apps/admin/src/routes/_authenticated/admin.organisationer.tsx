import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/organisationer")({
  component: Organisationer,
});

function Organisationer() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Organisationer</h1>
      <p className="mt-2 text-muted-foreground">
        Organisationshantering kommer i en framtida version.
      </p>
    </div>
  );
}
