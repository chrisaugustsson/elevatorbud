import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@elevatorbud/ui/components/ui/tabs";
import { Switch } from "@elevatorbud/ui/components/ui/switch";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { toast } from "sonner";
import { StartsidaForm } from "../../components/cms/startsida-form";
import { OmOssForm } from "../../components/cms/om-oss-form";
import { TjansterForm } from "../../components/cms/tjanster-form";
import { KontaktForm } from "../../components/cms/kontakt-form";
import type { CmsSection } from "../../components/cms/startsida-form";

const pages = [
  { slug: "startsida", label: "Startsida" },
  { slug: "om-oss", label: "Om oss" },
  { slug: "tjanster", label: "Tjänster" },
  { slug: "kontakt", label: "Kontakt" },
] as const;

type PageSlug = (typeof pages)[number]["slug"];

export const Route = createFileRoute("/_authenticated/webbplats")({
  validateSearch: (search: Record<string, unknown>) => ({
    sida: (pages.some((p) => p.slug === search.sida)
      ? (search.sida as PageSlug)
      : "startsida") as PageSlug,
  }),
  component: Webbplats,
});

function Webbplats() {
  const { sida } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Webbplats</h1>
      <Tabs
        value={sida}
        onValueChange={(value) =>
          navigate({
            to: "/webbplats",
            search: { sida: value as PageSlug },
          })
        }
      >
        <TabsList>
          {pages.map((page) => (
            <TabsTrigger key={page.slug} value={page.slug}>
              {page.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {pages.map((page) => (
          <TabsContent key={page.slug} value={page.slug}>
            <PageTab slug={page.slug} label={page.label} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function PageTab({ slug, label }: { slug: string; label: string }) {
  const page = useQuery(api.cms.getPage, { slug });
  const createPage = useMutation(api.cms.createPage);
  const updatePage = useMutation(api.cms.updatePage);
  const [isSaving, setIsSaving] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (page) {
      setPublished(page.published);
    }
  }, [page]);

  async function handleSave(sections: CmsSection[]) {
    setIsSaving(true);
    try {
      if (page) {
        await updatePage({
          id: page._id,
          title: label,
          sections,
          published,
        });
      } else {
        await createPage({
          slug,
          title: label,
          sections,
          published,
        });
      }
      toast.success("Sidan har sparats");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunde inte spara sidan",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (page === undefined) {
    return (
      <div className="py-8 text-center text-muted-foreground">Laddar…</div>
    );
  }

  const formContent = (() => {
    switch (slug) {
      case "startsida":
        return <StartsidaForm page={page} onSave={handleSave} isSaving={isSaving} />;
      case "om-oss":
        return <OmOssForm page={page} onSave={handleSave} isSaving={isSaving} />;
      case "tjanster":
        return <TjansterForm page={page} onSave={handleSave} isSaving={isSaving} />;
      case "kontakt":
        return <KontaktForm page={page} onSave={handleSave} isSaving={isSaving} />;
      default:
        return (
          <p className="text-muted-foreground">
            Formulär för <strong>{label}</strong> kommer här.
          </p>
        );
    }
  })();

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{label}</h2>
        <div className="flex items-center gap-3">
          {published ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
              Publicerad
            </Badge>
          ) : (
            <Badge variant="secondary">Utkast</Badge>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id={`published-${slug}`}
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor={`published-${slug}`}>Publicerad</Label>
          </div>
        </div>
      </div>
      {formContent}
    </div>
  );
}
