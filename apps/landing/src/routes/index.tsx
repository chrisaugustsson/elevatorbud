import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Building2,
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  ArrowRight,
  Phone,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Startsida,
});

const FALLBACK_SECTIONS = {
  hero: {
    title: "Komplett hisshantering för fastighetsägare",
    subtitle:
      "Vi hjälper dig att hålla koll på alla dina hissar — från besiktning och underhåll till modernisering och budgetplanering.",
    cta: { text: "Kontakta oss", href: "/kontakt" },
  },
  features: [
    {
      icon: "ClipboardCheck",
      title: "Hissregister",
      description:
        "Digitalt register med alla tekniska specifikationer, besiktningshistorik och underhållsdata för varje hiss.",
    },
    {
      icon: "Wrench",
      title: "Moderniseringsplanering",
      description:
        "Tidslinje och budgetöversikt för kommande moderniseringar med prioriterade åtgärdslistor.",
    },
    {
      icon: "BarChart3",
      title: "Dashboard & analys",
      description:
        "Översiktlig dashboard med nyckeltal, statistik och visualiseringar för hela ditt hissbestånd.",
    },
    {
      icon: "Shield",
      title: "Besiktningskalender",
      description:
        "Automatisk övervakning av besiktningsmånader och skötselföretag med månatliga översikter.",
    },
    {
      icon: "Building2",
      title: "Organisationshantering",
      description:
        "Hantera flera fastighetsbolag med separata vyer och data — allt från en central plattform.",
    },
    {
      icon: "Phone",
      title: "Nödtelefonstatus",
      description:
        "Full koll på nödtelefoner per distrikt med uppgraderingsbehov och kostnadsöversikt.",
    },
  ],
  stats: [
    { value: "1 000+", label: "Hissar i systemet" },
    { value: "50+", label: "Organisationer" },
    { value: "99.9%", label: "Drifttid" },
    { value: "24/7", label: "Support" },
  ],
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  Building2,
  Phone,
};

function Startsida() {
  const page = useQuery(api.cms.getPage, { slug: "startsida" });

  const heroSection = page?.sections?.find((s) => s.type === "hero");
  const featuresSection = page?.sections?.find((s) => s.type === "features");
  const statsSection = page?.sections?.find((s) => s.type === "stats");
  const ctaSection = page?.sections?.find((s) => s.type === "cta");

  const hero = {
    title: heroSection?.title || FALLBACK_SECTIONS.hero.title,
    subtitle: heroSection?.subtitle || FALLBACK_SECTIONS.hero.subtitle,
    cta: heroSection?.cta || FALLBACK_SECTIONS.hero.cta,
  };

  const features =
    featuresSection?.items && featuresSection.items.length > 0
      ? featuresSection.items
      : FALLBACK_SECTIONS.features;

  const stats =
    statsSection?.items && statsSection.items.length > 0
      ? statsSection.items.map((item) => ({
          value: item.title || "",
          label: item.description || "",
        }))
      : FALLBACK_SECTIONS.stats;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtNHY2aDR2LTR6TTAgMzRoMnYtNEgwdjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-blue-100 sm:text-xl">
              {hero.subtitle}
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/kontakt"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
              >
                {hero.cta.text}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/tjanster"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 text-base font-semibold text-white transition-all hover:border-white/60 hover:bg-white/10"
              >
                Utforska tjänster
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-12 z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:grid-cols-4 sm:p-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-extrabold text-blue-600 sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {featuresSection?.title || "Allt du behöver för hisshantering"}
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            {featuresSection?.subtitle ||
              "En komplett plattform för att hantera, övervaka och planera underhåll av ditt hissbestånd."}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const IconComponent =
              iconMap[(feature as { icon?: string }).icon || ""] || Building2;
            return (
              <div
                key={i}
                className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {ctaSection?.title || "Redo att digitalisera din hisshantering?"}
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            {ctaSection?.subtitle ||
              "Kontakta oss idag för en demonstration av systemet. Vi hjälper dig att komma igång."}
          </p>
          <div className="mt-10">
            <Link
              to="/kontakt"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
            >
              {ctaSection?.cta?.text || "Boka en demo"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
