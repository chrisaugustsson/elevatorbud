import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  Building2,
  Phone,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/tjanster")({
  component: Tjanster,
});

const FALLBACK_SERVICES = [
  {
    icon: "ClipboardCheck",
    title: "Hissregister & inventering",
    description:
      "Komplett digitalt register med alla tekniska specifikationer för varje hiss. Vi inventerar ert hissbestånd och bygger upp ett strukturerat register med all relevant data.",
    features: [
      "Tekniska specifikationer per hiss",
      "Historik över besiktningar och åtgärder",
      "Automatisk kategorisering och sökbarhet",
      "Export till Excel och CSV",
    ],
  },
  {
    icon: "Wrench",
    title: "Moderniseringsplanering",
    description:
      "Strategisk planering av moderniseringar med tydlig tidslinje, budgetuppföljning och prioriterade åtgärdslistor baserade på er hissflottas ålder och skick.",
    features: [
      "Tidslinje från idag till 2050",
      "Budgetplanering per år och distrikt",
      "Prioriterade åtgärdslistor",
      "Kostnadsuppskattningar per hiss",
    ],
  },
  {
    icon: "BarChart3",
    title: "Dashboard & rapportering",
    description:
      "Överskådliga dashboards med nyckeltal, statistik och visualiseringar som ger er full koll på hela hissbeståndet. Anpassade vyer för olika intressenter.",
    features: [
      "Nyckeltal och KPI:er i realtid",
      "Diagram över åldersfördelning och typer",
      "Jämförelser mellan distrikt",
      "Anpassade rapporter",
    ],
  },
  {
    icon: "Shield",
    title: "Besiktning & underhåll",
    description:
      "Kalendervy över besiktningar, överblick av skötselföretag och deras ansvarsområden. Se till att alla hissar besiktigas i tid.",
    features: [
      "Besiktningskalender per månad",
      "Skötselföretag per distrikt",
      "Bevaka kommande besiktningar",
      "Historisk uppföljning",
    ],
  },
  {
    icon: "Phone",
    title: "Nödtelefoner",
    description:
      "Komplett statusöversikt av nödtelefoner med uppgraderingsbehov, kostnadsberäkningar och distriktsvis uppföljning.",
    features: [
      "Status per nödtelefon",
      "Uppgraderingsbehov och kostnader",
      "Distriktsvis översikt",
      "Bevakning av regelverk",
    ],
  },
  {
    icon: "Building2",
    title: "Kundportal",
    description:
      "Ge era kunder tillgång till sin egen hissdata via en dedikerad portal. Varje organisation ser enbart sina egna hissar med anpassad dashboard.",
    features: [
      "Separata vyer per organisation",
      "Egen dashboard och register",
      "Moderniseringsöversikt",
      "Exportmöjligheter",
    ],
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  Building2,
  Phone,
};

function Tjanster() {
  const page = useQuery(api.cms.getPage, { slug: "tjanster" });

  const heroSection = page?.sections?.find((s) => s.type === "hero");
  const servicesSection = page?.sections?.find((s) => s.type === "services");

  const services =
    servicesSection?.items && servicesSection.items.length > 0
      ? servicesSection.items
      : FALLBACK_SERVICES;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              {heroSection?.title || "Våra tjänster"}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-500">
              {heroSection?.subtitle ||
                "Vi erbjuder en komplett plattform för hisshantering som täcker allt från inventering till moderniseringsplanering."}
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="space-y-20">
          {services.map((service, i) => {
            const IconComponent =
              iconMap[(service as { icon?: string }).icon || ""] || Building2;
            const isReversed = i % 2 === 1;

            return (
              <div
                key={i}
                className={`flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16 ${
                  isReversed ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <IconComponent className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-slate-900 sm:text-3xl">
                    {service.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-slate-500">
                    {service.description}
                  </p>
                  {"features" in service &&
                    (service as { features: string[] }).features && (
                      <ul className="mt-6 space-y-3">
                        {(service as { features: string[] }).features.map(
                          (feature, j) => (
                            <li key={j} className="flex items-start gap-3">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                              <span className="text-sm text-slate-600">
                                {feature}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                </div>

                <div className="flex-1">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center">
                    <IconComponent className="h-20 w-20 text-blue-200" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Intresserad av våra tjänster?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Kontakta oss för en demonstration och offert anpassad efter era
            behov.
          </p>
          <div className="mt-10">
            <Link
              to="/kontakt"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl"
            >
              Kontakta oss
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
