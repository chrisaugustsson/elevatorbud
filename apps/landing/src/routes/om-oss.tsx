import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Target, Eye, Users, Award } from "lucide-react";

export const Route = createFileRoute("/om-oss")({
  component: OmOss,
});

const FALLBACK = {
  hero: {
    title: "Om Hisskompetens",
    subtitle:
      "Vi är specialister på hisshantering med lång erfarenhet av att hjälpa fastighetsägare att hålla sina hissar säkra, moderna och kostnadseffektiva.",
  },
  mission: {
    title: "Vårt uppdrag",
    content:
      "Hisskompetens grundades med målet att modernisera hur fastighetsägare och förvaltare hanterar sina hissar. Vi tror att bättre data leder till bättre beslut — och att alla hissar förtjänar professionell uppföljning oavsett storlek på beståndet.",
  },
  values: [
    {
      icon: "Target",
      title: "Precision",
      description:
        "Vi jobbar med exakta data och strukturerade processer. Varje hiss i systemet har komplett dokumentation med alla tekniska specifikationer.",
    },
    {
      icon: "Eye",
      title: "Transparens",
      description:
        "Våra kunder har full insyn i sin hissdata via en dedikerad kundportal. Inga dolda uppgifter — all information tillgänglig dygnet runt.",
    },
    {
      icon: "Users",
      title: "Samarbete",
      description:
        "Vi arbetar nära våra kunder för att förstå deras behov. Plattformen utvecklas kontinuerligt baserat på användarfeedback.",
    },
    {
      icon: "Award",
      title: "Kvalitet",
      description:
        "Från besiktning till modernisering — vi säkerställer att varje steg följer gällande regelverk och branschstandarder.",
    },
  ],
  story: {
    title: "Vår historia",
    paragraphs: [
      "Hisskompetens startade som ett svar på en tydlig brist i branschen: fastighetsägare saknade ett enkelt och överskådligt sätt att hålla koll på sitt hissbestånd. Excel-listor och pappersarkiv räckte inte längre.",
      "Vi byggde en digital plattform som samlar all hissdata på ett ställe — från tekniska specifikationer och besiktningshistorik till moderniseringsplaner och budgetprognoser. Idag hjälper vi organisationer av alla storlekar att fatta bättre beslut om sina hissar.",
      "Vår plattform hanterar idag över tusen hissar och vi fortsätter att växa. Vi är stolta över att bidra till säkrare och mer effektiv hisshantering i Sverige.",
    ],
  },
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Eye,
  Users,
  Award,
};

function OmOss() {
  const page = useQuery(api.cms.getPage, { slug: "om-oss" });

  const heroSection = page?.sections?.find((s) => s.type === "hero");
  const missionSection = page?.sections?.find((s) => s.type === "mission");
  const valuesSection = page?.sections?.find((s) => s.type === "values");
  const storySection = page?.sections?.find((s) => s.type === "story");

  const values =
    valuesSection?.items && valuesSection.items.length > 0
      ? valuesSection.items
      : FALLBACK.values;

  const storyParagraphs = storySection?.content
    ? storySection.content.split("\n\n")
    : FALLBACK.story.paragraphs;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {heroSection?.title || FALLBACK.hero.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-500">
              {heroSection?.subtitle || FALLBACK.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {missionSection?.title || FALLBACK.mission.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {missionSection?.content || FALLBACK.mission.content}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {valuesSection?.title || "Våra värderingar"}
          </h2>
          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            {values.map((value, i) => {
              const IconComponent =
                iconMap[(value as { icon?: string }).icon || ""] || Target;
              return (
                <div key={i} className="flex gap-5">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {value.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {value.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {storySection?.title || FALLBACK.story.title}
        </h2>
        <div className="mt-8 space-y-6">
          {storyParagraphs.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-slate-500">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
