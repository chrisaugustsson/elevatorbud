import { useState } from "react";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Loader2 } from "lucide-react";
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
import {
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  Building2,
  Phone,
} from "lucide-react";

export type CmsSection = {
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

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  sections: CmsSection[];
  published: boolean;
  updatedAt?: Date | null;
};

const FEATURE_ICONS = [
  { value: "ClipboardCheck", label: "ClipboardCheck", icon: ClipboardCheck },
  { value: "Wrench", label: "Wrench", icon: Wrench },
  { value: "BarChart3", label: "BarChart3", icon: BarChart3 },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Building2", label: "Building2", icon: Building2 },
  { value: "Phone", label: "Phone", icon: Phone },
] as const;

type SectionItem = { title: string; description: string; icon: string };

type StartsidaFormState = {
  hero: { title: string; subtitle: string; ctaText: string; ctaHref: string };
  features: {
    title: string;
    subtitle: string;
    items: SectionItem[];
  };
  stats: { items: Array<{ value: string; label: string }> };
  cta: { title: string; subtitle: string; ctaText: string; ctaHref: string };
};

function emptyState(): StartsidaFormState {
  return {
    hero: { title: "", subtitle: "", ctaText: "", ctaHref: "" },
    features: {
      title: "",
      subtitle: "",
      items: Array.from({ length: 6 }, () => ({
        title: "",
        description: "",
        icon: "",
      })),
    },
    stats: {
      items: Array.from({ length: 4 }, () => ({ value: "", label: "" })),
    },
    cta: { title: "", subtitle: "", ctaText: "", ctaHref: "" },
  };
}

function pageToFormState(page: CmsPage): StartsidaFormState {
  const heroSection = page.sections?.find((s) => s.type === "hero");
  const featuresSection = page.sections?.find((s) => s.type === "features");
  const statsSection = page.sections?.find((s) => s.type === "stats");
  const ctaSection = page.sections?.find((s) => s.type === "cta");

  const featureItems: SectionItem[] = Array.from({ length: 6 }, (_, i) => {
    const item = featuresSection?.items?.[i];
    return {
      title: item?.title ?? "",
      description: item?.description ?? "",
      icon: item?.icon ?? "",
    };
  });

  const statItems = Array.from({ length: 4 }, (_, i) => {
    const item = statsSection?.items?.[i];
    return {
      value: item?.title ?? "",
      label: item?.description ?? "",
    };
  });

  return {
    hero: {
      title: heroSection?.title ?? "",
      subtitle: heroSection?.subtitle ?? "",
      ctaText: heroSection?.cta?.text ?? "",
      ctaHref: heroSection?.cta?.href ?? "",
    },
    features: {
      title: featuresSection?.title ?? "",
      subtitle: featuresSection?.subtitle ?? "",
      items: featureItems,
    },
    stats: { items: statItems },
    cta: {
      title: ctaSection?.title ?? "",
      subtitle: ctaSection?.subtitle ?? "",
      ctaText: ctaSection?.cta?.text ?? "",
      ctaHref: ctaSection?.cta?.href ?? "",
    },
  };
}

function formStateToSections(form: StartsidaFormState): CmsSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      title: form.hero.title,
      subtitle: form.hero.subtitle,
      cta: { text: form.hero.ctaText, href: form.hero.ctaHref },
      order: 0,
    },
    {
      id: "features",
      type: "features",
      title: form.features.title,
      subtitle: form.features.subtitle,
      items: form.features.items.map((item) => ({
        title: item.title,
        description: item.description,
        icon: item.icon,
      })),
      order: 1,
    },
    {
      id: "stats",
      type: "stats",
      items: form.stats.items.map((item) => ({
        title: item.value,
        description: item.label,
      })),
      order: 2,
    },
    {
      id: "cta",
      type: "cta",
      title: form.cta.title,
      subtitle: form.cta.subtitle,
      cta: { text: form.cta.ctaText, href: form.cta.ctaHref },
      order: 3,
    },
  ];
}

