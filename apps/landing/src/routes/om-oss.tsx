import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPage } from "~/server/api";
import { Target, Eye, Users, Award } from "lucide-react";

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

type CmsItem = { title?: string; description?: string; icon?: string };

export const Route = createFileRoute("/om-oss")({
  component: OmOss,
});

const FALLBACK = {
  hero: {
    title: "Om Hisskompetens",
    subtitle:
      "Oberoende hisskonsulter sedan 2002. Vi hjälper fastighetsägare att ta kontroll över sitt hissbestånd — med trygghet, säkerhet och kvalitet i fokus.",
  },
  mission: {
    title: "Vårt uppdrag",
    content:
      "Hisskompetens grundades med en enkel insikt: fastighetsägare förtjänar oberoende rådgivning om sina hissar. Tillverkare och serviceföretag har egna intressen — vi har bara ditt. Sedan 2002 har vi hjälpt hundratals fastighetsägare att sänka kostnader, förbättra säkerheten och fatta bättre beslut om sina hissbestånd.",
  },
  values: [
    {
      icon: "Target",
      title: "Oberoende",
      description:
        "Vi har inga bindningar till tillverkare, serviceföretag eller leverantörer. Våra rekommendationer baseras enbart på vad som är bäst för dig som fastighetsägare.",
    },
    {
      icon: "Eye",
      title: "Transparens",
      description:
        "Du får alltid tydlig redovisning av vad vi gör, varför vi gör det och vad det kostar. Inga dolda avgifter eller oklara avtal.",
    },
    {
      icon: "Users",
      title: "Personlig kontakt",
      description:
        "Du vet alltid vem du pratar med. Våra konsulter är tillgängliga direkt — inte via växel eller ärendesystem.",
    },
    {
      icon: "Award",
      title: "Kvalitet & säkerhet",
      description:
        "Varje rekommendation vi ger utgår från gällande regelverk och branschstandarder. Trygghet och säkerhet går alltid först.",
    },
  ],
  story: {
    title: "Vår historia",
    paragraphs: [
      "Hisskompetens startade 2002 med en tydlig vision: att ge fastighetsägare tillgång till oberoende expertis inom hisshantering. Alltför ofta fattades stora investeringsbeslut utan ett oberoende perspektiv — och resultatet blev onödigt höga kostnader och undermålig kvalitet.",
      "Sedan starten har vi byggt upp en bred erfarenhet som sträcker sig från stora hotellkomplex som Gothia Towers till enskilda bostadsrättsföreningar. Oavsett storlek på uppdrag är vår grundfilosofi densamma: oberoende rådgivning som sätter fastighetsägarens intressen först.",
      "Idag hanterar vi rådgivning för över 2 000 hissar och har genomfört fler än 500 projekt. Vi är stolta över det förtroende vi fått och fortsätter att utveckla vår verksamhet för att hjälpa fler fastighetsägare i Sverige.",
    ],
  },
};

const MILESTONES = [
  { year: "2002", label: "Grundat" },
  { year: "2 000+", label: "Hissar" },
  { year: "500+", label: "Projekt" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Eye,
  Users,
  Award,
};

function OmOss() {
  const { data: page } = useQuery({
    queryKey: ["cms", "getPage", "om-oss"],
    queryFn: () => getPage({ data: { slug: "om-oss" } }),
  });

  const heroSection = page?.sections?.find((s: CmsSection) => s.type === "hero");
  const missionSection = page?.sections?.find((s: CmsSection) => s.type === "mission");
  const valuesSection = page?.sections?.find((s: CmsSection) => s.type === "values");
  const storySection = page?.sections?.find((s: CmsSection) => s.type === "story");

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
      <section className="relative bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.2),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {heroSection?.title || FALLBACK.hero.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              {heroSection?.subtitle || FALLBACK.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-8 sm:p-12">
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
            {values.map((value: CmsItem, i: number) => {
              const IconComponent =
                iconMap[(value as { icon?: string }).icon || ""] || Target;
              return (
                <div
                  key={i}
                  className="flex gap-5 rounded-xl bg-white p-6 border border-slate-200 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                    <IconComponent className="h-7 w-7" />
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

        {/* Milestones */}
        <div className="mt-8 flex flex-wrap gap-6">
          {MILESTONES.map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-5 py-3"
            >
              <span className="text-2xl font-extrabold text-blue-600">
                {m.year}
              </span>
              <span className="text-sm font-medium text-slate-500">
                {m.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-6">
          {storyParagraphs.map((paragraph: string, i: number) => (
            <p key={i} className="text-base leading-relaxed text-slate-500">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

    </div>
  );
}
