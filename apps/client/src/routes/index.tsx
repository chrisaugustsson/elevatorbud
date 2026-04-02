import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <h1>Hisskompetens Kundportal</h1>
      <p>Välkommen till kundportalen.</p>
    </div>
  );
}
