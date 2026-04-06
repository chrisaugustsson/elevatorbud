import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedPages = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete existing pages
    const existingPages = await ctx.db.query("pages").collect();
    for (const page of existingPages) {
      await ctx.db.delete(page._id);
    }

    const now = Date.now();

    // -----------------------------------------------------------------------
    // STARTSIDA
    // -----------------------------------------------------------------------
    await ctx.db.insert("pages", {
      slug: "startsida",
      title: "Startsida",
      published: true,
      updatedAt: now,
      sections: [
        {
          id: "hero",
          type: "hero",
          title: "Ta kontroll över ditt hissbestånd",
          subtitle:
            "Hisskompetens är oberoende hisskonsulter som hjälper fastighetsägare att sänka kostnader, säkerställa kvalitet och planera framåt — utan bindningar till tillverkare eller serviceföretag.",
          cta: { text: "Boka kostnadsfri rådgivning", href: "/kontakt" },
          order: 0,
        },
        {
          id: "stats",
          type: "stats",
          items: [
            { title: "20+", description: "Års erfarenhet" },
            { title: "500+", description: "Genomförda projekt" },
            { title: "2 000+", description: "Hissar under rådgivning" },
            { title: "100%", description: "Oberoende" },
          ],
          order: 1,
        },
        {
          id: "logo-cloud",
          type: "logo-cloud",
          title:
            "Anlitade av ledande fastighetsägare och hotellkedjor",
          items: [
            { title: "Pandox" },
            { title: "Scandic" },
            { title: "Familjehotellen" },
            { title: "Gothia Towers" },
            { title: "Brf Fastigheter" },
            { title: "Wallenstam" },
            { title: "Riksbyggen" },
            { title: "HSB" },
          ],
          order: 2,
        },
        {
          id: "independence",
          type: "independence",
          title: "Helt oberoende — alltid på din sida",
          content:
            "Till skillnad från hissföretag och serviceföretag har vi inga bindningar till tillverkare eller leverantörer. Våra rekommendationer baseras enbart på vad som är bäst för dig som fastighetsägare — trygghet, säkerhet och kvalitet.",
          order: 3,
        },
        {
          id: "features",
          type: "features",
          title: "Så hjälper vi dig",
          subtitle:
            "Från upphandling och besiktning till projektledning och långsiktigt underhåll — vi finns med hela vägen.",
          items: [
            {
              icon: "Search",
              title: "Upphandling",
              description:
                "Vi hjälper dig att upphandla service, modernisering och nyinstallation av hissar. Oberoende rådgivning som säkerställer rätt kvalitet till rätt pris.",
            },
            {
              icon: "FileCheck",
              title: "Besiktning & kontroll",
              description:
                "Systematisk genomgång av ditt hissbestånd. Vi identifierar risker, brister och förbättringsmöjligheter — och prioriterar åtgärder.",
            },
            {
              icon: "Banknote",
              title: "Kostnadsanalys",
              description:
                "Detaljerad analys av dina hisskostnader med konkreta förslag på besparingar. Många kunder sparar 20–30% på sina hissavtal.",
            },
            {
              icon: "HardHat",
              title: "Projektledning",
              description:
                "Vi projektleder hissbyten, moderniseringar och nyinstallationer. Från förstudie till slutbesiktning — vi har koll på alla detaljer.",
            },
            {
              icon: "ShieldCheck",
              title: "Underhållsplanering",
              description:
                "Långsiktig underhållsplan som förlänger livslängden på dina hissar och förebygger kostsamma driftstopp.",
            },
            {
              icon: "Leaf",
              title: "Hållbarhet & energi",
              description:
                "Rätt underhåll och modernisering minskar energiförbrukningen. Vi hjälper dig göra hållbara val som också sänker driftkostnader.",
            },
          ],
          order: 4,
        },
        {
          id: "how-it-works",
          type: "how-it-works",
          title: "Så fungerar det",
          subtitle:
            "Oavsett om du är en stor fastighetsägare eller en liten bostadsrättsförening — processen är densamma.",
          items: [
            {
              icon: "01",
              title: "Kostnadsfritt samtal",
              description:
                "Vi lyssnar på dina behov och ger en första bedömning av ditt hissbestånd helt utan kostnad.",
            },
            {
              icon: "02",
              title: "Inventering & analys",
              description:
                "Vi kartlägger dina hissar, avtal och kostnader. Du får en tydlig bild av nuläget.",
            },
            {
              icon: "03",
              title: "Rekommendation & plan",
              description:
                "Baserat på analysen får du konkreta förslag — upphandling, modernisering eller underhållsplan.",
            },
            {
              icon: "04",
              title: "Genomförande & uppföljning",
              description:
                "Vi projektleder och kvalitetssäkrar. Efter avslutat projekt följer vi upp för att säkerställa resultat.",
            },
          ],
          order: 5,
        },
        {
          id: "team",
          type: "team",
          title: "Möt våra konsulter",
          subtitle:
            "Personlig kontakt och lång erfarenhet — du vet alltid vem du pratar med.",
          items: [
            {
              icon: "Hisskonsult",
              title: "Robin Plato",
              description:
                "Specialist inom upphandling och projektledning av hissinstallationer.",
            },
            {
              icon: "Hisskonsult",
              title: "Peter Börjesson",
              description:
                "Expert på besiktning, underhållsplanering och kostnadsoptimering.",
            },
          ],
          order: 6,
        },
        {
          id: "cta",
          type: "cta",
          title: "Bli av med onödiga hisskostnader",
          subtitle:
            "Boka ett kostnadsfritt samtal med en av våra konsulter. Vi ger dig en första bedömning och visar hur vi kan hjälpa dig.",
          cta: { text: "Boka kostnadsfri rådgivning", href: "/kontakt" },
          order: 7,
        },
      ],
    });

    // -----------------------------------------------------------------------
    // TJÄNSTER
    // -----------------------------------------------------------------------
    await ctx.db.insert("pages", {
      slug: "tjanster",
      title: "Tjänster",
      published: true,
      updatedAt: now,
      sections: [
        {
          id: "hero",
          type: "hero",
          title: "Tjänster för fastighetsägare",
          subtitle:
            "Från upphandling och besiktning till projektledning och långsiktigt underhåll — vi hjälper dig ta kontroll över ditt hissbestånd.",
          order: 0,
        },
        {
          id: "services",
          type: "services",
          title: "Våra tjänster",
          items: [
            {
              icon: "Search",
              title: "Upphandling",
              description:
                "Vi hjälper dig att upphandla service, modernisering och nyinstallation av hissar. Som oberoende konsulter har vi inga bindningar till tillverkare — vi säkerställer att du får rätt kvalitet till rätt pris.",
            },
            {
              icon: "FileCheck",
              title: "Besiktning",
              description:
                "Systematisk genomgång av ditt hissbestånd. Vi identifierar risker, brister och förbättringsmöjligheter — och ger dig en tydlig prioriteringslista.",
            },
            {
              icon: "Banknote",
              title: "Kostnadsanalys",
              description:
                "Detaljerad analys av dina nuvarande hisskostnader och avtal. Vi hittar besparingsmöjligheter och förhandlar bättre villkor — många kunder sparar 20–30% på sina hissavtal.",
            },
            {
              icon: "HardHat",
              title: "Projektledning",
              description:
                "Vi projektleder hissbyten, moderniseringar och nyinstallationer — från förstudie och upphandling till slutbesiktning. Erfarenhet från Gothia Towers till enskilda bostadsrättsföreningar.",
            },
            {
              icon: "ShieldCheck",
              title: "Underhållsplanering",
              description:
                "Långsiktig underhållsplan anpassad efter ditt hissbestånd. Rätt planerat underhåll förlänger livslängden på dina hissar och förebygger kostsamma driftstopp.",
            },
            {
              icon: "Leaf",
              title: "Hållbarhet",
              description:
                "Rätt underhåll och genomtänkt modernisering minskar energiförbrukningen avsevärt. Vi hjälper dig göra hållbara val som både sänker driftkostnader och bidrar till en bättre miljö.",
            },
          ],
          order: 1,
        },
        {
          id: "target-audiences",
          type: "target-audiences",
          title: "Vi hjälper alla typer av fastighetsägare",
          items: [
            {
              icon: "Building2",
              title: "Fastighetsbolag",
              description:
                "Stora bestånd med många hissar kräver systematik och översikt.",
            },
            {
              icon: "Hotel",
              title: "Hotell & konferens",
              description: "Driftsäkerhet är avgörande i gästmiljöer.",
            },
            {
              icon: "Home",
              title: "Bostadsrättsföreningar",
              description:
                "Ofta stora investeringar med liten erfarenhet.",
            },
            {
              icon: "Landmark",
              title: "Kommuner & regioner",
              description: "Krav på upphandling och transparens.",
            },
            {
              icon: "Construction",
              title: "Byggherrar",
              description:
                "Kravspecifikation och upphandling vid nybyggnation.",
            },
            {
              icon: "Briefcase",
              title: "Förvaltningsbolag",
              description:
                "Kunskap och resurser ni kanske saknar internt.",
            },
          ],
          order: 2,
        },
        {
          id: "cta",
          type: "cta",
          title: "Osäker på vad du behöver?",
          subtitle:
            "Boka ett kostnadsfritt samtal så hjälper vi dig identifiera var du kan spara pengar och förbättra säkerheten i ditt hissbestånd.",
          cta: { text: "Boka kostnadsfri rådgivning", href: "/kontakt" },
          order: 3,
        },
      ],
    });

    // -----------------------------------------------------------------------
    // OM OSS
    // -----------------------------------------------------------------------
    await ctx.db.insert("pages", {
      slug: "om-oss",
      title: "Om oss",
      published: true,
      updatedAt: now,
      sections: [
        {
          id: "hero",
          type: "hero",
          title: "Om Hisskompetens",
          subtitle:
            "Oberoende hisskonsulter sedan 2002. Vi hjälper fastighetsägare att ta kontroll över sitt hissbestånd — med trygghet, säkerhet och kvalitet i fokus.",
          order: 0,
        },
        {
          id: "mission",
          type: "mission",
          title: "Vårt uppdrag",
          content:
            "Hisskompetens grundades med en enkel insikt: fastighetsägare förtjänar oberoende rådgivning om sina hissar. Tillverkare och serviceföretag har egna intressen — vi har bara ditt. Sedan 2002 har vi hjälpt hundratals fastighetsägare att sänka kostnader, förbättra säkerheten och fatta bättre beslut om sina hissbestånd.",
          order: 1,
        },
        {
          id: "values",
          type: "values",
          title: "Våra värderingar",
          items: [
            {
              icon: "Target",
              title: "Oberoende",
              description:
                "Vi har inga bindningar till tillverkare, serviceföretag eller leverantörer. Våra rekommendationer baseras enbart på vad som är bäst för dig som fastighetsägare.",
            },
            {
              icon: "Eye",
              title: "Transparens",
              description:
                "Du får alltid tydlig redovisning av vad vi gör, varför vi gör det och vad det kostar. Inga dolda avgifter eller oklara avtal.",
            },
            {
              icon: "Users",
              title: "Personlig kontakt",
              description:
                "Du vet alltid vem du pratar med. Våra konsulter är tillgängliga direkt — inte via växel eller ärendesystem.",
            },
            {
              icon: "Award",
              title: "Kvalitet & säkerhet",
              description:
                "Varje rekommendation vi ger utgår från gällande regelverk och branschstandarder. Trygghet och säkerhet går alltid först.",
            },
          ],
          order: 2,
        },
        {
          id: "story",
          type: "story",
          title: "Vår historia",
          content:
            "Hisskompetens startade 2002 med en tydlig vision: att ge fastighetsägare tillgång till oberoende expertis inom hisshantering. Alltför ofta fattades stora investeringsbeslut utan ett oberoende perspektiv — och resultatet blev onödigt höga kostnader och undermålig kvalitet.\n\nSedan starten har vi byggt upp en bred erfarenhet som sträcker sig från stora hotellkomplex som Gothia Towers till enskilda bostadsrättsföreningar. Oavsett storlek på uppdrag är vår grundfilosofi densamma: oberoende rådgivning som sätter fastighetsägarens intressen först.\n\nIdag hanterar vi rådgivning för över 2 000 hissar och har genomfört fler än 500 projekt. Vi är stolta över det förtroende vi fått och fortsätter att utveckla vår verksamhet för att hjälpa fler fastighetsägare i Sverige.",
          items: [
            { title: "2002", description: "Grundat" },
            { title: "2 000+", description: "Hissar" },
            { title: "500+", description: "Projekt" },
          ],
          order: 3,
        },
      ],
    });

    // -----------------------------------------------------------------------
    // KONTAKT
    // -----------------------------------------------------------------------
    await ctx.db.insert("pages", {
      slug: "kontakt",
      title: "Kontakt",
      published: true,
      updatedAt: now,
      sections: [
        {
          id: "hero",
          type: "hero",
          title: "Kontakta oss",
          subtitle:
            "Har du frågor om våra tjänster eller vill boka en demonstration? Vi hjälper dig gärna.",
          order: 0,
        },
        {
          id: "contact",
          type: "contact",
          title: "Kontaktuppgifter",
          subtitle:
            "Tveka inte att höra av dig. Vi återkommer så snart vi kan.",
          items: [
            {
              icon: "Mail",
              title: "E-post",
              description: "info@hisskompetens.se",
            },
            {
              icon: "Phone",
              title: "Telefon",
              description: "08-123 456 78",
            },
            {
              icon: "MapPin",
              title: "Adress",
              description: "Stockholm, Sverige",
            },
            {
              icon: "Clock",
              title: "Öppettider",
              description: "Mån-Fre 08:00-17:00",
            },
          ],
          order: 1,
        },
        {
          id: "form",
          type: "form",
          title: "Skicka ett meddelande",
          subtitle:
            "Fyll i formuläret så kontaktar vi dig inom kort.",
          order: 2,
        },
      ],
    });

    return "Seeded 4 pages: startsida, tjanster, om-oss, kontakt";
  },
});
