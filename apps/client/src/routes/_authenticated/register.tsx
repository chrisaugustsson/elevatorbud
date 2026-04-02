import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Register</h1>
      <p className="mt-2 text-muted-foreground">Hissregister.</p>
    </div>
  );
}
