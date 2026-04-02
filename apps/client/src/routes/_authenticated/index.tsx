import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

function Home() {
  return <Navigate to="/dashboard" />;
}
