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

export const stats = query({
  args: { organisation_id: v.optional(v.id("organisationer")) },
  handler: async (ctx, { organisation_id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    let hissar;
    if (organisation_id) {
      hissar = await ctx.db
        .query("hissar")
        .withIndex("by_organisation_id", (q) =>
          q.eq("organisation_id", organisation_id),
        )
        .collect();
    } else {
      hissar = await ctx.db.query("hissar").collect();
    }

    // Only count active elevators
    const aktiva = hissar.filter((h) => h.status === "aktiv");

    const currentYear = new Date().getFullYear();

    // Average age (only elevators with byggar set)
    const withByggar = aktiva.filter((h) => h.byggar !== undefined);
    const averageAge =
      withByggar.length > 0
        ? withByggar.reduce((sum, h) => sum + (currentYear - h.byggar!), 0) /
          withByggar.length
        : 0;

    // Modernization within 3 years
    const moderniseringInom3Ar = aktiva.filter((h) => {
      if (!h.rekommenderat_moderniserar) return false;
      const year = parseInt(h.rekommenderat_moderniserar, 10);
      if (isNaN(year)) return false;
      return year >= currentYear && year <= currentYear + 3;
    }).length;

    // Total budget current year
    const totalBudgetInnevarandeAr = aktiva
      .filter((h) => {
        if (!h.rekommenderat_moderniserar || !h.budget_belopp) return false;
        const year = parseInt(h.rekommenderat_moderniserar, 10);
        return year === currentYear;
      })
      .reduce((sum, h) => sum + (h.budget_belopp ?? 0), 0);

    // Count without modernization
    const utanModernisering = aktiva.filter((h) => {
      return !h.moderniserar || h.moderniserar === "Ej ombyggd";
    }).length;

    // Latest inventory date (most recent skapad_datum)
    const senastInventering =
      aktiva.length > 0
        ? Math.max(...aktiva.map((h) => h.skapad_datum))
        : null;

    return {
      totalAntal: aktiva.length,
      medelAlder: Math.round(averageAge * 10) / 10,
      moderniseringInom3Ar,
      totalBudgetInnevarandeAr,
      utanModernisering,
      senastInventering,
    };
  },
});

export const chartData = query({
  args: { organisation_id: v.optional(v.id("organisationer")) },
  handler: async (ctx, { organisation_id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    let hissar;
    if (organisation_id) {
      hissar = await ctx.db
        .query("hissar")
        .withIndex("by_organisation_id", (q) =>
          q.eq("organisation_id", organisation_id),
        )
        .collect();
    } else {
      hissar = await ctx.db.query("hissar").collect();
    }

    const aktiva = hissar.filter((h) => h.status === "aktiv");
    const currentYear = new Date().getFullYear();

    // Elevators per district
    const perDistrikt: Record<string, number> = {};
    for (const h of aktiva) {
      const key = h.distrikt || "Okänt";
      perDistrikt[key] = (perDistrikt[key] || 0) + 1;
    }

    // Age distribution (decade buckets)
    const ageDistribution: Record<string, number> = {};
    for (const h of aktiva) {
      if (h.byggar === undefined) {
        ageDistribution["Okänt"] = (ageDistribution["Okänt"] || 0) + 1;
      } else {
        const age = currentYear - h.byggar;
        let bucket: string;
        if (age < 10) bucket = "0-9 år";
        else if (age < 20) bucket = "10-19 år";
        else if (age < 30) bucket = "20-29 år";
        else if (age < 40) bucket = "30-39 år";
        else if (age < 50) bucket = "40-49 år";
        else bucket = "50+ år";
        ageDistribution[bucket] = (ageDistribution[bucket] || 0) + 1;
      }
    }

    // Elevator types
    const perHisstyp: Record<string, number> = {};
    for (const h of aktiva) {
      const key = h.hisstyp || "Okänt";
      perHisstyp[key] = (perHisstyp[key] || 0) + 1;
    }

    // Top-10 manufacturers
    const perFabrikat: Record<string, number> = {};
    for (const h of aktiva) {
      const key = h.fabrikat || "Okänt";
      perFabrikat[key] = (perFabrikat[key] || 0) + 1;
    }
    const topFabrikat = Object.entries(perFabrikat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Modernization timeline (2026-2045+)
    const moderniseringTidslinje: Record<string, number> = {};
    for (const h of aktiva) {
      if (!h.rekommenderat_moderniserar) continue;
      const year = parseInt(h.rekommenderat_moderniserar, 10);
      if (isNaN(year)) continue;
      const key = year >= 2045 ? "2045+" : String(year);
      moderniseringTidslinje[key] = (moderniseringTidslinje[key] || 0) + 1;
    }

    // Maintenance companies
    const perSkotselforetag: Record<string, number> = {};
    for (const h of aktiva) {
      const key = h.skotselforetag || "Okänt";
      perSkotselforetag[key] = (perSkotselforetag[key] || 0) + 1;
    }

    return {
      perDistrikt: Object.entries(perDistrikt).map(([name, count]) => ({
        name,
        count,
      })),
      ageDistribution: Object.entries(ageDistribution).map(
        ([name, count]) => ({ name, count }),
      ),
      perHisstyp: Object.entries(perHisstyp).map(([name, count]) => ({
        name,
        count,
      })),
      topFabrikat: topFabrikat.map(([name, count]) => ({ name, count })),
      moderniseringTidslinje: Object.entries(moderniseringTidslinje)
        .sort((a, b) => {
          if (a[0] === "2045+") return 1;
          if (b[0] === "2045+") return -1;
          return Number(a[0]) - Number(b[0]);
        })
        .map(([name, count]) => ({ name, count })),
      perSkotselforetag: Object.entries(perSkotselforetag).map(
        ([name, count]) => ({ name, count }),
      ),
    };
  },
});

export const dagensHissar = query({
  args: { todayStart: v.number() },
  handler: async (ctx, { todayStart }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const allHissar = await ctx.db.query("hissar").collect();

    const today = allHissar.filter((h) => {
      const createdToday =
        h.skapad_av === user._id && h.skapad_datum >= todayStart;
      const updatedToday =
        h.senast_uppdaterad_av === user._id &&
        h.senast_uppdaterad !== undefined &&
        h.senast_uppdaterad >= todayStart;
      return createdToday || updatedToday;
    });

    // Enrich with organisation name
    const results = await Promise.all(
      today.map(async (h) => {
        const org = await ctx.db.get(h.organisation_id);
        return {
          _id: h._id,
          hissnummer: h.hissnummer,
          adress: h.adress,
          organisationsnamn: org?.namn,
          skapad_datum: h.skapad_datum,
          senast_uppdaterad: h.senast_uppdaterad,
        };
      }),
    );

    return results;
  },
});

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
