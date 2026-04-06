import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPage } from "~/server/api";
import {
  ArrowRight,
  Search,
  FileCheck,
  Banknote,
  HardHat,
  ShieldCheck,
  Leaf,
  Phone,
} from "lucide-react";
import {
  useInView,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useEffect } from "react";

type CmsSection = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  content?: string;
  items?: Array<{ title?: string; description?: string; icon?: string }>;
  cta?: { text: string; href: string };
  imageUrl?: string;
  order: number;
};
import { cn } from "@elevatorbud/ui/lib/utils";
import { InfiniteSlider } from "../components/infinite-slider";

export const Route = createFileRoute("/")({
  component: Startsida,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FALLBACK_SECTIONS = {
  hero: {
    title: "Ta kontroll över ditt hissbestånd",
    subtitle:
      "Hisskompetens är oberoende hisskonsulter som hjälper fastighetsägare att sänka kostnader, säkerställa kvalitet och planera framåt — utan bindningar till tillverkare eller serviceföretag.",
    cta: { text: "Boka kostnadsfri rådgivning", href: "/kontakt" },
  },
  features: [
    {
      icon: "Search",
      title: "Upphandling",
      description:
        "Vi hjälper dig att upphandla service, modernisering och nyinstallation av hissar. Oberoende rådgivning som säkerställer rätt kvalitet till rätt pris.",
    },
    {
      icon: "FileCheck",
      title: "Besiktning & kontroll",
      description:
        "Systematisk genomgång av ditt hissbestånd. Vi identifierar risker, brister och förbättringsmöjligheter — och prioriterar åtgärder.",
    },
    {
      icon: "Banknote",
      title: "Kostnadsanalys",
      description:
        "Detaljerad analys av dina hisskostnader med konkreta förslag på besparingar. Många kunder sparar 20–30% på sina hissavtal.",
    },
    {
      icon: "HardHat",
      title: "Projektledning",
      description:
        "Vi projektleder hissbyten, moderniseringar och nyinstallationer. Från förstudie till slutbesiktning — vi har koll på alla detaljer.",
    },
    {
      icon: "ShieldCheck",
      title: "Underhållsplanering",
      description:
        "Långsiktig underhållsplan som förlänger livslängden på dina hissar och förebygger kostsamma driftstopp.",
    },
    {
      icon: "Leaf",
      title: "Hållbarhet & energi",
      description:
        "Rätt underhåll och modernisering minskar energiförbrukningen. Vi hjälper dig göra hållbara val som också sänker driftkostnader.",
    },
  ],
  stats: [
    { value: "20+", label: "Års erfarenhet" },
    { value: "500+", label: "Genomförda projekt" },
    { value: "2 000+", label: "Hissar under rådgivning" },
    { value: "100%", label: "Oberoende" },
  ],
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  FileCheck,
  Banknote,
  HardHat,
  ShieldCheck,
  Leaf,
  Phone,
};

const CLIENT_LOGOS = [
  "Pandox",
  "Scandic",
  "Familjehotellen",
  "Gothia Towers",
  "Brf Fastigheter",
  "Wallenstam",
  "Riksbyggen",
  "HSB",
];

const TEAM = [
  {
    name: "Robin Plato",
    initials: "RP",
    color: "bg-blue-600",
    role: "Hisskonsult",
    description:
      "Specialist inom upphandling och projektledning av hissinstallationer.",
  },
  {
    name: "Peter Börjesson",
    initials: "PB",
    color: "bg-indigo-600",
    role: "Hisskonsult",
    description:
      "Expert på besiktning, underhållsplanering och kostnadsoptimering.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Kostnadsfritt samtal",
    description:
      "Vi lyssnar på dina behov och ger en första bedömning av ditt hissbestånd helt utan kostnad.",
    color: "bg-blue-500",
  },
  {
    step: "02",
    title: "Inventering & analys",
    description:
      "Vi kartlägger dina hissar, avtal och kostnader. Du får en tydlig bild av nuläget.",
    color: "bg-indigo-500",
  },
  {
    step: "03",
    title: "Rekommendation & plan",
    description:
      "Baserat på analysen får du konkreta förslag — upphandling, modernisering eller underhållsplan.",
    color: "bg-violet-500",
  },
  {
    step: "04",
    title: "Genomförande & uppföljning",
    description:
      "Vi projektleder och kvalitetssäkrar. Efter avslutat projekt följer vi upp för att säkerställa resultat.",
    color: "bg-purple-500",
  },
];

const SERVICE_ICON_COLORS: Record<string, { bg: string; text: string; hoverBg: string }> = {
  Search: { bg: "bg-blue-100", text: "text-blue-600", hoverBg: "group-hover:bg-blue-600" },
  FileCheck: { bg: "bg-emerald-100", text: "text-emerald-600", hoverBg: "group-hover:bg-emerald-600" },
  Banknote: { bg: "bg-amber-100", text: "text-amber-600", hoverBg: "group-hover:bg-amber-600" },
  HardHat: { bg: "bg-orange-100", text: "text-orange-600", hoverBg: "group-hover:bg-orange-600" },
  ShieldCheck: { bg: "bg-indigo-100", text: "text-indigo-600", hoverBg: "group-hover:bg-indigo-600" },
  Leaf: { bg: "bg-green-100", text: "text-green-600", hoverBg: "group-hover:bg-green-600" },
};

// ---------------------------------------------------------------------------
// Animated number counters (framer-motion — progressive enhancement)
// ---------------------------------------------------------------------------
function AnimatedNumber({
  value,
  suffix = "",
  prefix = "",
}: {
  value: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const spring = useSpring(0, {
    damping: 40,
    stiffness: 100,
    mass: 1,
  });

  const display = useTransform(spring, (current: number) =>
    Math.round(current).toLocaleString("sv-SE")
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <span ref={ref}>
      {prefix}
      <MotionSpan value={display} fallback={value.toLocaleString("sv-SE")} />
      {suffix}
    </span>
  );
}

function AnimatedDecimal({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const decimals = (value.toString().split(".")[1] || "").length;

  const spring = useSpring(0, {
    damping: 40,
    stiffness: 100,
    mass: 1,
  });

  const display = useTransform(spring, (current: number) =>
    current.toFixed(decimals).replace(".", ",")
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <span ref={ref}>
      <MotionSpan
        value={display}
        fallback={value.toFixed(decimals).replace(".", ",")}
      />
      {suffix}
    </span>
  );
}

function MotionSpan({
  value,
  fallback,
}: {
  value: MotionValue<string>;
  fallback: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const unsubscribe = value.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [value]);
  return <span ref={ref}>{fallback}</span>;
}

function parseStatValue(raw: string) {
  const value = raw.trim();

  const numMatch = value.match(/^(\d[\d\s]*\d|\d)(\+|%)?$/);
  if (numMatch) {
    const num = parseInt(numMatch[1].replace(/\s/g, ""), 10);
    const suffix = numMatch[2] || "";
    return <AnimatedNumber value={num} suffix={suffix} />;
  }

  const decMatch = value.match(/^(\d+[.,]\d+)(%)?$/);
  if (decMatch) {
    const num = parseFloat(decMatch[1].replace(",", "."));
    const suffix = decMatch[2] || "";
    return <AnimatedDecimal value={num} suffix={suffix} />;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function HeroSection({
  hero,
}: {
  hero: { title: string; subtitle: string; cta: { text: string; href: string } };
}) {
  return (
    <section className="relative bg-slate-950">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.3),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-32 sm:px-6 sm:pb-40 sm:pt-40 lg:pt-48 lg:pb-48">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Oberoende hisskonsulter sedan 2002
          </p>

          {/* Title */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {hero.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-relaxed text-slate-300 sm:text-xl">
            {hero.subtitle}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/kontakt"
              className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/30 cursor-pointer"
            >
              {hero.cta.text}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/tjanster"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-7 py-3.5 text-base font-semibold text-slate-300 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              Våra tjänster
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection({
  stats,
}: {
  stats: Array<{ value: string; label: string }>;
}) {
  return (
    <section className="relative z-10 -mt-16 mx-auto max-w-5xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center bg-white px-4 py-8 sm:py-10"
          >
            <div className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {parseStatValue(stat.value)}
            </div>
            <div className="mt-1.5 text-sm font-medium text-slate-500">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LogoCloudSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="mb-8 text-center text-sm font-medium tracking-wide text-slate-400 uppercase">
        Anlitade av ledande fastighetsägare och hotellkedjor
      </p>
      <div className="overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <InfiniteSlider gap={48} duration={30} durationOnHover={60}>
          {CLIENT_LOGOS.map((name) => (
            <span
              key={name}
              className="select-none whitespace-nowrap text-lg font-semibold text-slate-300 sm:text-xl"
            >
              {name}
            </span>
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
}

function IndependenceSection() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-8 text-center sm:p-10">
        <ShieldCheck className="mx-auto h-8 w-8 text-blue-600" />
        <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
          Helt oberoende — alltid på din sida
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Till skillnad från hissföretag och serviceföretag har vi inga
          bindningar till tillverkare eller leverantörer. Våra rekommendationer
          baseras enbart på vad som är bäst för dig som fastighetsägare —
          trygghet, säkerhet och kvalitet.
        </p>
      </div>
    </section>
  );
}

function ServicesSection({
  featuresSection,
  features,
}: {
  featuresSection: { title?: string; subtitle?: string } | undefined;
  features: Array<{
    icon?: string;
    title?: string;
    description?: string;
  }>;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {featuresSection?.title || "Så hjälper vi dig"}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          {featuresSection?.subtitle ||
            "Från upphandling och besiktning till projektledning och långsiktigt underhåll — vi finns med hela vägen."}
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => {
          const iconKey = (feature as { icon?: string }).icon || "";
          const IconComponent = iconMap[iconKey] || ShieldCheck;
          const colors = SERVICE_ICON_COLORS[iconKey] || SERVICE_ICON_COLORS.Search;
          return (
            <div
              key={i}
              className="group rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"
            >
              {/* Icon area */}
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200",
                  colors.bg,
                  colors.text,
                  colors.hoverBg,
                  "group-hover:text-white"
                )}
              >
                <IconComponent className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
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
  );
}

function HowItWorksSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Så fungerar det
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
            Oavsett om du är en stor fastighetsägare eller en liten
            bostadsrättsförening — processen är densamma.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow duration-200 hover:shadow-md"
            >
              {/* Colored top bar */}
              <div className={cn("h-1.5 w-full rounded-full", item.color)} />
              <p className="mt-5 text-sm font-semibold text-slate-400">
                Steg {item.step}
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Möt våra konsulter
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          Personlig kontakt och lång erfarenhet — du vet alltid vem du pratar
          med.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
        {TEAM.map((person) => (
          <div
            key={person.name}
            className="rounded-2xl border border-slate-200 bg-white p-7 transition-shadow duration-200 hover:shadow-md"
          >
            {/* Initials avatar */}
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white",
                person.color
              )}
            >
              {person.initials}
            </div>
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              {person.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-blue-600">
              {person.role}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {person.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaSection({
  ctaSection,
}: {
  ctaSection:
    | { title?: string; subtitle?: string; cta?: { text?: string } }
    | undefined;
}) {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,rgba(59,130,246,0.15),transparent)]" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {ctaSection?.title || "Bli av med onödiga hisskostnader"}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-300">
          {ctaSection?.subtitle ||
            "Boka ett kostnadsfritt samtal med en av våra konsulter. Vi ger dig en första bedömning och visar hur vi kan hjälpa dig."}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/kontakt"
            className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/30 cursor-pointer"
          >
            {ctaSection?.cta?.text || "Boka kostnadsfri rådgivning"}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="tel:08-12345678"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            Eller ring oss: 08-123 456 78
          </a>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
function Startsida() {
  const { data: page } = useQuery({
    queryKey: ["cms", "getPage", "startsida"],
    queryFn: () => getPage({ data: { slug: "startsida" } }),
  });

  const heroSection = page?.sections?.find((s: CmsSection) => s.type === "hero");
  const featuresSection = page?.sections?.find((s: CmsSection) => s.type === "features");
  const statsSection = page?.sections?.find((s: CmsSection) => s.type === "stats");
  const ctaSection = page?.sections?.find((s: CmsSection) => s.type === "cta");

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
      ? statsSection.items.map((item: { title?: string; description?: string; icon?: string }) => ({
          value: item.title || "",
          label: item.description || "",
        }))
      : FALLBACK_SECTIONS.stats;

  return (
    <div className="overflow-hidden">
      <HeroSection hero={hero} />
      <StatsSection stats={stats} />
      <LogoCloudSection />
      <IndependenceSection />
      <ServicesSection featuresSection={featuresSection} features={features} />
      <HowItWorksSection />
      <TeamSection />
      <CtaSection ctaSection={ctaSection} />
    </div>
  );
}
