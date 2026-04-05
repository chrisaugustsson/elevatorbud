import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, AlertTriangle, Scale, Ban, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/villkor")({
  component: Villkor,
});

function Villkor() {
  return (
    <div className="pt-28 pb-16 sm:pb-24">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-blue-600">Juridiskt</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          Allmänna villkor
        </h1>
        <p className="text-lg text-slate-500">
          Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}
        </p>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 space-y-12">
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 leading-relaxed">
            Dessa villkor gäller för användning av Hisskompetens webbplats och
            digitala tjänster. Genom att använda våra tjänster godkänner du dessa
            villkor.
          </p>
        </div>

        <TermsSection
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          title="1. Om Hisskompetens"
        >
          <p>
            Hisskompetens AB tillhandahåller oberoende rådgivning och digitala
            verktyg för hisshantering. Våra tjänster riktar sig till
            fastighetsägare, bostadsrättsföreningar och förvaltningsbolag i
            Sverige.
          </p>
        </TermsSection>

        <TermsSection
          icon={<Scale className="h-5 w-5 text-blue-600" />}
          title="2. Tjänstebeskrivning"
        >
          <h4>Webbplats</h4>
          <p>
            Vår webbplats (hisskompetens.se) tillhandahåller information om våra
            tjänster och möjlighet att kontakta oss.
          </p>
          <h4>Digitala tjänster</h4>
          <p>
            Via inloggade tjänster erbjuder vi digitala verktyg för att hantera
            hissbestånd, följa ärenden och ta del av rapporter. Tillgång kräver
            ett aktivt konto.
          </p>
        </TermsSection>

        <TermsSection
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          title="3. Användarkonton"
        >
          <ul>
            <li>
              Du ansvarar för att hålla dina inloggningsuppgifter säkra och
              konfidentiella.
            </li>
            <li>
              Du får inte dela ditt konto med obehöriga personer.
            </li>
            <li>
              Vi förbehåller oss rätten att stänga av konton som missbrukas
              eller strider mot dessa villkor.
            </li>
            <li>
              Kontoinformation hanteras i enlighet med vår{" "}
              <Link
                to="/integritetspolicy"
                className="text-blue-600 hover:text-blue-700"
              >
                integritetspolicy
              </Link>
              .
            </li>
          </ul>
        </TermsSection>

        <TermsSection
          icon={<AlertTriangle className="h-5 w-5 text-blue-600" />}
          title="4. Ansvarsbegränsning"
        >
          <ul>
            <li>
              Informationen på webbplatsen tillhandahålls i informationssyfte
              och utgör inte juridisk eller teknisk rådgivning.
            </li>
            <li>
              Hisskompetens ansvarar inte för eventuella fel eller brister i
              information som presenteras på webbplatsen.
            </li>
            <li>
              Vår rådgivning inom ramen för kunduppdrag regleras av separata
              uppdragsavtal.
            </li>
            <li>
              Vi ansvarar inte för störningar eller avbrott i våra digitala
              tjänster orsakade av tredjepartsleverantörer.
            </li>
          </ul>
        </TermsSection>

        <TermsSection
          icon={<Ban className="h-5 w-5 text-blue-600" />}
          title="5. Immaterialrätt"
        >
          <p>
            Allt innehåll på webbplatsen — inklusive text, grafik, logotyper och
            programvara — tillhör Hisskompetens AB eller dess licensgivare och
            skyddas av upphovsrätt.
          </p>
          <ul>
            <li>
              Du får inte kopiera, distribuera eller använda innehållet utan
              skriftligt medgivande.
            </li>
            <li>
              Varumärket Hisskompetens och tillhörande logotyper får inte
              användas utan tillstånd.
            </li>
          </ul>
        </TermsSection>

        <TermsSection
          icon={<Scale className="h-5 w-5 text-blue-600" />}
          title="6. Tillämplig lag och tvister"
        >
          <p>
            Dessa villkor regleras av svensk lag. Tvister som uppstår i
            anslutning till dessa villkor ska i första hand lösas genom
            förhandling. Om enighet inte kan nås ska tvisten avgöras av svensk
            allmän domstol med Stockholms tingsrätt som första instans.
          </p>
        </TermsSection>

        <TermsSection
          icon={<RefreshCw className="h-5 w-5 text-blue-600" />}
          title="7. Ändringar"
        >
          <p>
            Vi förbehåller oss rätten att uppdatera dessa villkor. Vid
            väsentliga ändringar informerar vi registrerade användare via e-post.
            Fortsatt användning av tjänsterna efter publicerade ändringar innebär
            att du godkänner de uppdaterade villkoren.
          </p>
        </TermsSection>

        <TermsSection
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          title="8. Kontakt"
        >
          <p>
            Har du frågor om dessa villkor? Kontakta oss:
          </p>
          <ul>
            <li>E-post: info@hisskompetens.se</li>
            <li>Telefon: 08-123 456 78</li>
            <li>Adress: Stockholm, Sverige</li>
          </ul>
        </TermsSection>

        <div className="pt-8 border-t border-slate-200">
          <Link
            to="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            &larr; Tillbaka till startsidan
          </Link>
        </div>
      </section>
    </div>
  );
}

function TermsSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
          {icon}
        </div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="prose prose-slate max-w-none ml-11 text-slate-600 [&_h4]:text-base [&_h4]:font-medium [&_h4]:text-slate-800 [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-slate-600 [&_a]:text-blue-600 [&_a]:hover:text-blue-700">
        {children}
      </div>
    </div>
  );
}
