import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@elevatorbud/auth/server";
import { SignIn, useAuth } from "@elevatorbud/auth";

const loginGuard = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth();

  if (isAuthenticated) {
    throw redirect({ to: "/" });
  }
});

export const Route = createFileRoute("/login")({
  beforeLoad: () => loginGuard(),
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
