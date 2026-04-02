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

// Shared filter args schema for list and export queries
const filterArgs = {
  search: v.optional(v.string()),
  distrikt: v.optional(v.array(v.string())),
  hisstyp: v.optional(v.array(v.string())),
  fabrikat: v.optional(v.array(v.string())),
  skotselforetag: v.optional(v.array(v.string())),
  besiktningsorgan: v.optional(v.array(v.string())),
  byggarMin: v.optional(v.number()),
  byggarMax: v.optional(v.number()),
  moderniserad: v.optional(v.boolean()),
  status: v.optional(
    v.union(
      v.literal("aktiv"),
      v.literal("rivd"),
      v.literal("arkiverad"),
    ),
  ),
  organisation_id: v.optional(v.id("organisationer")),
};

// Shared filter logic used by both list and exportData queries
async function fetchAndFilter(
  ctx: any,
  args: {
    search?: string;
    distrikt?: string[];
    hisstyp?: string[];
    fabrikat?: string[];
    skotselforetag?: string[];
    besiktningsorgan?: string[];
    byggarMin?: number;
    byggarMax?: number;
    moderniserad?: boolean;
    status?: "aktiv" | "rivd" | "arkiverad";
    organisation_id?: any;
  },
) {
  let allHissar;
  if (args.organisation_id) {
    allHissar = await ctx.db
      .query("hissar")
      .withIndex("by_organisation_id", (q: any) =>
        q.eq("organisation_id", args.organisation_id!),
      )
      .collect();
  } else {
    allHissar = await ctx.db.query("hissar").collect();
  }

  const statusFilter = args.status ?? "aktiv";
  let filtered = allHissar.filter((h: any) => h.status === statusFilter);

  if (args.search) {
    const s = args.search.toLowerCase().trim();
    if (s) {
      filtered = filtered.filter(
        (h: any) =>
          h.hissnummer.toLowerCase().includes(s) ||
          (h.adress && h.adress.toLowerCase().includes(s)) ||
          (h.distrikt && h.distrikt.toLowerCase().includes(s)) ||
          (h.fabrikat && h.fabrikat.toLowerCase().includes(s)) ||
          (h.hisstyp && h.hisstyp.toLowerCase().includes(s)),
      );
    }
  }

  if (args.distrikt && args.distrikt.length > 0) {
    const set = new Set(args.distrikt.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.distrikt && set.has(h.distrikt.toLowerCase()),
    );
  }
  if (args.hisstyp && args.hisstyp.length > 0) {
    const set = new Set(args.hisstyp.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.hisstyp && set.has(h.hisstyp.toLowerCase()),
    );
  }
  if (args.fabrikat && args.fabrikat.length > 0) {
    const set = new Set(args.fabrikat.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.fabrikat && set.has(h.fabrikat.toLowerCase()),
    );
  }
  if (args.skotselforetag && args.skotselforetag.length > 0) {
    const set = new Set(args.skotselforetag.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.skotselforetag && set.has(h.skotselforetag.toLowerCase()),
    );
  }
  if (args.besiktningsorgan && args.besiktningsorgan.length > 0) {
    const set = new Set(args.besiktningsorgan.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) =>
        h.besiktningsorgan && set.has(h.besiktningsorgan.toLowerCase()),
    );
  }

  if (args.byggarMin !== undefined) {
    filtered = filtered.filter(
      (h: any) => h.byggar !== undefined && h.byggar >= args.byggarMin!,
    );
  }
  if (args.byggarMax !== undefined) {
    filtered = filtered.filter(
      (h: any) => h.byggar !== undefined && h.byggar <= args.byggarMax!,
    );
  }

  if (args.moderniserad !== undefined) {
    if (args.moderniserad) {
      filtered = filtered.filter(
        (h: any) => h.moderniserar && h.moderniserar !== "Ej ombyggd",
      );
    } else {
      filtered = filtered.filter(
        (h: any) => !h.moderniserar || h.moderniserar === "Ej ombyggd",
      );
    }
  }

  return filtered;
}

export const list = query({
  args: {
    ...filterArgs,
    // Sorting
    sort: v.optional(v.string()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    // Pagination
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const filtered = await fetchAndFilter(ctx, args);
    const totalCount = filtered.length;

    // Sorting
    const sortField = args.sort || "hissnummer";
    const sortOrder = args.order || "asc";
    filtered.sort((a: any, b: any) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];

      // Handle undefined values — push them to the end
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "sv");
      }

      return sortOrder === "desc" ? -cmp : cmp;
    });

    // Pagination
    const limit = args.limit ?? 25;
    const page = args.page ?? 0;
    const offset = page * limit;
    const pageData = filtered.slice(offset, offset + limit);

    // Enrich with organisation name
    const orgCache = new Map<string, string>();
    const results = await Promise.all(
      pageData.map(async (h: any) => {
        let orgNamn = orgCache.get(h.organisation_id);
        if (orgNamn === undefined) {
          const org = await ctx.db.get(h.organisation_id) as { namn: string } | null;
          orgNamn = org?.namn ?? "Okänd";
          orgCache.set(h.organisation_id, orgNamn!);
        }
        return {
          ...h,
          organisationsnamn: orgNamn,
        };
      }),
    );

    return {
      data: results,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },
});

