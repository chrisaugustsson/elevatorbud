import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/kontakt")({
  component: Kontakt,
});

const FALLBACK = {
  hero: {
    title: "Kontakta oss",
    subtitle:
      "Har du frågor om våra tjänster eller vill boka en demonstration? Vi hjälper dig gärna.",
  },
  contact: [
    {
      icon: "Mail",
      title: "E-post",
      description: "info@hisskompetens.se",
    },
    {
      icon: "Phone",
      title: "Telefon",
      description: "08-123 456 78",
    },
    {
      icon: "MapPin",
      title: "Adress",
      description: "Stockholm, Sverige",
    },
    {
      icon: "Clock",
      title: "Öppettider",
      description: "Mån-Fre 08:00-17:00",
    },
  ],
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Phone,
  MapPin,
  Clock,
};

function Kontakt() {
  const page = useQuery(api.cms.getPage, { slug: "kontakt" });

  const heroSection = page?.sections?.find((s) => s.type === "hero");
  const contactSection = page?.sections?.find((s) => s.type === "contact");
  const formSection = page?.sections?.find((s) => s.type === "form");

  const contactItems =
    contactSection?.items && contactSection.items.length > 0
      ? contactSection.items
      : FALLBACK.contact;

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

      {/* Contact info + form */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-16 lg:grid-cols-2">
          {/* Contact info */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {contactSection?.title || "Kontaktuppgifter"}
            </h2>
            <p className="mt-4 text-base text-slate-500">
              {contactSection?.subtitle ||
                "Tveka inte att höra av dig. Vi återkommer så snart vi kan."}
            </p>

            <div className="mt-10 space-y-6">
              {contactItems.map((item, i) => {
                const IconComponent =
                  iconMap[(item as { icon?: string }).icon || ""] || Mail;
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              {formSection?.title || "Skicka ett meddelande"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {formSection?.subtitle ||
                "Fyll i formuläret så kontaktar vi dig inom kort."}
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const mailto = `mailto:info@hisskompetens.se?subject=${encodeURIComponent(
                  `Kontaktförfrågan från ${formData.get("namn")}`,
                )}&body=${encodeURIComponent(
                  `Namn: ${formData.get("namn")}\nE-post: ${formData.get("epost")}\nTelefon: ${formData.get("telefon") || "-"}\n\n${formData.get("meddelande")}`,
                )}`;
                window.location.href = mailto;
              }}
            >
              <div>
                <label
                  htmlFor="namn"
                  className="block text-sm font-medium text-slate-700"
                >
                  Namn *
                </label>
                <input
                  type="text"
                  id="namn"
                  name="namn"
                  required
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="Ditt namn"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="epost"
                    className="block text-sm font-medium text-slate-700"
                  >
                    E-post *
                  </label>
                  <input
                    type="email"
                    id="epost"
                    name="epost"
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="din@email.se"
                  />
                </div>
                <div>
                  <label
                    htmlFor="telefon"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="telefon"
                    name="telefon"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="070-123 45 67"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="meddelande"
                  className="block text-sm font-medium text-slate-700"
                >
                  Meddelande *
                </label>
                <textarea
                  id="meddelande"
                  name="meddelande"
                  required
                  rows={5}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-y"
                  placeholder="Beskriv vad du vill ha hjälp med..."
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                Skicka meddelande
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
