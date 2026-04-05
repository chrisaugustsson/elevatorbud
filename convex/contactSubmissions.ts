import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./auth";
import { sendContactNotification } from "./email";

export const insertSubmission = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contactSubmissions", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: args.message,
      status: "new",
      createdAt: Date.now(),
    });
  },
});

export const submit = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    turnstileToken: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      throw new Error("TURNSTILE_SECRET_KEY is not configured");
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: args.turnstileToken,
        }),
      },
    );
    const result = (await res.json()) as { success: boolean };

    if (!result.success) {
      throw new Error("Captcha-verifiering misslyckades");
    }

    await ctx.runMutation(internal.contactSubmissions.insertSubmission, {
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: args.message,
    });

    await sendContactNotification({
      name: args.name,
      email: args.email,
      phone: args.phone,
      message: args.message,
    });
  },
});

export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("new"), v.literal("read"), v.literal("archived")),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status) {
      return await ctx.db
        .query("contactSubmissions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }
    return await ctx.db
      .query("contactSubmissions")
      .order("desc")
      .take(100);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const unread = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .take(100);
    return unread.length;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("contactSubmissions"),
    status: v.union(v.literal("new"), v.literal("read"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { status: args.status });
  },
});
