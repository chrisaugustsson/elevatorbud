import { internalMutation, query } from "./_generated/server";
import { getCurrentUser } from "./auth";
import { v } from "convex/values";

// Clerk webhook payload - use v.any() since Clerk can add fields at any time
const clerkUserData = v.any();

export const me = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: clerkUserData },
  async handler(ctx, { data }) {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", data.id))
      .unique();

    const email =
      data.email_addresses.find((e: { id: string; email_address: string }) => e.id === data.primary_email_address_id)
        ?.email_address ?? data.email_addresses[0]?.email_address ?? "";

    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    if (existingUser === null) {
      await ctx.db.insert("users", {
        clerk_user_id: data.id,
        email,
        name,
        role: "customer",
        active: true,
        created_at: Date.now(),
      });
    } else {
      await ctx.db.patch(existingUser._id, {
        email,
        name,
        last_login: Date.now(),
      });
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerkUserId))
      .unique();

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, no user found for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});
