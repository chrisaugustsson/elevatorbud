import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/anvandare")({
  component: Anvandare,
});

function Anvandare() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Användare</h1>
      <p className="mt-2 text-muted-foreground">
        Användarhantering kommer i en framtida version.
      </p>
    </div>
  );
}
