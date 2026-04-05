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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <img
        src="/hisskompetens-logo.png"
        alt="Hisskompetens"
        className="mb-8 h-20"
      />
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
