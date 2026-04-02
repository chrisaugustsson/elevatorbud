import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/register")({
  component: Register,
});

function Register() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Register</h1>
      <p className="mt-2 text-muted-foreground">
        Hissregistret kommer i en framtida version.
      </p>
    </div>
  );
}
