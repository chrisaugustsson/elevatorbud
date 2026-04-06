/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles/app.css?url";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hisskompetens — Komplett hisshantering för fastighetsägare" },
      {
        name: "description",
        content:
          "Hisskompetens erbjuder professionell hisshantering, besiktning och modernisering av hissar i Sverige.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <SiteHeader />
        <main>
          <Outlet />
        </main>
        <SiteFooter />
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased bg-white text-slate-900">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navLinks = [
  { to: "/" as const, label: "Startsida" },
  { to: "/tjanster" as const, label: "Tjänster" },
  { to: "/om-oss" as const, label: "Om oss" },
  { to: "/kontakt" as const, label: "Kontakt" },
];

function SiteHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg shadow-sm">
            H
          </div>
          <span
            className={`text-lg font-bold tracking-tight transition-colors duration-300 ${
              scrolled ? "text-slate-900" : "text-white"
            }`}
          >
            Hisskompetens
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                scrolled
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 [&.active]:text-blue-600 [&.active]:bg-blue-50"
                  : "text-white/70 hover:text-white hover:bg-white/10 [&.active]:text-white [&.active]:bg-white/15"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://admin.hisskompetens.se"
            className="ml-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 cursor-pointer"
          >
            Logga in
          </a>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:hidden flex h-10 w-10 items-center justify-center rounded-md transition-colors cursor-pointer ${
            scrolled
              ? "text-slate-600 hover:bg-slate-100"
              : "text-white hover:bg-white/10"
          }`}
          aria-label="Meny"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 [&.active]:text-blue-600 [&.active]:bg-blue-50"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://admin.hisskompetens.se"
              className="block rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white text-center hover:bg-blue-500 mt-2 cursor-pointer"
            >
              Logga in
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                H
              </div>
              <span className="font-bold text-slate-900">Hisskompetens</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Professionell hisshantering, besiktning och modernisering av
              hissar i hela Sverige.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Sidor
            </h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Tjänster
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li>Hissbesiktning</li>
              <li>Modernisering</li>
              <li>Underhållsplanering</li>
              <li>Registerhantering</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Kontakt
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li>info@hisskompetens.se</li>
              <li>08-123 456 78</li>
              <li>Stockholm, Sverige</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Hisskompetens. Alla rättigheter
            förbehållna.
          </p>
          <div className="flex gap-6">
            <Link
              to="/integritetspolicy"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Integritetspolicy
            </Link>
            <Link
              to="/villkor"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Villkor
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
