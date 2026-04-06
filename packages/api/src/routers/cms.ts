import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { pages } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

// ---------------------------------------------------------------------------
// Shared section schema
// ---------------------------------------------------------------------------

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
  cta: z.object({ text: z.string(), href: z.string() }).optional(),
  imageUrl: z.string().optional(),
  order: z.number(),
});

// ---------------------------------------------------------------------------
// Input schemas (exported for reuse as server-function validators)
// ---------------------------------------------------------------------------

export const createPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  sections: z.array(sectionSchema).default([]),
  published: z.boolean().default(false),
});

export const updatePageSchema = z.object({
  slug: z.string(),
  title: z.string().optional(),
  sections: z.array(sectionSchema).optional(),
  published: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Get a published page by slug. */
export async function getPage(db: Database, slug: string) {
  return db.query.pages.findFirst({
    where: and(eq(pages.slug, slug), eq(pages.published, true)),
  });
}

/** Get a page by slug (any publish state — for admin). */
export async function getPageAdmin(db: Database, slug: string) {
  return db.query.pages.findFirst({
    where: eq(pages.slug, slug),
  });
}

export async function listPages(db: Database) {
  return db.query.pages.findMany({
    where: eq(pages.published, true),
  });
}

export async function createPage(
  db: Database,
  input: z.infer<typeof createPageSchema>,
) {
  const [page] = await db.insert(pages).values(input).returning();
  return page;
}

export async function updatePage(
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
