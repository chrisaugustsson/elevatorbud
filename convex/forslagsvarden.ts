import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "./auth";

const KATEGORIER = [
  "hisstyp",
  "fabrikat",
  "distrikt",
  "skotselforetag",
  "besiktningsorgan",
  "hissbeteckning",
  "typ_dorrar",
  "kollektiv",
  "drivsystem",
  "maskinplacering",
  "atgarder_vid_modernisering",
] as const;

type Kategori = (typeof KATEGORIER)[number];

// Category names map directly to hissar field names
const KATEGORI_TILL_FALT: Record<Kategori, string> = {
  hisstyp: "hisstyp",
  fabrikat: "fabrikat",
  distrikt: "distrikt",
  skotselforetag: "skotselforetag",
  besiktningsorgan: "besiktningsorgan",
  hissbeteckning: "hissbeteckning",
  typ_dorrar: "typ_dorrar",
  kollektiv: "kollektiv",
  drivsystem: "drivsystem",
  maskinplacering: "maskinplacering",
  atgarder_vid_modernisering: "atgarder_vid_modernisering",
};

async function updateHissarField(
  ctx: { db: any },
  kategori: string,
  oldValue: string,
  newValue: string,
) {
  const fieldName = KATEGORI_TILL_FALT[kategori as Kategori];
  if (!fieldName) return;

  const allHissar = await ctx.db.query("hissar").collect();
  for (const hiss of allHissar) {
    if ((hiss as any)[fieldName] === oldValue) {
      await ctx.db.patch(hiss._id, { [fieldName]: newValue });
    }
  }
}

export const list = query({
  args: { kategori: v.optional(v.string()) },
  handler: async (ctx, { kategori }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Ej autentiserad");
    }

    if (kategori) {
      return await ctx.db
        .query("forslagsvarden")
        .withIndex("by_kategori", (q: any) => q.eq("kategori", kategori))
        .collect();
    }

    return await ctx.db.query("forslagsvarden").collect();
  },
});

export const create = mutation({
  args: {
    kategori: v.string(),
    varde: v.string(),
  },
  handler: async (ctx, { kategori, varde }) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("forslagsvarden", {
      kategori,
      varde,
      aktiv: true,
      skapad_datum: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("forslagsvarden"),
    varde: v.string(),
  },
  handler: async (ctx, { id, varde }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Förslagsvärdet hittades inte");
    }

    const oldValue = existing.varde;

    // Update the forslagsvarden record
    await ctx.db.patch(id, { varde });

    // Update all elevators that use the old value
    await updateHissarField(ctx, existing.kategori, oldValue, varde);

    return id;
  },
});

export const merge = mutation({
  args: {
    sourceId: v.id("forslagsvarden"),
    targetId: v.id("forslagsvarden"),
  },
  handler: async (ctx, { sourceId, targetId }) => {
    await requireAdmin(ctx);

    const source = await ctx.db.get(sourceId);
    const target = await ctx.db.get(targetId);
    if (!source || !target) {
      throw new Error("Förslagsvärdet hittades inte");
    }
    if (source.kategori !== target.kategori) {
      throw new Error("Kan bara slå ihop värden inom samma kategori");
    }

    // Update all elevators from source value to target value
    await updateHissarField(ctx, source.kategori, source.varde, target.varde);

    // Delete the source value
    await ctx.db.delete(sourceId);

    return targetId;
  },
});

export const deactivate = mutation({
  args: {
    id: v.id("forslagsvarden"),
  },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Förslagsvärdet hittades inte");
    }
    await ctx.db.patch(id, { aktiv: false });
    return id;
  },
});
