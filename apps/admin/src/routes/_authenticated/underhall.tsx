import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/underhall")({
  component: Underhall,
});

function Underhall() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Underhåll</h1>
      <p className="mt-2 text-muted-foreground">
        Underhållsöversikt kommer i en framtida version.
      </p>
    </div>
  );
}
