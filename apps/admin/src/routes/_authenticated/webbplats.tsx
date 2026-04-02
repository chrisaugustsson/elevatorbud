import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@elevatorbud/ui/components/ui/tabs";
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

  async function handleSave(sections: CmsSection[]) {
    setIsSaving(true);
    try {
      if (page) {
        await updatePage({
          id: page._id,
          title: label,
          sections,
        });
      } else {
        await createPage({
          slug,
          title: label,
          sections,
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

  if (slug === "startsida") {
    return (
      <div className="py-4">
        <StartsidaForm page={page} onSave={handleSave} isSaving={isSaving} />
      </div>
    );
  }

  if (slug === "om-oss") {
    return (
      <div className="py-4">
        <OmOssForm page={page} onSave={handleSave} isSaving={isSaving} />
      </div>
    );
  }

  if (slug === "tjanster") {
    return (
      <div className="py-4">
        <TjansterForm page={page} onSave={handleSave} isSaving={isSaving} />
      </div>
    );
  }

  if (slug === "kontakt") {
    return (
      <div className="py-4">
        <KontaktForm page={page} onSave={handleSave} isSaving={isSaving} />
      </div>
    );
  }

  return (
    <div className="py-4">
      <p className="text-muted-foreground">
        Formulär för <strong>{label}</strong> kommer här.
      </p>
    </div>
  );
}
