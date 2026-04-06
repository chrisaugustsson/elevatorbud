import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getPage, submitContact } from "~/server/api";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Mail, Phone, MapPin, Clock, ArrowRight, Check } from "lucide-react";

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
  const { data: page } = useQuery({
    queryKey: ["cms", "getPage", "kontakt"],
    queryFn: () => getPage({ data: { slug: "kontakt" } }),
  });
  const submitContactMutation = useMutation({
    mutationFn: (input: { name: string; email: string; phone?: string; message: string; turnstileToken?: string }) =>
      submitContact({ data: input }),
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const heroSection = page?.sections?.find((s: CmsSection) => s.type === "hero");
  const contactSection = page?.sections?.find((s: CmsSection) => s.type === "contact");
  const formSection = page?.sections?.find((s: CmsSection) => s.type === "form");

  const contactItems =
    contactSection?.items && contactSection.items.length > 0
      ? contactSection.items
      : FALLBACK.contact;

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

            <div className="mt-10 space-y-5">
              {contactItems.map((item: CmsItem, i: number) => {
                const IconComponent =
                  iconMap[(item as { icon?: string }).icon || ""] || Mail;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
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

            {/* Call-to-action callout */}
            <div className="mt-8 rounded-xl bg-blue-50 border border-blue-100 p-5">
              <p className="text-sm font-semibold text-blue-900">
                Eller ring oss direkt
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Vill du prata med någon direkt? Ring oss på{" "}
                <a
                  href="tel:0812345678"
                  className="font-semibold underline underline-offset-2 hover:text-blue-900 transition-colors"
                >
                  08-123 456 78
                </a>{" "}
                så hjälper vi dig.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-900">
              {formSection?.title || "Skicka ett meddelande"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {formSection?.subtitle ||
                "Fyll i formuläret så kontaktar vi dig inom kort."}
            </p>

            {submitted ? (
              <div className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Tack för ditt meddelande!
                </h3>
                <p className="text-sm text-slate-500">
                  Vi har tagit emot din förfrågan och återkommer så snart vi kan.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  Skicka ett nytt meddelande
                </button>
              </div>
            ) : (
            <form
              className="mt-8 space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!turnstileToken) return;
                setSubmitting(true);
                try {
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  await submitContactMutation.mutateAsync({
                    name: formData.get("namn") as string,
                    email: formData.get("epost") as string,
                    phone: (formData.get("telefon") as string) || undefined,
                    message: formData.get("meddelande") as string,
                  });
                  setSubmitted(true);
                } catch {
                  turnstileRef.current?.reset();
                  setTurnstileToken(null);
                } finally {
                  setSubmitting(false);
                }
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
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
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
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
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
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
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
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-y transition-colors"
                  placeholder="Beskriv vad du vill ha hjälp med..."
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
                <span className="text-sm text-slate-500">
                  Jag godkänner att Hisskompetens lagrar mina uppgifter för att
                  hantera min förfrågan. Läs vår{" "}
                  <a
                    href="/integritetspolicy"
                    target="_blank"
                    className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
                  >
                    integritetspolicy
                  </a>
                  .
                </span>
              </label>

              <Turnstile
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: "light", size: "flexible" }}
              />

              <button
                type="submit"
                disabled={submitting || !turnstileToken}
                className="group w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Skickar..." : "Skicka meddelande"}
                {!submitting && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            </form>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
