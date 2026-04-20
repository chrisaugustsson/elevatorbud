import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { pages } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/cms.ts)
// ---------------------------------------------------------------------------

// Allowlist URL schemes so a malicious/compromised admin can't store
// `javascript:` or `data:` values that would become stored-XSS the moment
// the landing page renders them into an `href` or `src`.
const safeHref = z
  .string()
  .refine(
    (v) => v === "" || /^(\/|https?:\/\/|mailto:|tel:)/i.test(v.trim()),
    "Länken måste börja med /, https://, http://, mailto: eller tel:",
  );

const safeImageUrl = z
  .string()
  .refine(
    (v) => v === "" || /^(\/|https?:\/\/)/i.test(v.trim()),
    "Bild-URL måste börja med / eller https://",
  );

const sectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      }),
    )
    .optional(),
  cta: z.object({ text: z.string(), href: safeHref }).optional(),
  imageUrl: safeImageUrl.optional(),
  order: z.number(),
});

const createPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  sections: z.array(sectionSchema).default([]),
  published: z.boolean().default(false),
});

const updatePageSchema = z.object({
  slug: z.string(),
  title: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
  published: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Inlined query logic — no org scoping.
// ---------------------------------------------------------------------------

async function getPageAdminFn(db: Database, slug: string) {
  return db.query.pages.findFirst({
    where: eq(pages.slug, slug),
  });
}

async function createPageFn(
  db: Database,
  input: z.infer<typeof createPageSchema>,
) {
  const [page] = await db.insert(pages).values(input).returning();
  return page;
}

async function updatePageFn(
  db: Database,
  input: z.infer<typeof updatePageSchema>,
) {
  const { slug, ...data } = input;
  const [page] = await db
    .update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pages.slug, slug))
    .returning();
  return page;
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getPageAdmin = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    return getPageAdminFn(context.db, data.slug);
  });

export const pageAdminOptions = (slug: string) =>
  queryOptions({
    queryKey: ["cms", "page", slug],
    queryFn: () => getPageAdmin({ data: { slug } }),
  });

export const createPage = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createPageSchema)
  .handler(async ({ data, context }) => {
    return createPageFn(context.db, data);
  });

export const updatePage = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updatePageSchema)
  .handler(async ({ data, context }) => {
    return updatePageFn(context.db, data);
  });
