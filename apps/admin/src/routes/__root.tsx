/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import * as React from "react";
import { ClerkProvider, svSE } from "@elevatorbud/auth";
import { Toaster } from "@elevatorbud/ui/components/ui/sonner";
import { ThemeProvider } from "@elevatorbud/ui/hooks/use-theme";
import type { RouterContext } from "../router";
import appCss from "../styles/app.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hisskompetens Admin" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
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
  return (
    <ClerkProvider localization={svSE}>
      <Outlet />
      <Toaster />
    </ClerkProvider>
  );
}
