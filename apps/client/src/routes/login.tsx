import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth, SignIn } from "@elevatorbud/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Hisskompetens
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Logga in för att komma åt kundportalen
        </p>
      </div>
      <SignIn
        routing="hash"
        forceRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
        }}
      />
    </div>
  );
}
