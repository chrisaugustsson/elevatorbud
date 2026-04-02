import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <h1>Hisskompetens Admin</h1>
      <p>Välkommen till adminportalen.</p>
    </div>
  );
}
