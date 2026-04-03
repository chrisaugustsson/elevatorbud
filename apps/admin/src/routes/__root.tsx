/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import * as React from "react";
import {
  ClerkProvider,
  ConvexProviderWithClerk,
  ConvexReactClient,
  useAuth,
} from "@elevatorbud/auth";
import { Toaster } from "@elevatorbud/ui/components/ui/sonner";
import { ThemeProvider } from "@elevatorbud/ui/hooks/use-theme";
import appCss from "../styles/app.css?url";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convex = new ConvexReactClient(convexUrl);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hisskompetens Admin" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <ClerkProvider>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
              {children}
              <Toaster />
            </ConvexProviderWithClerk>
          </ClerkProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
