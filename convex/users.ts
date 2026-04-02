import { internalMutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";
import type { UserJSON } from "@clerk/backend";
import { v, type Validator } from "convex/values";

export const me = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> },
  async handler(ctx, { data }) {
    const existingUser = await ctx.db
      .query("anvandare")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", data.id))
      .unique();

    const email =
      data.email_addresses.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ?? data.email_addresses[0]?.email_address ?? "";

    const namn =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    if (existingUser === null) {
      await ctx.db.insert("anvandare", {
        clerk_user_id: data.id,
        email,
        namn,
        roll: "kund",
        aktiv: true,
        skapad_datum: Date.now(),
      });
    } else {
      await ctx.db.patch(existingUser._id, {
        email,
        namn,
        senaste_login: Date.now(),
      });
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await ctx.db
      .query("anvandare")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerkUserId))
      .unique();

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, no anvandare found for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});
