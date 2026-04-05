import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Database, Lock, UserCheck, Mail } from "lucide-react";

export const Route = createFileRoute("/integritetspolicy")({
  component: Integritetspolicy,
});

function Integritetspolicy() {
  return (
    <div className="pt-28 pb-16 sm:pb-24">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-blue-600">GDPR</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          Integritetspolicy
        </h1>
        <p className="text-lg text-slate-500">
          Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}
        </p>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 space-y-12">
        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 leading-relaxed">
            Hisskompetens värnar om din integritet. Denna policy beskriver hur vi
            samlar in, använder och skyddar dina personuppgifter i enlighet med
            EU:s dataskyddsförordning (GDPR).
          </p>
        </div>

        <PolicySection
          icon={<Database className="h-5 w-5 text-blue-600" />}
          title="1. Personuppgiftsansvarig"
        >
          <p>
            Hisskompetens är personuppgiftsansvarig för behandlingen av dina
            personuppgifter. Kontaktperson för dataskyddsfrågor:
          </p>
          <ul>
            <li>Robin Plato</li>
            <li>E-post: robin@hisskompetens.se</li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<UserCheck className="h-5 w-5 text-blue-600" />}
          title="2. Vilka uppgifter samlar vi in?"
        >
          <p>Vi behandlar följande personuppgifter beroende på hur du interagerar med oss:</p>
          <h4>Via kontaktformulär och e-post</h4>
          <ul>
            <li>Namn</li>
            <li>E-postadress</li>
            <li>Telefonnummer</li>
            <li>Företagsnamn</li>
            <li>Meddelande och ärendeinnehåll</li>
          </ul>
          <h4>Via våra digitala tjänster (inloggade användare)</h4>
          <ul>
            <li>Namn och e-postadress (via inloggning)</li>
            <li>Information kopplad till hissbestånd och uppdrag</li>
          </ul>
          <h4>Automatiskt vid besök på webbplatsen</h4>
          <ul>
            <li>
              Vi använder inga analys- eller spårningsverktyg. Vi samlar inte in
              cookies för marknadsföring eller statistik.
            </li>
            <li>
              Vid inloggning i våra tjänster används nödvändiga
              autentiseringscookies för att hålla dig inloggad. Dessa kräver
              inget samtycke enligt GDPR.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<Lock className="h-5 w-5 text-blue-600" />}
          title="3. Varför behandlar vi dina uppgifter?"
        >
          <table>
            <thead>
              <tr>
                <th>Ändamål</th>
                <th>Laglig grund</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Besvara förfrågningar och ge offerter</td>
                <td>Berättigat intresse</td>
              </tr>
              <tr>
                <td>Tillhandahålla våra digitala tjänster</td>
                <td>Fullgörande av avtal</td>
              </tr>
              <tr>
                <td>Hantera kundrelationer</td>
                <td>Fullgörande av avtal</td>
              </tr>
              <tr>
                <td>Autentisering och inloggning</td>
                <td>Fullgörande av avtal</td>
              </tr>
              <tr>
                <td>Uppfylla rättsliga skyldigheter (bokföring m.m.)</td>
                <td>Rättslig förpliktelse</td>
              </tr>
            </tbody>
          </table>
        </PolicySection>

        <PolicySection
          icon={<Shield className="h-5 w-5 text-blue-600" />}
          title="4. Hur länge sparar vi dina uppgifter?"
        >
          <ul>
            <li>
              <strong>Kontaktförfrågningar:</strong> Raderas inom 12 månader om
              inget uppdrag inleds.
            </li>
            <li>
              <strong>Kunduppgifter:</strong> Sparas under avtalsperioden och i
              enlighet med bokföringslagen (7 år).
            </li>
            <li>
              <strong>Kontoinformation:</strong> Sparas så länge du har ett
              aktivt konto. Raderas vid begäran.
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<Database className="h-5 w-5 text-blue-600" />}
          title="5. Tredjeparter och underbiträden"
        >
          <p>
            Vi använder betrodda underbiträden för att tillhandahålla våra
            tjänster. Dessa kan hantera:
          </p>
          <ul>
            <li>Autentisering och inloggningssessioner</li>
            <li>Datalagring för våra digitala tjänster</li>
            <li>Utskick av e-postnotifieringar vid kontaktförfrågningar</li>
          </ul>
          <p>
            Alla underbiträden har avtalade dataskyddsvillkor och behandlar
            uppgifter i enlighet med GDPR. En fullständig lista över
            underbiträden kan begäras via{" "}
            <a href="mailto:robin@hisskompetens.se">robin@hisskompetens.se</a>.
          </p>
          <p>
            Vi säljer aldrig dina personuppgifter till tredje part. Vi delar
            bara uppgifter med parter som är nödvändiga för att leverera våra
            tjänster, och som har avtalade dataskyddsvillkor.
          </p>
        </PolicySection>

        <PolicySection
          icon={<UserCheck className="h-5 w-5 text-blue-600" />}
          title="6. Dina rättigheter"
        >
          <p>Enligt GDPR har du rätt att:</p>
          <ul>
            <li>
              <strong>Få tillgång</strong> till de personuppgifter vi behandlar
              om dig
            </li>
            <li>
              <strong>Begära rättelse</strong> av felaktiga uppgifter
            </li>
            <li>
              <strong>Begära radering</strong> av dina uppgifter
            </li>
            <li>
              <strong>Begära begränsning</strong> av behandlingen
            </li>
            <li>
              <strong>Invända</strong> mot behandling baserad på berättigat
              intresse
            </li>
            <li>
              <strong>Dataportabilitet</strong> — få ut dina uppgifter i ett
              maskinläsbart format
            </li>
          </ul>
          <p>
            Kontakta oss på{" "}
            <a href="mailto:robin@hisskompetens.se">robin@hisskompetens.se</a> för
            att utöva dina rättigheter. Vi besvarar din begäran inom 30 dagar.
          </p>
        </PolicySection>

        <PolicySection
          icon={<Mail className="h-5 w-5 text-blue-600" />}
          title="7. Klagomål"
        >
          <p>
            Om du anser att vi behandlar dina personuppgifter i strid med GDPR
            har du rätt att lämna klagomål till Integritetsskyddsmyndigheten
            (IMY).
          </p>
          <ul>
            <li>Webb: www.imy.se</li>
            <li>E-post: imy@imy.se</li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<Shield className="h-5 w-5 text-blue-600" />}
          title="8. Ändringar i denna policy"
        >
          <p>
            Vi kan komma att uppdatera denna policy. Vid väsentliga ändringar
            informerar vi dig via e-post eller genom att publicera en
            uppdatering på vår webbplats. Datum för senaste ändring anges alltid
            överst på sidan.
          </p>
        </PolicySection>

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

function PolicySection({
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
      <div className="prose prose-slate max-w-none ml-11 text-slate-600 [&_h4]:text-base [&_h4]:font-medium [&_h4]:text-slate-800 [&_h4]:mt-4 [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-slate-600 [&_table]:w-full [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_th]:text-sm [&_th]:font-medium [&_th]:text-slate-800 [&_td]:py-2 [&_td]:pr-4 [&_td]:text-sm [&_a]:text-blue-600 [&_a]:hover:text-blue-700">
        {children}
      </div>
    </div>
  );
}
