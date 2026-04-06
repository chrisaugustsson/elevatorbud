import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createDb } from "@elevatorbud/db";
import { pages, contactSubmissions } from "@elevatorbud/db/schema";

let _db: ReturnType<typeof createDb> | null = null;
function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

const submitContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
});

export const getPage = createServerFn()
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    return getDb().query.pages.findFirst({
      where: and(eq(pages.slug, data.slug), eq(pages.published, true)),
    });
  });

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator(submitContactSchema)
  .handler(async ({ data }) => {
    const [submission] = await getDb()
      .insert(contactSubmissions)
      .values({ ...data, status: "new" })
      .returning();
    return submission;
  });
