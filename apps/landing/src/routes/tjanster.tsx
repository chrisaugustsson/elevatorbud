import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ArrowRight,
  Phone,
  Search,
  FileCheck,
  Banknote,
  HardHat,
  ShieldCheck,
  Leaf,
  Building2,
  Hotel,
  Home,
  Landmark,
  Construction,
  Briefcase,
  CheckCircle2,
} from "lucide-react";

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

export const Route = createFileRoute("/tjanster")({
  component: Tjanster,
});

const SERVICES = [
  {
    icon: Search,
    title: "Upphandling",
    subtitle: "av hisservice & installationer",
    description:
      "Vi hjälper dig att upphandla service, modernisering och nyinstallation av hissar. Som oberoende konsulter har vi inga bindningar till tillverkare — vi säkerställer att du får rätt kvalitet till rätt pris.",
    features: [
      "Framtagning av förfrågningsunderlag",
      "Utvärdering av anbud och leverantörer",
      "Avtalsgranskning och förhandling",
      "Oberoende rådgivning utan sidointressen",
    ],
    gradient: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    accentBorder: "border-blue-200",
  },
  {
    icon: FileCheck,
    title: "Besiktning",
    subtitle: "& teknisk kontroll",
    description:
      "Systematisk genomgång av ditt hissbestånd. Vi identifierar risker, brister och förbättringsmöjligheter — och ger dig en tydlig prioriteringslista.",
    features: [
      "Fullständig inventering av hissbestånd",
      "Bedömning av tekniskt skick och säkerhet",
      "Identifiering av lagkrav och brister",
      "Prioriterad åtgärdslista med kostnadsuppskattning",
    ],
    gradient: "from-indigo-500 to-indigo-600",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-600",
    accentBorder: "border-indigo-200",
  },
  {
    icon: Banknote,
    title: "Kostnadsanalys",
    subtitle: "& avtalsoptimering",
    description:
      "Detaljerad analys av dina nuvarande hisskostnader och avtal. Vi hittar besparingsmöjligheter och förhandlar bättre villkor — många kunder sparar 20–30% på sina hissavtal.",
    features: [
      "Genomgång av befintliga serviceavtal",
      "Benchmarking mot marknadspriser",
      "Identifiering av dolda kostnader",
      "Konkreta besparingsförslag med kalkyl",
    ],
    gradient: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    accentBorder: "border-emerald-200",
  },
  {
    icon: HardHat,
    title: "Projektledning",
    subtitle: "från start till mål",
    description:
      "Vi projektleder hissbyten, moderniseringar och nyinstallationer — från förstudie och upphandling till slutbesiktning. Erfarenhet från Gothia Towers till enskilda bostadsrättsföreningar.",
    features: [
      "Förstudie och behovsanalys",
      "Upphandling och leverantörsval",
      "Löpande kontroll under genomförande",
      "Slutbesiktning och garantibevakning",
    ],
    gradient: "from-orange-500 to-orange-600",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
    accentBorder: "border-orange-200",
  },
  {
    icon: ShieldCheck,
    title: "Underhållsplanering",
    subtitle: "för lång livslängd",
    description:
      "Långsiktig underhållsplan anpassad efter ditt hissbestånd. Rätt planerat underhåll förlänger livslängden på dina hissar och förebygger kostsamma driftstopp.",
    features: [
      "Underhållsplan med tidslinje och budget",
      "Prioritering baserad på ålder och skick",
      "Planering av kommande moderniseringar",
      "Uppföljning och revidering",
    ],
    gradient: "from-violet-500 to-violet-600",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
    accentBorder: "border-violet-200",
  },
  {
    icon: Leaf,
    title: "Hållbarhet",
    subtitle: "& energioptimering",
    description:
      "Rätt underhåll och genomtänkt modernisering minskar energiförbrukningen avsevärt. Vi hjälper dig göra hållbara val som både sänker driftkostnader och bidrar till en bättre miljö.",
    features: [
      "Energianalys av befintliga hissar",
      "Rekommendationer för energieffektiviseringar",
      "Livslängdsoptimering genom rätt underhåll",
      "Miljöcertifiering och dokumentation",
    ],
    gradient: "from-teal-500 to-teal-600",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600",
    accentBorder: "border-teal-200",
  },
];

const TARGET_AUDIENCES = [
  { icon: Building2, title: "Fastighetsbolag", description: "Stora bestånd med många hissar kräver systematik och översikt." },
  { icon: Hotel, title: "Hotell & konferens", description: "Driftsäkerhet är avgörande i gästmiljöer." },
  { icon: Home, title: "Bostadsrättsföreningar", description: "Ofta stora investeringar med liten erfarenhet." },
  { icon: Landmark, title: "Kommuner & regioner", description: "Krav på upphandling och transparens." },
  { icon: Construction, title: "Byggherrar", description: "Kravspecifikation och upphandling vid nybyggnation." },
  { icon: Briefcase, title: "Förvaltningsbolag", description: "Kunskap och resurser ni kanske saknar internt." },
];

function Tjanster() {
  const page = useQuery(api.cms.getPage, { slug: "tjanster" });
  const heroSection = page?.sections?.find((s: CmsSection) => s.type === "hero");

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.2),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {heroSection?.title || "Tjänster för fastighetsägare"}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-300">
              {heroSection?.subtitle ||
                "Från upphandling och besiktning till projektledning och långsiktigt underhåll — vi hjälper dig ta kontroll över ditt hissbestånd."}
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className={`group relative rounded-2xl border bg-white p-8 transition-all duration-300 hover:shadow-lg ${service.accentBorder} hover:border-opacity-100 border-opacity-60`}
              >
                {/* Gradient accent bar */}
                <div
                  className={`absolute top-0 left-8 right-8 h-1 rounded-b-full bg-gradient-to-r ${service.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                {/* Icon */}
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${service.iconBg} ${service.iconColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-7 w-7" />
                </div>

                {/* Title */}
                <h3 className="mt-6 text-xl font-bold text-slate-900">
                  {service.title}{" "}
                  <span className="font-normal text-slate-400">
                    {service.subtitle}
                  </span>
                </h3>

                {/* Description */}
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="mt-5 space-y-2">
                  {service.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${service.iconColor}`}
                      />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Target audience — compact strip */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Vi hjälper alla typer av fastighetsägare
          </h2>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TARGET_AUDIENCES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group flex flex-col items-center text-center p-4 rounded-xl transition-colors hover:bg-white"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_120%,rgba(59,130,246,0.15),transparent)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Osäker på vad du behöver?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-300">
            Boka ett kostnadsfritt samtal så hjälper vi dig identifiera var du
            kan spara pengar och förbättra säkerheten i ditt hissbestånd.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/kontakt"
              className="group inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/30 cursor-pointer"
            >
              Boka kostnadsfri rådgivning
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="tel:08-12345678"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white"
            >
              <Phone className="h-4 w-4" />
              Eller ring oss: 08-123 456 78
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
