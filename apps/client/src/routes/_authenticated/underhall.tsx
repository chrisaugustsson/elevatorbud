import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/underhall")({
  component: UnderhallPage,
});

function UnderhallPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Underhåll</h1>
      <p className="mt-2 text-muted-foreground">
        Besiktningsschema och underhållsöversikt.
      </p>
    </div>
  );
}
