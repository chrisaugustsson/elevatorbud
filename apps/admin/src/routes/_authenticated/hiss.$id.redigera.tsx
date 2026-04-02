import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/hiss/$id/redigera")({
  component: RedigeraHiss,
});

function RedigeraHiss() {
  const { id } = Route.useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Redigera hiss</h1>
      <p className="mt-2 text-muted-foreground">
        Redigeringsformulär kommer i en framtida version. Hiss-ID: {id}
      </p>
    </div>
  );
}
