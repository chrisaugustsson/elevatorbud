import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/webbplats")({
  component: Webbplats,
});

function Webbplats() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Webbplats</h1>
      <p className="text-muted-foreground mt-2">CMS-redigering kommer här.</p>
    </div>
  );
}
