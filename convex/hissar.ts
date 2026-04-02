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

export const get = query({
  args: { id: v.id("hissar") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    const hiss = await ctx.db.get(id);
    if (!hiss) throw new Error("Hissen hittades inte");
    return hiss;
  },
});

export const checkHissnummer = query({
  args: { hissnummer: v.string(), excludeId: v.optional(v.id("hissar")) },
  handler: async (ctx, { hissnummer, excludeId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    if (!hissnummer) return { exists: false };
    const existing = await ctx.db
      .query("hissar")
      .withIndex("by_hissnummer", (q) => q.eq("hissnummer", hissnummer))
      .unique();
    if (!existing) return { exists: false };
    // When editing, exclude the current hiss from the duplicate check
    if (excludeId && existing._id === excludeId) return { exists: false };
    return { exists: true };
  },
});

export const search = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    if (!search.trim()) return [];

    const searchLower = search.toLowerCase().trim();

    // Get all active elevators and filter by hissnummer or adress
    const allHissar = await ctx.db
      .query("hissar")
      .collect();

    const matches = allHissar
      .filter(
        (h) =>
          h.status === "aktiv" &&
          (h.hissnummer.toLowerCase().includes(searchLower) ||
            (h.adress && h.adress.toLowerCase().includes(searchLower))),
      )
      .slice(0, 20);

    // Enrich with organisation name
    const results = await Promise.all(
      matches.map(async (h) => {
        const org = await ctx.db.get(h.organisation_id);
        return {
          _id: h._id,
          hissnummer: h.hissnummer,
          adress: h.adress,
          organisationsnamn: org?.namn,
        };
      }),
    );

    return results;
  },
});

export const update = mutation({
  args: {
    id: v.id("hissar"),

    // Identifiering
    hissnummer: v.optional(v.string()),
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
    organisation_id: v.optional(v.id("organisationer")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const { id, ...fields } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Hissen hittades inte");

    // If hissnummer is changing, validate uniqueness
    if (fields.hissnummer && fields.hissnummer !== existing.hissnummer) {
      const duplicate = await ctx.db
        .query("hissar")
        .withIndex("by_hissnummer", (q) =>
          q.eq("hissnummer", fields.hissnummer!),
        )
        .unique();
      if (duplicate) {
        throw new Error(
          `Hissnummer ${fields.hissnummer} finns redan i registret`,
        );
      }
    }

    // Auto-add new category values to forslagsvarden
    await autoAddForslagsvarden(ctx, fields);

    // Patch with provided fields + auto-set metadata
    await ctx.db.patch(id, {
      ...fields,
      senast_uppdaterad_av: admin._id,
      senast_uppdaterad: Date.now(),
    });

    return id;
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
