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
import { Target, Eye, Users, Award } from "lucide-react";
import type { CmsPage } from "./startsida-form";

const VALUE_ICONS = [
  { value: "Target", label: "Target", icon: Target },
  { value: "Eye", label: "Eye", icon: Eye },
  { value: "Users", label: "Users", icon: Users },
  { value: "Award", label: "Award", icon: Award },
] as const;

type ValueItem = { title: string; description: string; icon: string };

type OmOssFormState = {
  hero: { title: string; subtitle: string };
  mission: { title: string; content: string };
  values: { title: string; items: ValueItem[] };
  story: { title: string; content: string };
};

function emptyState(): OmOssFormState {
  return {
    hero: { title: "", subtitle: "" },
    mission: { title: "", content: "" },
    values: {
      title: "",
      items: Array.from({ length: 4 }, () => ({
        title: "",
        description: "",
        icon: "",
      })),
    },
    story: { title: "", content: "" },
  };
}

function pageToFormState(page: CmsPage): OmOssFormState {
  const heroSection = page.sections?.find((s) => s.type === "hero");
  const missionSection = page.sections?.find((s) => s.type === "mission");
  const valuesSection = page.sections?.find((s) => s.type === "values");
  const storySection = page.sections?.find((s) => s.type === "story");

  const valueItems: ValueItem[] = Array.from({ length: 4 }, (_, i) => {
    const item = valuesSection?.items?.[i];
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
    mission: {
      title: missionSection?.title ?? "",
      content: missionSection?.content ?? "",
    },
    values: {
      title: valuesSection?.title ?? "",
      items: valueItems,
    },
    story: {
      title: storySection?.title ?? "",
      content: storySection?.content ?? "",
    },
  };
}

export function OmOssForm({ page }: { page: CmsPage | null }) {
  const [form, setForm] = useState<OmOssFormState>(() =>
    page ? pageToFormState(page) : emptyState(),
  );

  function updateHero(field: keyof OmOssFormState["hero"], value: string) {
    setForm((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  }

  function updateMission(
    field: keyof OmOssFormState["mission"],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      mission: { ...prev.mission, [field]: value },
    }));
  }

  function updateValuesTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      values: { ...prev.values, title: value },
    }));
  }

  function updateValueItem(
    index: number,
    field: keyof ValueItem,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        items: prev.values.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      },
    }));
  }

  function updateStory(field: keyof OmOssFormState["story"], value: string) {
    setForm((prev) => ({ ...prev, story: { ...prev.story, [field]: value } }));
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

      {/* Mission Section */}
      <Card>
        <CardHeader>
          <CardTitle>Mission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mission-title">Titel</Label>
            <Input
              id="mission-title"
              value={form.mission.title}
              onChange={(e) => updateMission("title", e.target.value)}
              placeholder="Missionstitel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mission-content">Innehåll</Label>
            <Textarea
              id="mission-content"
              value={form.mission.content}
              onChange={(e) => updateMission("content", e.target.value)}
              placeholder="Missionstext"
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Values Section */}
      <Card>
        <CardHeader>
          <CardTitle>Värderingar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="values-title">Sektionstitel</Label>
            <Input
              id="values-title"
              value={form.values.title}
              onChange={(e) => updateValuesTitle(e.target.value)}
              placeholder="Sektionstitel"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {form.values.items.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Värdering {index + 1}
                </p>
                <div className="space-y-2">
                  <Label htmlFor={`value-${index}-icon`}>Ikon</Label>
                  <Select
                    value={item.icon}
                    onValueChange={(value) =>
                      updateValueItem(index, "icon", value)
                    }
                  >
                    <SelectTrigger
                      id={`value-${index}-icon`}
                      className="w-full"
                    >
                      <SelectValue placeholder="Välj ikon" />
                    </SelectTrigger>
                    <SelectContent>
                      {VALUE_ICONS.map((opt) => (
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
                  <Label htmlFor={`value-${index}-title`}>Titel</Label>
                  <Input
                    id={`value-${index}-title`}
                    value={item.title}
                    onChange={(e) =>
                      updateValueItem(index, "title", e.target.value)
                    }
                    placeholder="Värderingstitel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`value-${index}-desc`}>Beskrivning</Label>
                  <Textarea
                    id={`value-${index}-desc`}
                    value={item.description}
                    onChange={(e) =>
                      updateValueItem(index, "description", e.target.value)
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

      {/* Story Section */}
      <Card>
        <CardHeader>
          <CardTitle>Vår historia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="story-title">Titel</Label>
            <Input
              id="story-title"
              value={form.story.title}
              onChange={(e) => updateStory("title", e.target.value)}
              placeholder="Historietitel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="story-content">Innehåll</Label>
            <Textarea
              id="story-content"
              value={form.story.content}
              onChange={(e) => updateStory("content", e.target.value)}
              placeholder="Skriv er historia här. Separera stycken med en tom rad."
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Separera stycken med en tom rad (dubbel radbrytning).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
