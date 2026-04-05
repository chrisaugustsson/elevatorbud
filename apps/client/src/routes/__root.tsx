/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import * as React from "react";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@elevatorbud/auth/server";
import {
  ClerkProvider,
  ConvexProviderWithClerk,
  useAuth,
  svSE,
} from "@elevatorbud/auth";
import { Toaster } from "@elevatorbud/ui/components/ui/sonner";
import { ThemeProvider } from "@elevatorbud/ui/hooks/use-theme";
import type { RouterContext } from "../router";
import appCss from "../styles/app.css?url";

const getConvexToken = createServerFn().handler(async () => {
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  return token;
});

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hisskompetens Kundportal" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async ({ context }) => {
    try {
      const token = await getConvexToken();
      if (token) {
        context.convexQueryClient.serverHttpClient?.setAuth(token);
      }
    } catch {
      // Token fetch failed — SSR queries will be unauthenticated
      // Client-side auth via ClerkProvider will still work
    }
  },
  shellComponent: RootDocument,
  component: RootLayout,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const { convexClient } = Route.useRouteContext();

  return (
    <ClerkProvider localization={svSE}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <Outlet />
        <Toaster />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
