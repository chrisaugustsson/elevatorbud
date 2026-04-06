import { createFileRoute } from "@tanstack/react-router";
import { Webhook } from "svix";
import { createDb } from "@elevatorbud/db";
import { users } from "@elevatorbud/db/schema";
import { eq } from "drizzle-orm";

let _db: ReturnType<typeof createDb> | null = null;
function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

type ClerkUserEvent = {
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
  };
  type: "user.created" | "user.updated" | "user.deleted";
};

async function handleWebhook(request: Request): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const wh = new Webhook(secret);
  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let evt: ClerkUserEvent;
  try {
    evt = wh.verify(payload, headers) as ClerkUserEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  const { type, data } = evt;
  const db = getDb();

  if (type === "user.created" || type === "user.updated") {
    const email = data.email_addresses[0]?.email_address ?? "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    const existing = await db.query.users.findFirst({
      where: eq(users.clerkUserId, data.id),
    });

    if (existing) {
      await db
        .update(users)
        .set({ email, name })
        .where(eq(users.id, existing.id));
    } else {
      await db
        .insert(users)
        .values({ clerkUserId: data.id, email, name, role: "customer", active: true });
    }
  }

  if (type === "user.deleted") {
    const existing = await db.query.users.findFirst({
      where: eq(users.clerkUserId, data.id),
    });
    if (existing) {
      await db.delete(users).where(eq(users.id, existing.id));
    }
  }

  return new Response("OK", { status: 200 });
}

export const Route = createFileRoute("/api/clerk-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => handleWebhook(request),
    },
  },
});
