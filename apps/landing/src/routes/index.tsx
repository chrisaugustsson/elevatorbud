import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <h1>Hisskompetens</h1>
      <p>Professionell hisshantering och besiktning.</p>
    </div>
  );
}