export const exportData = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const filtered = await fetchAndFilter(ctx, args);

    // Sort by hissnummer for consistent export order
    filtered.sort((a: any, b: any) =>
      String(a.hissnummer).localeCompare(String(b.hissnummer), "sv"),
    );

    // Enrich with organisation name
    const orgCache = new Map<string, string>();
    const results = await Promise.all(
      filtered.map(async (h: any) => {
        let orgNamn = orgCache.get(h.organisation_id);
        if (orgNamn === undefined) {
          const org = await ctx.db.get(h.organisation_id) as { namn: string } | null;
          orgNamn = org?.namn ?? "Okänd";
          orgCache.set(h.organisation_id, orgNamn!);
        }
        return {
          ...h,
          organisationsnamn: orgNamn,
        };
      }),
    );

    return results;
  },
});

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

export const moderniseringTidslinje = query({
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

    // Count per recommended modernization year
    const perAr: Record<string, number> = {};
    for (const h of aktiva) {
      if (!h.rekommenderat_moderniserar) continue;
      const year = parseInt(h.rekommenderat_moderniserar, 10);
      if (isNaN(year)) continue;
      const key = String(year);
      perAr[key] = (perAr[key] || 0) + 1;
    }

    return Object.entries(perAr)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([ar, antal]) => ({ ar, antal }));
  },
});

export const moderniseringBudget = query({
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

    // Budget per year
    const perAr: Record<string, number> = {};
    // Budget per district
    const perDistrikt: Record<string, number> = {};
    // Budget per elevator type
    const perTyp: Record<string, number> = {};

    for (const h of aktiva) {
      if (!h.rekommenderat_moderniserar || !h.budget_belopp) continue;
      const year = parseInt(h.rekommenderat_moderniserar, 10);
      if (isNaN(year)) continue;

      const yearKey = String(year);
      perAr[yearKey] = (perAr[yearKey] || 0) + h.budget_belopp;

      const districtKey = h.distrikt || "Okänt";
      perDistrikt[districtKey] = (perDistrikt[districtKey] || 0) + h.budget_belopp;

      const typeKey = h.hisstyp || "Okänt";
      perTyp[typeKey] = (perTyp[typeKey] || 0) + h.budget_belopp;
    }

    return {
      perAr: Object.entries(perAr)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([ar, belopp]) => ({ ar, belopp })),
      perDistrikt: Object.entries(perDistrikt)
        .sort((a, b) => b[1] - a[1])
        .map(([namn, belopp]) => ({ namn, belopp })),
      perTyp: Object.entries(perTyp)
        .sort((a, b) => b[1] - a[1])
        .map(([namn, belopp]) => ({ namn, belopp })),
    };
  },
});

export const moderniseringPrioritetslista = query({
  args: {
    organisation_id: v.optional(v.id("organisationer")),
    arFran: v.optional(v.number()),
    arTill: v.optional(v.number()),
  },
  handler: async (ctx, { organisation_id, arFran, arTill }) => {
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

    // Filter to elevators with recommended modernization year
    const withYear = aktiva
      .filter((h) => {
        if (!h.rekommenderat_moderniserar) return false;
        const year = parseInt(h.rekommenderat_moderniserar, 10);
        if (isNaN(year)) return false;
        if (arFran !== undefined && year < arFran) return false;
        if (arTill !== undefined && year > arTill) return false;
        return true;
      })
      .sort((a, b) => {
        const ya = parseInt(a.rekommenderat_moderniserar!, 10);
        const yb = parseInt(b.rekommenderat_moderniserar!, 10);
        return ya - yb;
      });

    // Enrich with org name
    const orgCache = new Map<string, string>();
    return await Promise.all(
      withYear.map(async (h) => {
        let orgNamn = orgCache.get(String(h.organisation_id));
        if (orgNamn === undefined) {
          const org = await ctx.db.get(h.organisation_id);
          orgNamn = (org as { namn: string } | null)?.namn ?? "Okänd";
          orgCache.set(String(h.organisation_id), orgNamn);
        }
        return {
          _id: h._id,
          hissnummer: h.hissnummer,
          adress: h.adress,
          distrikt: h.distrikt,
          hisstyp: h.hisstyp,
          rekommenderat_moderniserar: h.rekommenderat_moderniserar,
          budget_belopp: h.budget_belopp,
          atgarder_vid_modernisering: h.atgarder_vid_modernisering,
          organisationsnamn: orgNamn,
        };
      }),
    );
  },
});

export const moderniseringAtgarder = query({
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

    // Count per modernization action
    const counts: Record<string, number> = {};
    for (const h of aktiva) {
      if (!h.atgarder_vid_modernisering) continue;
      const action = h.atgarder_vid_modernisering;
      counts[action] = (counts[action] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([atgard, antal]) => ({ atgard, antal }));
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
