import { useState } from "react";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import { Label } from "@elevatorbud/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import type { CmsPage } from "./startsida-form";

const CONTACT_ICONS = [
  { value: "Mail", label: "Mail", icon: Mail },
  { value: "Phone", label: "Phone", icon: Phone },
  { value: "MapPin", label: "MapPin", icon: MapPin },
  { value: "Clock", label: "Clock", icon: Clock },
] as const;

type ContactItem = { title: string; description: string; icon: string };

type KontaktFormState = {
  hero: { title: string; subtitle: string };
  contact: { title: string; subtitle: string; items: ContactItem[] };
  form: { title: string; subtitle: string };
};

function emptyState(): KontaktFormState {
  return {
    hero: { title: "", subtitle: "" },
    contact: {
      title: "",
      subtitle: "",
      items: Array.from({ length: 4 }, () => ({
        title: "",
        description: "",
        icon: "",
      })),
    },
    form: { title: "", subtitle: "" },
  };
}

function pageToFormState(page: CmsPage): KontaktFormState {
  const heroSection = page.sections?.find((s) => s.type === "hero");
  const contactSection = page.sections?.find((s) => s.type === "contact");
  const formSection = page.sections?.find((s) => s.type === "form");

  const contactItems: ContactItem[] = Array.from({ length: 4 }, (_, i) => {
    const item = contactSection?.items?.[i];
    return {
      title: item?.title ?? "",
      description: item?.description ?? "",
      icon: item?.icon ?? "",
    };
  });

  return {
    hero: {
      title: heroSection?.title ?? "",
      subtitle: heroSection?.subtitle ?? "",
    },
    contact: {
      title: contactSection?.title ?? "",
      subtitle: contactSection?.subtitle ?? "",
      items: contactItems,
    },
    form: {
      title: formSection?.title ?? "",
      subtitle: formSection?.subtitle ?? "",
    },
  };
}

export function KontaktForm({ page }: { page: CmsPage | null }) {
  const [form, setForm] = useState<KontaktFormState>(() =>
    page ? pageToFormState(page) : emptyState(),
  );

  function updateHero(field: keyof KontaktFormState["hero"], value: string) {
    setForm((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  }

  function updateContactTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      contact: { ...prev.contact, title: value },
    }));
  }

  function updateContactSubtitle(value: string) {
    setForm((prev) => ({
      ...prev,
      contact: { ...prev.contact, subtitle: value },
    }));
  }

  function updateContactItem(
    index: number,
    field: keyof ContactItem,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        items: prev.contact.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  }

  function updateFormSection(
    field: keyof KontaktFormState["form"],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      form: { ...prev.form, [field]: value },
    }));
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Titel</Label>
            <Input
              id="hero-title"
              value={form.hero.title}
              onChange={(e) => updateHero("title", e.target.value)}
              placeholder="Rubrik"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Underrubrik</Label>
            <Textarea
              id="hero-subtitle"
              value={form.hero.subtitle}
              onChange={(e) => updateHero("subtitle", e.target.value)}
              placeholder="Underrubrik"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card>
        <CardHeader>
          <CardTitle>Kontaktuppgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="contact-title">Sektionstitel</Label>
            <Input
              id="contact-title"
              value={form.contact.title}
              onChange={(e) => updateContactTitle(e.target.value)}
              placeholder="Sektionstitel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-subtitle">Sektionsunderrubrik</Label>
            <Textarea
              id="contact-subtitle"
              value={form.contact.subtitle}
              onChange={(e) => updateContactSubtitle(e.target.value)}
              placeholder="Sektionsunderrubrik"
              rows={2}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {form.contact.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Kontaktinfo {index + 1}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`contact-${index}-icon`}>Ikon</Label>
                  <Select
                    value={item.icon}
                    onValueChange={(value) =>
                      updateContactItem(index, "icon", value)
                    }
                  >
                    <SelectTrigger
                      id={`contact-${index}-icon`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Välj ikon" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_ICONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            <span>{opt.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`contact-${index}-title`}>Titel</Label>
                  <Input
                    id={`contact-${index}-title`}
                    value={item.title}
                    onChange={(e) =>
                      updateContactItem(index, "title", e.target.value)
                    }
                    placeholder="T.ex. E-post"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`contact-${index}-desc`}>Beskrivning</Label>
                  <Input
                    id={`contact-${index}-desc`}
                    value={item.description}
                    onChange={(e) =>
                      updateContactItem(index, "description", e.target.value)
                    }
                    placeholder="T.ex. info@example.com"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle>Formulär</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">Titel</Label>
            <Input
              id="form-title"
              value={form.form.title}
              onChange={(e) => updateFormSection("title", e.target.value)}
              placeholder="Formulärtitel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-subtitle">Underrubrik</Label>
            <Textarea
              id="form-subtitle"
              value={form.form.subtitle}
              onChange={(e) => updateFormSection("subtitle", e.target.value)}
              placeholder="Formulärbeskrivning"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
