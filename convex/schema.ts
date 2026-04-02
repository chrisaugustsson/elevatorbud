import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  hissar: defineTable({
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

    // Metadata
    organisation_id: v.id("organisationer"),
    status: v.union(
      v.literal("aktiv"),
      v.literal("rivd"),
      v.literal("arkiverad"),
    ),
    skapad_av: v.optional(v.id("anvandare")),
    skapad_datum: v.number(),
    senast_uppdaterad_av: v.optional(v.id("anvandare")),
    senast_uppdaterad: v.optional(v.number()),
  })
    .index("by_organisation_id", ["organisation_id"])
    .index("by_hissnummer", ["hissnummer"]),

  organisationer: defineTable({
    namn: v.string(),
    organisationsnummer: v.optional(v.string()),
    kontaktperson: v.optional(v.string()),
    telefonnummer: v.optional(v.string()),
    email: v.optional(v.string()),
  }),

  anvandare: defineTable({
    clerk_user_id: v.string(),
    email: v.string(),
    namn: v.string(),
    roll: v.union(v.literal("admin"), v.literal("kund")),
    organisation_id: v.optional(v.id("organisationer")),
    aktiv: v.boolean(),
    skapad_datum: v.number(),
    senaste_login: v.optional(v.number()),
  }).index("by_clerk_user_id", ["clerk_user_id"]),

  forslagsvarden: defineTable({
    kategori: v.string(),
    varde: v.string(),
    aktiv: v.boolean(),
    skapad_datum: v.number(),
  }).index("by_kategori", ["kategori"]),

  pages: defineTable({
    slug: v.string(),
    title: v.string(),
    sections: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        title: v.optional(v.string()),
        subtitle: v.optional(v.string()),
        content: v.optional(v.string()),
        items: v.optional(
          v.array(
            v.object({
              title: v.optional(v.string()),
              description: v.optional(v.string()),
              icon: v.optional(v.string()),
            }),
          ),
        ),
        cta: v.optional(
          v.object({
            text: v.string(),
            href: v.string(),
          }),
        ),
        imageUrl: v.optional(v.string()),
        order: v.number(),
      }),
    ),
    published: v.boolean(),
    updatedAt: v.optional(v.number()),
  }).index("by_slug", ["slug"]),
});
