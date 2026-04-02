import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">
        Hisskompetens Admin
      </h1>
      <p className="mt-2 text-muted-foreground">
        Välkommen till adminportalen.
      </p>
    </div>
  );
}
