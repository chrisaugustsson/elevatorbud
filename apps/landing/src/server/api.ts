import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withDb, withDbHttp } from "@elevatorbud/db";
import { pages, contactSubmissions } from "@elevatorbud/db/schema";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Fails closed: any verification failure — missing secret, network error,
// Cloudflare reporting the token as invalid/expired/already-used — throws.
// The UI resets the widget on error so a retry uses a fresh token.
async function verifyTurnstile(token: string, remoteIp: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("Captcha-verifiering är inte konfigurerad");
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) {
    throw new Error("Kunde inte verifiera captcha");
  }
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) {
    throw new Error("Captcha-verifiering misslyckades");
  }
}

const submitContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
  turnstileToken: z.string().min(1),
});

export const getPage = createServerFn()
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    return withDbHttp((db) =>
      db.query.pages.findFirst({
        where: and(eq(pages.slug, data.slug), eq(pages.published, true)),
      }),
    );
  });

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator(submitContactSchema)
  .handler(async ({ data }) => {
    const req = getRequest();
    const remoteIp =
      req?.headers.get("cf-connecting-ip") ??
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    await verifyTurnstile(data.turnstileToken, remoteIp);

    const { turnstileToken: _token, ...payload } = data;
    return withDb(async (db) => {
      const [submission] = await db
        .insert(contactSubmissions)
        .values({ ...payload, status: "new" })
        .returning();
      return submission;
    });
  });
