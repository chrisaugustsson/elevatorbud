import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, getCurrentUser } from "./auth";

const KATEGORI_FALT = [
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

async function autoAddForslagsvarden(
  ctx: { db: any },
  fields: Record<string, unknown>,
) {
  for (const kategori of KATEGORI_FALT) {
    const varde = fields[kategori];
    if (typeof varde !== "string" || varde === "") continue;

    const existing = await ctx.db
      .query("forslagsvarden")
      .withIndex("by_kategori", (q: any) => q.eq("kategori", kategori))
      .collect();

    const alreadyExists = existing.some(
      (f: any) => f.varde.toLowerCase() === varde.toLowerCase(),
    );

    if (!alreadyExists) {
      await ctx.db.insert("forslagsvarden", {
        kategori,
        varde,
        aktiv: true,
        skapad_datum: Date.now(),
      });
    }
  }
}

export const checkHissnummer = query({
  args: { hissnummer: v.string() },
  handler: async (ctx, { hissnummer }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    if (!hissnummer) return { exists: false };
    const existing = await ctx.db
      .query("hissar")
      .withIndex("by_hissnummer", (q) => q.eq("hissnummer", hissnummer))
      .unique();
    return { exists: !!existing };
  },
});

export const create = mutation({
  args: {
    // Identifiering
    hissnummer: v.string(),
    adress: v.optional(v.string()),
    hissbeteckning: v.optional(v.string()),
    distrikt: v.optional(v.string()),

    // Teknisk specifikation
    hisstyp: v.optional(v.string()),
    fabrikat: v.optional(v.string()),
    byggar: v.optional(v.number()),
    hastighet: v.optional(v.string()),
    lyfthojd: v.optional(v.string()),
    marklast: v.optional(v.string()),
    antal_plan: v.optional(v.number()),
    antal_dorrar: v.optional(v.number()),

    // Dörrar och korg
    typ_dorrar: v.optional(v.string()),
    genomgang: v.optional(v.boolean()),
    kollektiv: v.optional(v.string()),
    korgstorlek: v.optional(v.string()),
    dagoppning: v.optional(v.string()),
    barbeslag: v.optional(v.string()),
    dorrmaskin: v.optional(v.string()),

    // Maskineri
    drivsystem: v.optional(v.string()),
    upphangning: v.optional(v.string()),
    maskinplacering: v.optional(v.string()),
    typ_maskin: v.optional(v.string()),
    typ_styrsystem: v.optional(v.string()),

    // Besiktning och underhåll
    besiktningsorgan: v.optional(v.string()),
    besiktningsmanad: v.optional(v.string()),
    skotselforetag: v.optional(v.string()),
    schaktbelysning: v.optional(v.string()),

    // Modernisering
    moderniserar: v.optional(v.string()),
    garanti: v.optional(v.boolean()),
    rekommenderat_moderniserar: v.optional(v.string()),
    budget_belopp: v.optional(v.number()),
    atgarder_vid_modernisering: v.optional(v.string()),

    // Nödtelefon
    har_nodtelefon: v.optional(v.boolean()),
    nodtelefon_modell: v.optional(v.string()),
    nodtelefon_typ: v.optional(v.string()),
    behover_uppgradering: v.optional(v.boolean()),
    nodtelefon_pris: v.optional(v.number()),

    // Kommentarer
    kommentarer: v.optional(v.string()),

    // Organisation
    organisation_id: v.id("organisationer"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Validate hissnummer is unique
    const existing = await ctx.db
      .query("hissar")
      .withIndex("by_hissnummer", (q) => q.eq("hissnummer", args.hissnummer))
      .unique();

    if (existing) {
      throw new Error(
        `Hissnummer ${args.hissnummer} finns redan i registret`,
      );
    }

    // Auto-add new category values to forslagsvarden
    await autoAddForslagsvarden(ctx, args);

    // Insert with auto-set metadata fields
    return await ctx.db.insert("hissar", {
      ...args,
      status: "aktiv" as const,
      skapad_av: admin._id,
      skapad_datum: Date.now(),
    });
  },
});