export function StartsidaForm({
  page,
  onSave,
  isSaving,
}: {
  page: CmsPage | null;
  onSave: (sections: CmsSection[]) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<StartsidaFormState>(() =>
    page ? pageToFormState(page) : emptyState(),
  );

  function updateHero(field: keyof StartsidaFormState["hero"], value: string) {
    setForm((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  }

  function updateFeatures(
    field: keyof Pick<StartsidaFormState["features"], "title" | "subtitle">,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      features: { ...prev.features, [field]: value },
    }));
  }

  function updateFeatureItem(
    index: number,
    field: keyof SectionItem,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        items: prev.features.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  }

  function updateStatItem(
    index: number,
    field: "value" | "label",
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      stats: {
        items: prev.stats.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  }

  function updateCta(field: keyof StartsidaFormState["cta"], value: string) {
    setForm((prev) => ({ ...prev, cta: { ...prev.cta, [field]: value } }));
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hero-cta-text">CTA-text</Label>
              <Input
                id="hero-cta-text"
                value={form.hero.ctaText}
                onChange={(e) => updateHero("ctaText", e.target.value)}
                placeholder="Knapptext"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-cta-href">CTA-länk</Label>
              <Input
                id="hero-cta-href"
                value={form.hero.ctaHref}
                onChange={(e) => updateHero("ctaHref", e.target.value)}
                placeholder="/kontakt"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Section */}
      <Card>
        <CardHeader>
          <CardTitle>Funktioner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="features-title">Sektionstitel</Label>
              <Input
                id="features-title"
                value={form.features.title}
                onChange={(e) => updateFeatures("title", e.target.value)}
                placeholder="Sektionstitel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features-subtitle">Sektionsunderrubrik</Label>
              <Textarea
                id="features-subtitle"
                value={form.features.subtitle}
                onChange={(e) => updateFeatures("subtitle", e.target.value)}
                placeholder="Sektionsunderrubrik"
                rows={2}
              />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {form.features.items.map((item, index) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border p-4"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  Funktion {index + 1}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`feature-${index}-icon`}>Ikon</Label>
                  <Select
                    value={item.icon}
                    onValueChange={(value) =>
                      updateFeatureItem(index, "icon", value)
                    }
                  >
                    <SelectTrigger id={`feature-${index}-icon`} className="w-full">
                      <SelectValue placeholder="Välj ikon" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_ICONS.map((opt) => (
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
                  <Label htmlFor={`feature-${index}-title`}>Titel</Label>
                  <Input
                    id={`feature-${index}-title`}
                    value={item.title}
                    onChange={(e) =>
                      updateFeatureItem(index, "title", e.target.value)
                    }
                    placeholder="Funktionstitel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`feature-${index}-desc`}>Beskrivning</Label>
                  <Textarea
                    id={`feature-${index}-desc`}
                    value={item.description}
                    onChange={(e) =>
                      updateFeatureItem(index, "description", e.target.value)
                    }
                    placeholder="Beskrivning"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {form.stats.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Statistik {index + 1}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`stat-${index}-value`}>Värde</Label>
                  <Input
                    id={`stat-${index}-value`}
                    value={item.value}
                    onChange={(e) =>
                      updateStatItem(index, "value", e.target.value)
                    }
                    placeholder="1 000+"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`stat-${index}-label`}>Etikett</Label>
                  <Input
                    id={`stat-${index}-label`}
                    value={item.label}
                    onChange={(e) =>
                      updateStatItem(index, "label", e.target.value)
                    }
                    placeholder="Hissar i systemet"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card>
        <CardHeader>
          <CardTitle>Call to Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cta-title">Titel</Label>
            <Input
              id="cta-title"
              value={form.cta.title}
              onChange={(e) => updateCta("title", e.target.value)}
              placeholder="Rubrik"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cta-subtitle">Underrubrik</Label>
            <Textarea
              id="cta-subtitle"
              value={form.cta.subtitle}
              onChange={(e) => updateCta("subtitle", e.target.value)}
              placeholder="Underrubrik"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta-cta-text">CTA-text</Label>
              <Input
                id="cta-cta-text"
                value={form.cta.ctaText}
                onChange={(e) => updateCta("ctaText", e.target.value)}
                placeholder="Knapptext"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-cta-href">CTA-länk</Label>
              <Input
                id="cta-cta-href"
                value={form.cta.ctaHref}
                onChange={(e) => updateCta("ctaHref", e.target.value)}
                placeholder="/kontakt"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => onSave(formStateToSections(form))}
          disabled={isSaving}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Spara
        </Button>
      </div>
    </div>
  );
}
