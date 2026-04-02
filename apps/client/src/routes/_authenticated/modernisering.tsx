import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/modernisering")({
  component: ModerniseringPage,
});

function ModerniseringPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Modernisering</h1>
      <p className="mt-2 text-muted-foreground">
        Planering och budget för modernisering.
      </p>
    </div>
  );
}
