import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createDb } from "@elevatorbud/db";
import * as cms from "@elevatorbud/api/cms";
import * as contact from "@elevatorbud/api/contact";

let _db: ReturnType<typeof createDb> | null = null;
function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

export const getPage = createServerFn()
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    return cms.getPage(getDb(), data.slug);
  });

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator(contact.submitContactSchema)
  .handler(async ({ data }) => {
    return contact.submit(getDb(), data);
  });
