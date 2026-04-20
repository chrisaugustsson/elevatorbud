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
import { ThemeProvider, themeInitScript } from "@elevatorbud/ui/hooks/use-theme";
import type { RouterContext } from "../router";
import appCss from "../styles/app.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hisskompetens Admin" },
      // Security hardening that works via meta. Headers that cannot live in
      // a meta tag (CSP frame-ancestors, HSTS, X-Frame-Options,
      // X-Content-Type-Options) are configured at the Cloudflare zone level
      // via Transform Rules.
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  errorComponent: RootError,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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

function RootError({ error }: { error: Error }) {
  // Log the raw error for operators (server logs + browser devtools) but
  // never surface `error.message` to end users — it can leak Drizzle SQL,
  // PG constraint names, or internal paths.
  console.error("[RootError]", error);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-red-800">
          Något gick fel
        </h1>
        <p className="mb-4 text-sm text-red-600">
          Ett oväntat fel inträffade. Försök igen om en stund.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          Ladda om sidan
        </button>
      </div>
    </div>
  );
}
