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
import {
  ClipboardCheck,
  Wrench,
  BarChart3,
  Shield,
  Building2,
  Phone,
} from "lucide-react";
import type { CmsPage } from "./startsida-form";

const SERVICE_ICONS = [
  { value: "ClipboardCheck", label: "ClipboardCheck", icon: ClipboardCheck },
  { value: "Wrench", label: "Wrench", icon: Wrench },
  { value: "BarChart3", label: "BarChart3", icon: BarChart3 },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Building2", label: "Building2", icon: Building2 },
  { value: "Phone", label: "Phone", icon: Phone },
] as const;

type ServiceItem = { title: string; description: string; icon: string };

type TjansterFormState = {
  hero: { title: string; subtitle: string };
  services: { items: ServiceItem[] };
};

function emptyState(): TjansterFormState {
  return {
    hero: { title: "", subtitle: "" },
    services: {
      items: Array.from({ length: 6 }, () => ({
        title: "",
        description: "",
        icon: "",
      })),
    },
  };
}

function pageToFormState(page: CmsPage): TjansterFormState {
  const heroSection = page.sections?.find((s) => s.type === "hero");
  const servicesSection = page.sections?.find((s) => s.type === "services");

  const serviceItems: ServiceItem[] = Array.from({ length: 6 }, (_, i) => {
    const item = servicesSection?.items?.[i];
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
    services: { items: serviceItems },
  };
}

export function TjansterForm({ page }: { page: CmsPage | null }) {
  const [form, setForm] = useState<TjansterFormState>(() =>
    page ? pageToFormState(page) : emptyState(),
  );

  function updateHero(field: keyof TjansterFormState["hero"], value: string) {
    setForm((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  }

  function updateServiceItem(
    index: number,
    field: keyof ServiceItem,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      services: {
        items: prev.services.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
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

      {/* Services Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tjänster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {form.services.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Tjänst {index + 1}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`service-${index}-icon`}>Ikon</Label>
                  <Select
                    value={item.icon}
                    onValueChange={(value) =>
                      updateServiceItem(index, "icon", value)
                    }
                  >
                    <SelectTrigger
                      id={`service-${index}-icon`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Välj ikon" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_ICONS.map((opt) => (
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
                  <Label htmlFor={`service-${index}-title`}>Titel</Label>
                  <Input
                    id={`service-${index}-title`}
                    value={item.title}
                    onChange={(e) =>
                      updateServiceItem(index, "title", e.target.value)
                    }
                    placeholder="Tjänsttitel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`service-${index}-desc`}>Beskrivning</Label>
                  <Textarea
                    id={`service-${index}-desc`}
                    value={item.description}
                    onChange={(e) =>
                      updateServiceItem(index, "description", e.target.value)
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
    </div>
  );
}
