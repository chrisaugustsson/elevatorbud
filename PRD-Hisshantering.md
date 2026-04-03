# PRD: Hisshanteringssystem

**Version:** 3.0
**Datum:** 2026-04-02
**Status:** Utkast

---

## 1. Bakgrund och problemformulering

### Nuläge

Hisskompetens är ett konsultföretag som besiktigar och inventerar hissar åt fastighetsbolag. Konsulterna besöker hissar ute i fält, dokumenterar teknisk information och sammanställer allt i Excel-ark som sedan skickas till kunden. Kunden (t.ex. Bostadsbolaget med 683 hissar) använder detta underlag för att fatta beslut om modernisering, underhåll och budget.

### Problem

1. **Fältarbetet är analogt** — Konsulten skriver ner information manuellt (eller i Excel på en laptop) och matar in det i huvudfilen i efterhand. Det är dubbelarbete och felkällan är stor.
2. **Informationsöverbelastning för kunden** — Kunden får ett Excel-ark med 42 kolumner och hundratals rader. Det är närmast omöjligt att snabbt hitta relevant information eller se mönster.
3. **Ingen levande data** — Excelfilen är en ögonblicksbild. Mellan leveranser finns inget sätt för kunden att se aktuell status.
4. **Svårt att dela och presentera** — Excel-formatet kräver manuell bearbetning innan det kan presenteras för ledning eller i möten.
5. **Risk att förlora data i fält** — Om konsulten tappar uppkoppling (t.ex. i ett hissschakt) och inte har sparat kan inmatad data gå förlorad.

### Möjlighet

Ett webbaserat system med två perspektiv: en mobilanpassad fältapp där konsulten registrerar hissdata på plats med offline-stöd, och en kundportal där fastighetsbolaget kan logga in och se sin hissflotta i realtid — med dashboards, sök och filtrering istället för rå Excel-data.

---

## 2. Vision och mål

### Vision

Hisskompetens levererar inte bara en Excel-fil — de levererar en levande tjänst. Konsulten registrerar data direkt vid hissen, och kunden ser resultatet i sin portal inom sekunder.

### Mål

| Mål | Mätbart kriterium |
|---|---|
| Eliminera dubbelinmatning | Konsulten matar in data en gång, direkt i fält — ingen efterbearbetning i Excel |
| Formulärpersistens | Pågående inmatning förloras aldrig — formulärutkast sparas automatiskt till localStorage |
| Snabb åtkomst för kund | Kunden hittar information om en specifik hiss inom 5 sekunder |
| Bättre beslutsunderlag | Kunden kan se moderniseringsbehov, budget och prioriteringar i dashboards utan att be konsulten ta fram det |
| Skalbarhet | Systemet stödjer flera kunder (fastighetsbolag) från start |

---

## 3. Användare och roller

### 3.1 Admin (Hisskompetens)

- **Beskrivning:** Konsulter och administratörer på Hisskompetens. Besiktigar hissar i fält och hanterar systemet. Besöker ofta 5-15 hissar per dag. Arbetar med mobiltelefon eller surfplatta på plats.
- **Behov:** Snabb inmatning av hissdata i fält (fungerar offline), hantera kunder och organisationer, importera data, se alla kunders hissar.
- **Teknisk nivå:** Medel. Vana vid mobiler och appar men inte utvecklare.
- **Miljö:** Ofta begränsad uppkoppling (källare, hissschakt, maskinrum) vid fältarbete. Desktop vid administration.

### 3.2 Kund

- **Beskrivning:** Fastighetschef, driftansvarig eller liknande hos fastighetsbolaget (t.ex. Bostadsbolaget). Har enbart åtkomst till sin egen organisations data.
- **Behov:** Söka bland sina hissar, se dashboards med KPI:er, filtrera och exportera data. Läsbehörighet — kunden kan inte skapa eller redigera hissar, och kan inte hantera användare. Alla kundkonton skapas och hanteras av admin (Hisskompetens).
- **Teknisk nivå:** Låg till medel. Ska inte kräva utbildning.
- **Miljö:** Desktop-dator på kontoret, ibland surfplatta.

### Rollmatris

| Funktion | Admin | Kund |
|---|---|---|
| Skapa/redigera hiss | Ja (alla organisationer) | Nej |
| Visa hissar | Alla organisationer | Enbart sin organisation |
| Dashboards & KPI:er | Alla organisationer | Enbart sin organisation |
| Hantera organisationer | Ja | Nej |
| Hantera användare | Ja | Nej (ingen självbetjäning) |
| Importera Excel | Ja | Nej |
| Exportera data | Ja | Ja (sin data) |
| Fältapp (offline) | Ja | Nej |

---

## 4. Datamodell

### 4.1 Organisation (kund/fastighetsbolag)

| Fält | Typ | Exempel |
|---|---|---|
| id | UUID (PK) | — |
| namn | string | "Bostadsbolaget" |
| organisationsnummer | string | "969676-6923" |
| kontaktperson | string | — |
| telefonnummer | string | — |
| email | string | — |

### 4.2 Hiss (huvudentitet)

Varje hiss tillhör en organisation. Fälten grupperas i logiska domäner:

#### Identifiering
| Fält | Typ | Exempel | Obligatoriskt |
|---|---|---|---|
| id | UUID (PK) | — | Auto |
| organisation_id | UUID (FK) | — | Ja |
| hissnummer | string (unikt) | "L7787113" | Ja |
| hissadress | string | "Memoargatan 18" | Ja |
| hissbeteckning | string | "Personhiss" | Nej |
| distrikt | string | "Väster" | Nej |
| fastighetsbeteckning | string | — | Nej |

#### Teknisk specifikation
| Fält | Typ | Exempel |
|---|---|---|
| hisstyp | string (combobox) | "Linhiss", "Hydraulhiss", "MRL linhiss" |
| fabrikat | string | "Kone", "Asea", "Otis" |
| byggar | integer/null | 1962 |
| hastighet_ms | float | 0.6 |
| lyfthojd_m | float | 20 |
| marklast | string | "950 kg / 12 pers" |
| antal_plan | integer | 10 |
| antal_dorrar | integer | 10 |
| typ_dorrar | string | "Automatdörrar" |
| genomgang | boolean | true/false |
| kollektiv | string | "Nedkollektiv" |
| korgstorlek_b | integer (mm) | 1400 |
| korgstorlek_d | integer (mm) | 2400 |
| korgstorlek_h | integer (mm) | 2200 |
| dagoppning_b | integer (mm) | 1300 |
| dagoppning_h | integer (mm) | 2000 |
| drivsystem | string | "Frekvensstyrd" |
| upphangning | string | "2:1" |
| maskinplacering | string | "Sidohängd toppmaskin" |
| typ_maskin | string | "Kone MR" |
| typ_styrsystem | string | "Kone TMS600" |
| barbeslag_autodorrar | string | — |
| dorrmaskin | string | — |
| schaktbelysning | string | "Ja Lysrör" |

#### Besiktning och underhåll
| Fält | Typ | Exempel |
|---|---|---|
| besiktningsorgan | string (combobox) | "Dekra" |
| besiktningsmanad | string (fast enum: Jan–Dec) | "Februari" |
| skotselforetag | string (combobox) | "Hissteknik" |

#### Modernisering och budget
| Fält | Typ | Exempel |
|---|---|---|
| moderniserar | integer/null | 2011 (null = ej ombyggd) |
| garanti | boolean | false |
| rekommenderat_moderniserar | integer/null | 2033 |
| budget_belopp | float | 800000 |
| budget_ar | integer | 2026 |
| atgarder_vid_modernisering | text | "Styrsystem byts, Knappar & tablåer byts..." |
| kommentarer | text | — |

#### Nödtelefon
| Fält | Typ | Exempel |
|---|---|---|
| har_nodtelefon | boolean | true |
| nodtelefon_modell | string | "Safeline SL6+" |
| nodtelefon_typ | string | "GSM med pictogram" |
| nodtelefon_behover_uppgradering | boolean | true |
| nodtelefon_uppgraderings_pris | float | 6500 |

#### Metadata
| Fält | Typ | Beskrivning |
|---|---|---|
| skapad_av | UUID (FK → användare) | Vilken admin-användare som skapade posten |
| skapad_datum | timestamp | — |
| senast_uppdaterad_av | UUID | — |
| senast_uppdaterad | timestamp | — |
| inventeringsdatum | date | Datum för senaste inventering i fält |
| status | enum | "aktiv" / "rivd" / "arkiverad" |

### 4.3 Förslagsvärden (combobox-förslag)

| Fält | Typ | Beskrivning |
|---|---|---|
| kategori | string | t.ex. "hisstyp", "fabrikat", "distrikt" |
| varde | string | t.ex. "Linhiss", "Kone", "Väster" |
| aktiv | boolean | false = visas inte som förslag men befintlig data bevaras |

### 4.4 Nyckeltal härledda ur data

| Nyckeltal | Beräkning |
|---|---|
| Genomsnittsålder | Nuvarande år − medianbyggår |
| Andel ej ombyggda | Antal med moderniseringsår = null / totalt |
| Moderniseringsbehov inom 3 år | Antal med rekommenderat moderniseringsår ≤ nuvarande år + 3 |
| Total budget (aktuellt år) | Summa av budget_belopp |
| Antal per fabrikat | Gruppering per fabrikat |
| Antal per skötselföretag | Gruppering per skötselföretag |

---

## 5. Funktionella krav

### 5.1 Fältapp (admin — mobilvy)

**Syfte:** Admin-användaren (konsulten i fält) ska kunna registrera och uppdatera hissdata på plats vid hissen, även utan internetuppkoppling.

#### 5.1.1 Ny hiss — steg-för-steg-formulär

Formuläret delas upp i sektioner (en i taget på mobil) för att undvika överbelastning:

**Steg 1: Identifiering**
- Hissnummer (obligatoriskt, unikt — valideras direkt)
- Adress (obligatoriskt — föreslå från GPS eller manuell inmatning)
- Hissbeteckning (combobox — se sektion 11.9)
- Distrikt (combobox)

**Steg 2: Teknisk specifikation**
- Hisstyp (combobox)
- Fabrikat (combobox)
- Byggår
- Hastighet (m/s)
- Lyfthöjd (m)
- Märklast / antal personer
- Antal plan och dörrar

**Steg 3: Dörrar och korg**
- Typ av dörrar (combobox)
- Genomgång (ja/nej toggle)
- Kollektiv (combobox)
- Korgstorlek (B × Dj × H)
- Dagöppning (B × H)
- Bärbeslag automatdörrar
- Dörrmaskin / korgdörr

**Steg 4: Maskineri**
- Drivsystem (combobox)
- Upphängning
- Maskinplacering (combobox)
- Typ av maskin och år
- Typ av styrsystem och år

**Steg 5: Besiktning och underhåll**
- Besiktningsorgan (combobox)
- Besiktningsmånad (fast lista: Jan–Dec)
- Skötselföretag (combobox)
- Schaktbelysning

**Steg 6: Modernisering och bedömning**
- Moderniseringsår (eller markera "Ej ombyggd")
- Garanti (ja/nej)
- Rekommenderat moderniseringsår (admin-användarens bedömning)
- Budgetbelopp (SEK)
- Åtgärder vid modernisering (combobox, multi-select — välj bland vanliga åtgärder + skapa nya)

**Steg 7: Nödtelefon**
- Har nödtelefon (ja/nej)
- Modell
- Typ (GSM, 4G, etc.)
- Behöver uppgradering (ja/nej)
- Uppskattad kostnad

**Steg 8: Kommentarer**
- Övriga kommentarer (fritext)

**Steg 9: Granska och spara**
- Sammanfattning av alla inmatade fält
- Möjlighet att gå tillbaka och korrigera
- Spara (skickas till Convex — kräver uppkoppling; utkast finns i localStorage)

#### 5.1.2 Redigera befintlig hiss

- Sök bland befintliga hissar (hissnummer eller adress)
- Visa nuvarande data
- Redigera enskilda fält eller sektioner
- Tydlig markering av vad som ändrats (diff)
- Spara med samma formulärpersistens (localStorage-utkast)

#### 5.1.3 Dagsöversikt

- Lista hissar admin-användaren arbetat med idag
- Status per hiss: sparad / utkast i localStorage

#### 5.1.4 Formulärpersistens (localStorage)

**Krav: Ingen pågående inmatning ska förloras vid uppkopplingsavbrott, sidomladdning eller om webbläsaren stängs.**

Teknisk approach:
- Formulärdata sparas automatiskt till **localStorage** vid varje fältändring (debounced ~500ms)
- Varje formulär identifieras med en nyckel (t.ex. `draft-ny-hiss` eller `draft-hiss-{id}`)
- Vid sidladdning kontrollerar formuläret om det finns ett sparat utkast → om ja, frågas användaren om de vill återställa
- När formuläret skickas (submit) rensas utkastet från localStorage
- **Ingen synk, ingen kö, ingen konflikthantering** — formuläret skickar data till Convex som en vanlig mutation när användaren trycker "Spara"
- Om nätverket saknas vid submit visas ett tydligt felmeddelande: "Ingen uppkoppling — försök igen när du har nät"
- Användaren kan fortsätta fylla i formuläret och trycka "Spara" igen när uppkopplingen är tillbaka
- **Visuell indikator**: "Utkast sparat" visas vid automatisk sparning till localStorage

#### 5.1.5 Mobildesign-principer

- Touch-optimerade kontroller (minst 44×44 px tryckyta)
- En fråga/fältgrupp i taget (wizard-mönster)
- Stora, tydliga knappar för "Spara" och "Nästa"
- Möjlighet att avbryta och fortsätta senare
- Fungerar i stående läge (portrait)
- Inget beroende av horisontell scrollning

### 5.2 Kundportal (fastighetsbolag — desktop-/tablet-vy)

**Syfte:** Kunden loggar in och ser alla sina hissar, med dashboards och sök. Läsbehörighet — kunden kan inte redigera data.

#### 5.2.1 Dashboard (startsida)

**KPI-kort (överst)**
- Totalt antal hissar
- Genomsnittsålder (år)
- Hissar med planerad modernisering inom 3 år (antal + andel)
- Total moderniseringsbudget innevarande år (SEK)
- Antal hissar utan modernisering ("Ej ombyggd")
- Senaste inventeringsdatum

**Visualiseringar**
- Hissar per distrikt — stapeldiagram, sorterat fallande
- Åldersfördelning — histogram per decennium
- Hisstyper — cirkeldiagram
- Fabrikat — topp-10 stapeldiagram
- Moderniseringstidslinje — antal per rekommenderat moderniseringsår (2026–2045+)
- Skötselföretag — donut-diagram

#### 5.2.2 Hissregister (sök och filtrera)

**Sökfunktion**
- Fritextsökning: hissnummer, adress, distrikt, fabrikat, hisstyp
- Realtidsresultat (debounced ~300ms)

**Filterpanel**

| Filter | Typ | Värden |
|---|---|---|
| Distrikt | Multi-select | Alla distrikt för denna kund |
| Hisstyp | Multi-select | Linhiss, Hydraulhiss, MRL linhiss, etc. |
| Fabrikat | Multi-select | Kone, Asea, Otis, etc. |
| Skötselföretag | Multi-select | Hissteknik, Schindler, etc. |
| Byggår | Range slider | 1950–2026 |
| Moderniseringsstatus | Select | Ej ombyggd / Ombyggd / Alla |
| Besiktningsorgan | Multi-select | Dekra, Kiwa |

**Tabellvy**
- Standardkolumner: Hissnummer, Adress, Distrikt, Hisstyp, Fabrikat, Byggår, Moderniseringsår, Rek. modernisering, Budget
- Sorterbara kolumner
- Sidbrytning (25/50/100 per sida)
- Exportfunktion: CSV och Excel

**Detaljvy (klick på rad)**
Expanderad vy med all information, grupperat i sektioner:
1. Identifiering — nummer, adress, distrikt, beteckning
2. Teknisk specifikation — typ, fabrikat, hastighet, lyfthöjd, dörrar, korg, drivsystem
3. Besiktning & underhåll — organ, månad, skötselföretag
4. Modernisering — år, garanti, rekommenderat år, budget, åtgärder
5. Nödtelefon — status, modell, uppgraderingsbehov
6. Kommentarer

#### 5.2.3 Moderniseringsplanering

**Tidslinje-vy**
- Horisontell tidslinje (nuvarande år–2050) med antal hissar per rekommenderat moderniseringsår
- Färgkodning: Rött (≤1 år), Orange (2-4 år), Gult (5-9 år), Grönt (10+ år)
- Klickbara perioder som filtrerar listan nedan

**Budgetöversikt**
- Total budget per år (stapeldiagram)
- Kumulativ kurva
- Budget per distrikt
- Budget per hisstyp

**Prioriteringslista**
- Tabell sorterad efter rekommenderat moderniseringsår
- Kolumner: Adress, Distrikt, Hisstyp, Byggår, Senaste modernisering, Rek. år, Budget, Åtgärder
- Visuella indikatorer (röd/orange/grön)

**Åtgärdssammanfattning**
- Vanligaste åtgärderna vid modernisering med antal hissar

#### 5.2.4 Underhåll och besiktning

**Besiktningskalender**
- Visuell månatlig vy: antal hissar per besiktningsmånad
- Lista hissar med kommande besiktning

**Skötselföretagsöversikt**
- Antal hissar per skötselföretag
- Matris: skötselföretag × distrikt

**Nödtelefonstatus**
- Antal med/utan nödtelefon
- Antal som behöver uppgradering
- Total uppskattad uppgraderingskostnad
- Lista per distrikt

### 5.3 Admin (Hisskompetens)

#### 5.3.1 Kundhantering
- Skapa ny kundorganisation
- Redigera kunduppgifter
- Aktivera/inaktivera kund

#### 5.3.2 Användarhantering

Admin har ett fullständigt gränssnitt för att hantera alla användare i systemet — både andra admin-användare (Hisskompetens personal) och kundanvändare. Kunder har ingen möjlighet att själva skapa, bjuda in eller ta bort användare. All användarhantering sker via admin.

**Användarlista**
- Tabell med alla användare: namn, e-post, roll (admin/kund), organisation (för kunder), status (aktiv/inaktiv), senaste inloggning
- Filtrera på roll och organisation
- Sök på namn eller e-post

**Skapa ny användare**
- Namn, e-post (används som inloggning)
- Roll: Admin eller Kund
- Om kund: välj organisation (obligatoriskt — en kundanvändare tillhör exakt en organisation)
- Admin-panelen anropar Convex action som i sin tur anropar Clerk API för att skapa användaren → Clerk skickar inbjudningsmejl → användaren sätter sitt lösenord via Clerks UI

**Redigera användare**
- Ändra namn, e-post, roll
- Byta organisation för en kundanvändare
- Återställa lösenord (triggar Clerks lösenordsåterställningsflöde)

**Inaktivera / ta bort användare**
- Inaktivera: användaren blockeras i Clerk (kan inte logga in) och markeras som inaktiv i Convex `anvandare`-tabellen. Data (skapad_av, senast_uppdaterad_av) bevaras.
- Ta bort: permanent borttagning från Clerk + Convex — kräver bekräftelse, historiska referenser sätts till "Borttagen användare"

**Översikt per organisation**
- Från organisationsvyn (5.3.1): visa alla kundanvändare kopplade till den organisationen
- Snabbåtgärd: lägg till ny kundanvändare direkt från organisationsvyn

#### 5.3.3 Dataimport
- Ladda upp Excel-fil i det definierade importformatet (se sektion 11)
- Validering och förhandsgranskning (antal poster, nya/ändrade/borttagna)
- Stöd för löpande import (inte bara initial migrering) — konsulten kan exportera från Excel och importera till systemet vid behov

#### 5.3.4 Referensdata (förslagslista)
- Visa och hantera befintliga värden som visas i combobox-förslag: hisstyper, fabrikat, distrikt, besiktningsorgan, skötselföretag, hissbeteckningar, dörrtyper, drivsystem, maskinplaceringar, kollektiv-typer
- Döpa om värden (uppdaterar alla hissar med det gamla värdet)
- Slå ihop dubbletter (t.ex. "Centrum/Haga" och "Centrum/haga")
- Inaktivera värden som inte längre ska föreslås (utan att ta bort befintlig data)
- Nya värden som skapas i fält av admin-användare läggs automatiskt till i förslagslistan

---

## 6. Formulärpersistens (offline-skydd)

### Varför formulärpersistens behövs

Admin-användare (konsulter) arbetar ibland i miljöer med dålig uppkoppling: hissschakt, källare, maskinrum. En admin-användare kan spendera 15–30 minuter på att fylla i formuläret för en hiss. Att förlora pågående inmatning vid ett nätverksavbrott eller en oavsiktlig sidomladdning är oacceptabelt.

### Approach: localStorage-baserad formulärpersistens

Ingen Service Worker, ingen IndexedDB, inget PWA-manifest, ingen synk-kö. Istället sparas formulärtillståndet löpande till localStorage — enkel, pålitlig och utan extra komplexitet.

```
┌─────────────────────────────────────────────────┐
│                   Webbläsare                     │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  React App   │───►│  localStorage         │  │
│  │  (Formulär)  │    │  - draft-ny-hiss      │  │
│  │              │◄───│  - draft-hiss-{id}    │  │
│  └──────┬───────┘    └───────────────────────┘  │
│         │ (submit, kräver uppkoppling)           │
└─────────┼───────────────────────────────────────┘
          │
          ▼
   ┌──────────────────┐
   │  Convex           │
   │  (mutation)       │
   └──────────────────┘
```

### Flöde

1. **Automatisk sparning** — Formulärtillståndet sparas till localStorage vid varje fältändring (debounced ~500ms). Visuell indikator: "Utkast sparat".
2. **Återställning** — Vid sidladdning kontrolleras om ett utkast finns. Om ja → "Du har ett sparat utkast. Vill du fortsätta där du slutade?"
3. **Submit** — Användaren trycker "Spara". Formuläret anropar en Convex mutation. Om nätverket saknas → tydligt felmeddelande: "Ingen uppkoppling — försök igen när du har nät."
4. **Rensning** — Vid lyckad submit rensas utkastet från localStorage.
5. **Persistens** — localStorage överlever sidomladdning, flikstängning och telefonens viloläge. Utkastet finns kvar tills det skickas eller manuellt rensas.

### Vad som INTE ingår i v1

- Ingen Service Worker eller PWA — appen kräver uppkoppling för att ladda
- Ingen IndexedDB — localStorage räcker för formulärdata (typiskt <50 KB per hiss)
- Ingen synk-kö — data skickas direkt vid submit
- Ingen konflikthantering — appen är enkel: en konsult fyller i ett formulär och skickar det
- Ingen pre-caching av hissdata — konsulten behöver uppkoppling för att söka befintliga hissar
- Inga foton i v1 — konsulten lagrar foton på telefonen separat

---

## 7. Icke-funktionella krav

### Prestanda
- Dashboard-laddning: <2 sekunder
- Sökning/filtrering: <200ms svarstid
- Lokal sparning (offline): <100ms
- Synkning av en hiss: <2 sekunder
- Initial Excel-import: <60 sekunder för 700 poster

### Mobilprestanda
- Fungerar på telefoner med 3+ år gamla webbläsare (Chrome, Safari)
- Responsiv design — fungerar i stående läge på mobil utan horisontell scrollning

### Tillgänglighet
- Kundportalen: WCAG 2.1 AA-kompatibel
- Fältappen: Fokus på användbarhet (stora kontroller, tydliga kontraster) — full WCAG AA inte krav men eftersträvas

### Säkerhet
- HTTPS överallt
- Autentisering via Clerk (hanterar sessioner, lösenord, brute force-skydd, MFA-redo)
- Rollbaserad behörighetskontroll (RBAC) — roll och organisation lagras i lokal `anvandare`-tabell
- Kunddata strikt isolerad (tenant isolation) — en kund kan aldrig se en annan kunds data
- Formulärutkast i localStorage innehåller inga känsliga personuppgifter — enbart teknisk hissdata

### Språk
- Hela gränssnittet på svenska
- Alla etiketter, validering, hjälptexter och felmeddelanden på svenska

### Drift
- Helt serverless via Cloudflare Workers + Convex — ingen server att underhålla
- Automatisk backup via Convex (point-in-time recovery, 1 timme på free tier)
- DDoS-skydd inkluderat via Cloudflare
- 99.5% uptid-mål (Cloudflare och Convex har SLA:er som överstiger detta)
- Convex skalar inte till noll — ingen cold start-problematik (till skillnad från Neon)

---

## 8. Teknisk arkitektur

### Två separata appar i ett monorepo

Systemet består av två fullstack-applikationer som delas efter roll — inte efter enhet. Båda byggs med **TanStack Start** och deployas till **Cloudflare Workers**:

**Admin-appen** (admin.hisskompetens.se) — för Hisskompetens personal. Innehåller allt: fältverktyget (mobil, med formulärpersistens via localStorage), dashboards för alla kunder, användarhantering, import, referensdata. Admin-användare har implicit tillgång till alla organisationer.

**Klient-appen** (app.hisskompetens.se) — för kunder. Strikt låst till den inloggade användarens organisation. Dashboards, sök/filtrering, moderniseringsplanering, underhållsöversikt och export. Ingen redigering, ingen användarhantering. Klient-appen kräver extra autentiseringskontroller: varje Convex-funktion validerar att den efterfrågade resursen tillhör användarens organisation. Inga admin-routes eller admin-komponenter ingår i klient-appens bundle.

Varje app är en fullstack TanStack Start-applikation som anropar Convex-funktioner (queries och mutations) för all dataåtkomst. Delade paket (typer, auth-helpers, UI-komponenter) konsumeras via monorepo-referenser.

**Landing page** (hisskompetens.se) — publik webbplats för konsultbyrån. Statisk sida med CMS-innehåll från Convex. Separata app i monorepot.

### Monorepo-struktur

Allt i ett repo. Delade paket (typer, databasåtkomst, UI-komponenter) används av båda apparna utan duplicering.

```
hisskompetens/
├── apps/
│   ├── admin/                          # TanStack Start admin-appen (Hisskompetens)
│   │   ├── app/
│   │   │   ├── routes/
│   │   │   │   ├── _field/            # Fältverktyg (mobil, wizard)
│   │   │   │   │   ├── ny.tsx         # Steg-för-steg-formulär
│   │   │   │   │   └── hiss.$id.tsx   # Redigera hiss
│   │   │   │   ├── _desktop/          # Desktop-vyer
│   │   │   │   │   ├── dashboard.tsx  # Dashboards (alla kunder)
│   │   │   │   │   ├── register.tsx   # Hissregister med redigering
│   │   │   │   │   ├── modernisering.tsx
│   │   │   │   │   └── underhall.tsx
│   │   │   │   └── admin/             # Admin-specifikt
│   │   │   │       ├── organisationer.tsx
│   │   │   │       ├── anvandare.tsx
│   │   │   │       ├── import.tsx
│   │   │   │       └── referensdata.tsx
│   │   │   ├── router.tsx             # TanStack Router-konfiguration
│   │   │   └── routeTree.gen.ts       # Auto-genererat route-träd
│   │   ├── lib/
│   │   │   ├── form-persistence.ts    # localStorage-helpers för formulärutkast
│   │   │   └── auth.ts                # Clerk-helpers + requireAdmin-guard
│   │   ├── app.config.ts              # TanStack Start-konfiguration (Nitro → Cloudflare Workers)
│   │   ├── wrangler.toml              # Cloudflare Workers-konfiguration
│   │   └── package.json
│   │
│   ├── client/                         # TanStack Start klient-appen (kunder)
│   │   ├── app/
│   │   │   ├── routes/
│   │   │   │   ├── dashboard.tsx       # Dashboard (sin organisation)
│   │   │   │   ├── register.tsx        # Hissregister (läsvy)
│   │   │   │   ├── modernisering.tsx   # Moderniseringsplanering
│   │   │   │   └── underhall.tsx       # Underhåll & besiktning
│   │   │   ├── router.tsx
│   │   │   └── routeTree.gen.ts
│   │   ├── lib/
│   │   │   └── auth.ts                # Clerk-helpers + tenantGuard
│   │   ├── app.config.ts              # TanStack Start-konfiguration (Nitro → Cloudflare Workers)
│   │   ├── wrangler.toml              # Cloudflare Workers-konfiguration
│   │   └── package.json
│   │
│   └── landing/                        # Landing page (hisskompetens.se)
│       ├── app/
│       │   ├── routes/
│       │   │   ├── index.tsx           # Startsida
│       │   │   ├── tjanster.tsx        # Tjänster
│       │   │   ├── om-oss.tsx          # Om oss
│       │   │   └── kontakt.tsx         # Kontakt
│       │   ├── router.tsx
│       │   └── routeTree.gen.ts
│       ├── app.config.ts
│       ├── wrangler.toml
│       └── package.json
│
├── convex/                              # Convex backend (delad mellan alla appar)
│   ├── schema.ts                       # Databasschema (hissar, organisationer, anvandare, etc.)
│   ├── hissar.ts                       # Queries & mutations för hissar
│   ├── organisationer.ts               # Queries & mutations för organisationer
│   ├── anvandare.ts                    # Queries & mutations för användare
│   ├── forslagsvarden.ts               # Queries & mutations för combobox-förslag
│   ├── importera.ts                    # Actions för Excel-import
│   ├── cms.ts                          # Queries & mutations för landing page CMS
│   ├── auth.ts                         # Auth-helpers, rollvalidering, tenant isolation
│   └── _generated/                     # Auto-genererade typer och API
│
├── packages/
│   ├── auth/                           # Clerk-klient, middleware-helpers, rolluppslag
│   ├── types/                          # Delade TypeScript-typer
│   ├── ui/                             # Delade UI-komponenter (tabeller, filter, KPI-kort, diagram)
│   ├── email/                          # React Email-mallar + Resend-klient
│   └── utils/                          # Delade hjälpfunktioner (formatering, parsning, Excel-import)
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .github/workflows/                  # CI/CD (Wrangler deploy till Cloudflare, Convex deploy)
```

### Frontend — TanStack Start (gemensam teknologi)

Båda apparna är **TanStack Start** med TypeScript. TanStack Start är ett fullstack React-ramverk byggt på **TanStack Router** (typsäker routing) + **Vite** (bundling) + **Nitro** (server-lager). Nitro har förstklassigt stöd för Cloudflare Workers, vilket ger sömlös deployment utan adapterlager.

Gemensamt:
- **TanStack Start** — fullstack React-ramverk
- **TanStack Router** — filbaserad, fullständigt typsäker routing
- **Convex React-klient** (`convex/react`) — real-time queries och mutations direkt i React-komponenter
- **ConvexProviderWithClerk** — integrerar Clerk-autentisering med Convex
- **Tailwind CSS** för styling
- **TanStack Table** för tabeller med sortering/paginering
- **Recharts** för diagram och visualiseringar
- **Clerk** (@clerk/tanstack-start) för autentisering — extern tjänst, free tier upp till 50 000 MAU (se nedan)

Enbart admin-appen har:
- **localStorage-baserad formulärpersistens** — sparar formulärutkast automatiskt så att pågående inmatning inte förloras vid nätverksavbrott eller sidomladdning

Convex ersätter behovet av egna server functions för dataåtkomst. React-komponenter anropar Convex queries (läsning) och mutations (skrivning) direkt via hooks (`useQuery`, `useMutation`). Convex hanterar autentisering, validering och tenant isolation i sina server-funktioner.

### Backend — Convex

**Convex** är en fullständig backend-as-a-service som ersätter separat databas, ORM, API-lager och fillagring med en enda tjänst.

**Databas:**
- Dokumentbaserad (JSON-liknande dokument med typsäkert schema)
- Schema definieras i `convex/schema.ts` med TypeScript — genererar typer automatiskt
- Tenant isolation implementeras i varje query/mutation-funktion (validerar organisation_id mot inloggad användares tillhörighet)
- Inga cold starts — Convex skalar inte till noll, alltid redo
- Automatisk indexering för vanliga frågor

**Real-time:**
- Convex queries är reaktiva — när data ändras uppdateras alla lyssnande klienter automatiskt
- Konsulten sparar hissdata → kundens dashboard uppdateras i realtid utan polling eller manuell refresh

**Server-funktioner:**
- **Queries** — läsoperationer, körs automatiskt om vid dataändringar
- **Mutations** — skrivoperationer med transaktionsgaranti (ACID)
- **Actions** — för sidoeffekter (t.ex. anropa externa API:er som Clerk eller Resend)

**Fillagring (framtida bruk):**
- Convex har inbyggd fillagring (free tier: 1 GB) — tillgänglig om bilder behövs i framtida versioner

**Free tier:**
- 1 GB databaslagring
- 1 GB fillagring
- 1 GB bandwidth
- 1 miljon funktionsanrop/månad
- Automatisk backup med 1 timmes point-in-time recovery
- Inga begränsningar för kommersiellt bruk

### E-post — Resend

Transaktionella e-postmeddelanden skickas via **Resend** (systemnotifieringar) och **Clerk** (autentiseringsrelaterade meddelanden).

**Clerk hanterar automatiskt:**
- Kontoinbjudningar (e-post med inbjudningslänk)
- Lösenordsåterställning (tidsbegränsad länk)
- Bekräftelse vid lösenordsbyte
- Clerks e-postmallar kan anpassas i Clerk Dashboard med Hisskompetens varumärke.

**Resend hanterar systemets egna e-postmeddelanden:**
- **Resend free tier** — 100 e-post/dag, 3 000/mo. Förväntad volym för detta system: ~10-20/mo. Kostnad: $0.
- **React Email** för mallar — e-postmallarna skrivs som React-komponenter, delade via `packages/email/`
- Avsändardomän: `noreply@hisskompetens.se` (kräver DNS-verifiering med Resend)
- Integreras via `resend`-paketet i Convex actions

Resend-e-posttyper i v1:
1. **Importrapport** — Resultat efter Excel-import (lyckade/misslyckade rader)
2. **Systemnotifieringar** — Framtida behov (t.ex. besiktningspåminnelser)

### Autentisering — Clerk

**Clerk** hanterar all autentisering som en extern tjänst. Clerk tillhandahåller inloggning, lösenordshantering, inbjudningsflöden, brute force-skydd, MFA och användardashboard — utan att vi behöver implementera något av detta själva. Clerk free tier stödjer upp till 50 000 MAU och har inga begränsningar för kommersiellt bruk.

#### Varför Clerk istället för Auth.js?

Med Auth.js Credentials provider hade vi behövt bygga och underhålla: bcrypt-hashning, lösenordsåterställning med tokens, inbjudningsflöde, rate limiting, kontolåsning, brute force-skydd och user enumeration-skydd. Det är 2-3 veckors utveckling och en permanent säkerhetsyta att underhålla. Clerk ger allt detta ur lådan, gratis vid <50 000 användare. Clerk har dessutom officiell integration med Convex via `ConvexProviderWithClerk`.

#### Autentiseringsflöde

```
Användare → Clerk-hostad inloggningssida (eller inbäddad <SignIn />-komponent)
        │
        ▼
Clerk hanterar: lösenordsverifiering, rate limiting, brute force-skydd
        │
        ▼
Clerk utfärdar session-token (JWT)
        │
        ▼
ConvexProviderWithClerk skickar token till Convex vid varje anrop
        │
        ▼
Convex-funktion läser userId via ctx.auth → slår upp roll och organisation_id i `anvandare`-tabellen
```

#### Synk mellan Clerk och Convex

Clerk är master för autentisering (e-post, lösenord, session). Convex-tabellen `anvandare` är master för applikationsdata (roll, organisation, behörigheter).

Synk sker via **Clerk Webhooks** (user.created, user.updated, user.deleted) som tas emot av en Convex HTTP action:

1. Admin skapar användare i admin-panelen → Convex action anropar Clerk API för att skapa användaren i Clerk + skapar dokument i `anvandare`-tabellen med roll och organisation_id.
2. Clerk skickar webhook vid lyckad skapning → Convex HTTP action tar emot och bekräftar/loggar.
3. Vid inloggning: `ConvexProviderWithClerk` skickar Clerk-token till Convex. Convex-funktioner validerar token och slår upp `anvandare`-dokumentet för roll och organisation_id.

#### Lagring

```
anvandare (Convex-tabell — roll- och organisationskoppling)
├── id              UUID (PK)
├── clerk_user_id   string (unikt, Clerks externa ID)
├── email           string (unikt, speglas från Clerk)
├── namn            string
├── roll            "admin" | "kund"
├── organisation_id UUID (FK, obligatoriskt för kund, null för admin)
├── aktiv           boolean
├── skapad_datum    timestamp
└── senaste_login   timestamp (uppdateras via webhook)
```

Notera: inget lösenordsfält — lösenord lagras och hanteras helt av Clerk. Convex-tabellen innehåller enbart applikationsdata.

#### Session

Clerk hanterar sessioner via sin egen JWT-token. `ConvexProviderWithClerk` skickar automatiskt Clerk-token till Convex vid varje anrop. I Convex-funktioner hämtas den inloggade användarens identitet via `ctx.auth.getUserIdentity()`.

Rollbaserad åtkomst (admin/kund) och organisation_id hämtas från `anvandare`-tabellen i Convex via `clerk_user_id`-uppslag. En delad helper-funktion `getCurrentUser(ctx)` i `convex/auth.ts` kapslar in detta uppslag och återanvänds i alla queries/mutations.

#### Skydd per app

- **Klient-appen:** Convex-funktioner validerar att den inloggade användaren har `roll === "kund"` och att den efterfrågade resursen tillhör samma `organisation_id`. Om en kund försöker nå data utanför sin organisation → felmeddelande.
- **Admin-appen:** Convex-funktioner validerar att den inloggade användaren har `roll === "admin"`. Inga organisationsbegränsningar.
- Delad auth-logik i `convex/auth.ts` — `getCurrentUser(ctx)`, `requireAdmin(ctx)`, `requireTenantAccess(ctx, organisationId)`.
- Klient-konfiguration i `packages/auth/` — Clerk-klient (@clerk/tanstack-start) och `ConvexProviderWithClerk` setup.

#### MFA

Ingen MFA i v1 — men Clerk har inbyggt stöd för TOTP och SMS-baserad MFA som kan aktiveras med en konfigurationsändring utan egen kodning.

#### Lösenordshantering

Allt hanteras av Clerk:
- **Inbjudan:** Admin skapar konto → Clerk skickar inbjudningsmejl → användaren sätter sitt lösenord via Clerks UI.
- **Glömt lösenord:** Clerk hanterar hela flödet (e-post med återställningslänk, nytt lösenord, validering).
- **Lösenordskrav:** Konfigureras i Clerk Dashboard (default: minst 8 tecken).

#### Inbyggt säkerhetsskydd (hanteras av Clerk)

- **Rate limiting** — Clerk begränsar automatiskt antal inloggningsförsök.
- **Brute force-skydd** — Clerk blockerar automatiskt vid upprepade misslyckade försök.
- **Bot-detektering** — Clerk har inbyggt skydd mot automatiserade attacker.
- **Generiska felmeddelanden** — Clerk avslöjar inte om en e-postadress finns registrerad.
- **Lösenordshashning** — Clerk använder bcrypt internt; vi berör aldrig lösenord i vår kod.

### Infrastruktur och deployment

**Mål: helt serverless, noll infrastrukturunderhåll, noll kostnad (förutom domän).**

#### Cloudflare Workers (applikationshosting)

Båda TanStack Start-apparna deployas till **Cloudflare Workers** via Nitro:
- **Git push → GitHub Actions → Wrangler deploy** — automatisk CI/CD
- Automatisk SSL och DDoS-skydd inkluderat
- Global edge-deployment (appen körs nära användaren)
- Ingen server att underhålla, inga containers att övervaka
- Free tier: 100 000 requests/dag (långt över systemets behov)

#### Convex (databas, API, real-time)

- Backend-as-a-service — databas, server-funktioner, fillagring och real-time i ett
- Free tier: 1 GB lagring, 1 GB bandwidth, 1M funktionsanrop/månad
- Automatisk backup med 1 timmes point-in-time recovery
- Ingen cold start — alltid redo, skalar inte till noll
- Anslutning från klientapparna via `convex/react` med `ConvexProviderWithClerk`
- Deployment via `npx convex deploy` (CI/CD i GitHub Actions)

#### Domänstruktur

| Domän | Tjänst |
|---|---|
| hisskompetens.se | Landing page (Cloudflare Workers) |
| admin.hisskompetens.se | Admin-appen (Cloudflare Workers) |
| app.hisskompetens.se | Klient-appen (Cloudflare Workers) |

DNS hanteras via Cloudflare — domänerna pekar på respektive Worker via custom domains.

#### Backup

- **Convex** hanterar databasbackuper automatiskt (1 timmes point-in-time recovery på free tier, längre på betalplan)
- Convex stödjer även snapshot-export för extern backup vid behov

#### Uppskattad månadskostnad

| Post | Kostnad |
|---|---|
| Cloudflare Workers (3 appar) | €0 (free tier, 100k req/dag) |
| Convex (databas + API + real-time) | €0 (free tier, 1 GB lagring, 1M anrop/mo) |
| Clerk (autentisering) | €0 (free tier, <50 000 MAU) |
| Resend (e-post) | €0 (free tier, 100/dag) |
| Domän (hisskompetens.se) | ~€1 (årsavgift delad) |
| **Totalt** | **~€1/mo** |

Alla tjänster har free tiers utan begränsningar för kommersiellt bruk. Systemets förväntade användning (<50 användare, <1000 hissar) ligger långt under free tier-gränserna. Vid tillväxt är den första betaltröskel Convex Pro ($25/mo vid >1 GB) eller Cloudflare Workers Paid ($5/mo vid >100k req/dag).

### Monorepo-verktyg

- **Turborepo** för build-orkestrering, caching och dependency-hantering
- **pnpm workspaces** för pakethantering
- **Vite** som bundler (via TanStack Start) — snabbare dev-server och builds jämfört med Webpack/Turbopack
- **Wrangler** (Cloudflare CLI) för lokal utveckling och deployment av Workers
- **Convex CLI** (`npx convex dev` lokalt, `npx convex deploy` i CI/CD)
- Delade paket publiceras inte — konsumeras direkt via workspace-referenser

---

## 9. API-design — Convex-funktioner

Med Convex finns inga REST-endpoints. Istället definieras **queries** (läsning), **mutations** (skrivning) och **actions** (sidoeffekter) som TypeScript-funktioner i `convex/`-katalogen. React-komponenter anropar dessa direkt via hooks (`useQuery`, `useMutation`).

### Autentisering

Inloggning, utloggning och sessionshantering hanteras helt av Clerk (via `<SignIn />`-komponent och `ConvexProviderWithClerk`). Inga egna auth-funktioner behövs förutom webhook-mottagaren:

| Typ | Funktion | Beskrivning |
|---|---|---|
| HTTP action | `clerk-webhook` | Webhook-mottagare för Clerk-events (user.created, user.updated, user.deleted) — synkar `anvandare`-tabellen i Convex |

### Hissar (`convex/hissar.ts`)

| Typ | Funktion | Beskrivning | Roll |
|---|---|---|---|
| query | `list` | Lista hissar (filtrering, sökning, paginering) | Admin, Kund (sin org) |
| query | `get` | Hämta en hiss med alla detaljer | Admin, Kund (sin org) |
| mutation | `create` | Skapa ny hiss | Admin |
| mutation | `update` | Uppdatera hiss | Admin |
| mutation | `archive` | Markera hiss som rivd/arkiverad | Admin |
| query | `stats` | Aggregerad statistik för KPI:er och dashboards | Admin, Kund (sin org) |
| query | `moderniseringTidslinje` | Antal hissar per rekommenderat moderniseringsår | Admin, Kund (sin org) |
| query | `moderniseringBudget` | Budget per år, distrikt, hisstyp | Admin, Kund (sin org) |
| query | `besiktningskalender` | Besiktningskalender per månad | Admin, Kund (sin org) |
| query | `skotselforetag` | Översikt per skötselföretag | Admin, Kund (sin org) |
| query | `nodtelefonstatus` | Nödtelefonstatus och uppgraderingsbehov | Admin, Kund (sin org) |
| action | `exportera` | Exportera filtrerat resultat (CSV/Excel) | Admin, Kund (sin org) |

### Organisationer (`convex/organisationer.ts`) — enbart Admin

| Typ | Funktion | Beskrivning |
|---|---|---|
| query | `list` | Lista kundorganisationer |
| query | `get` | Hämta en organisation med detaljer |
| mutation | `create` | Skapa ny kundorganisation |
| mutation | `update` | Uppdatera kundorganisation |

### Användare (`convex/anvandare.ts`) — enbart Admin

| Typ | Funktion | Beskrivning |
|---|---|---|
| query | `list` | Lista alla användare (filtrering på roll, organisation) |
| query | `get` | Hämta en användare |
| action | `create` | Skapa ny användare (anropar Clerk API + skapar i Convex) |
| action | `update` | Uppdatera användare (roll, organisation — synkar till Clerk metadata) |
| action | `remove` | Ta bort användare (tar bort i Clerk + Convex) |
| action | `inaktivera` | Inaktivera användare (blockerar i Clerk + sätter aktiv=false) |
| query | `listByOrganisation` | Lista användare för en specifik organisation |

### Import (`convex/importera.ts`) — enbart Admin

| Typ | Funktion | Beskrivning |
|---|---|---|
| action | `upload` | Ladda upp och parsa Excel-fil |
| query | `preview` | Förhandsgranskning av importresultat |
| action | `confirm` | Genomför import (skapar/uppdaterar hissar) |

### Förslagsvärden (`convex/forslagsvarden.ts`)

| Typ | Funktion | Beskrivning |
|---|---|---|
| query | `list` | Lista förslag per kategori (för combobox) |
| mutation | `create` | Lägg till nytt förslagsvärde |
| mutation | `update` | Byt namn på förslagsvärde |
| mutation | `merge` | Slå ihop dubbletter |
| mutation | `deactivate` | Inaktivera ett värde |

### CMS — Landing page (`convex/cms.ts`)

| Typ | Funktion | Beskrivning |
|---|---|---|
| query | `getPage` | Hämta sidinnehåll (startsida, tjänster, om oss, kontakt) |
| query | `listPages` | Lista alla CMS-sidor |
| mutation | `updatePage` | Uppdatera sidinnehåll (admin) |
| mutation | `createPage` | Skapa ny sida (admin) |

### Filtrering (query-argument i `hissar.list`)

```typescript
hissar.list({
  search: "Memoargatan",
  distrikt: ["Väster", "Hisingen"],
  hisstyp: "Linhiss",
  fabrikat: ["Kone", "Asea"],
  byggarMin: 1960,
  byggarMax: 1980,
  moderniserad: true,
  skotselforetag: "Hissteknik",
  status: "aktiv",
  sort: "byggar",
  order: "asc",
  page: 1,
  limit: 25,
})
```

### Tenant isolation i Convex-funktioner

Varje query och mutation som hanterar hissdata kontrollerar den inloggade användarens roll:
- **Admin** — full åtkomst, inget organisationsfilter (om inget specifikt valt)
- **Kund** — Convex-funktionen lägger automatiskt till `organisation_id`-filter baserat på användarens tillhörighet. Inga argument kan kringgå detta.

```typescript
// Förenklat exempel i convex/hissar.ts
export const list = query({
  args: { /* filter-argument */ },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.roll === "kund") {
      // Tvinga organisationsfilter
      return ctx.db.query("hissar")
        .filter(q => q.eq(q.field("organisation_id"), user.organisation_id))
        .collect();
    }
    // Admin: valfritt organisationsfilter
    return ctx.db.query("hissar").collect();
  },
});
```

---

## 10. Navigationsstruktur

### Admin-appen (admin.hisskompetens.se)

**Mobilvy (fältarbete):**

```
┌──────────────────────────────┐
│  Hisskompetens    ● Online   │
├──────────────────────────────┤
│                              │
│   [+ Ny hiss]                │
│                              │
│   Dagens hissar (3)          │
│   ├── Memoargatan 18  ✓     │
│   ├── Bohusgatan 3    ⏳    │
│   └── Styrfarten 10   ✓     │
│                              │
│   [Sök befintlig hiss]      │
│                              │
├──────────────────────────────┤
│  🏠 Hem    🔍 Sök    👤 Konto│
└──────────────────────────────┘
```

**Desktopvy (administration + dashboards):**

```
┌──────────────────────────────────────────────┐
│  [Logo]  Hisskompetens       [Organisation ▼]│
├──────┬───────────────────────────────────────┤
│      │                                       │
│  📊  │   (Aktivt sidinnehåll)               │
│  Dash│                                       │
│      │                                       │
│  🔍  │                                       │
│  Reg.│                                       │
│      │                                       │
│  🔧  │                                       │
│  Mod.│                                       │
│      │                                       │
│  🛠   │                                       │
│  Und.│                                       │
│      │                                       │
│  ⚙️  │                                       │
│  Adm.│                                       │
│      │                                       │
└──────┴───────────────────────────────────────┘
```

**Sidor i admin-appen:**

Mobil (fältarbete):
1. Hem (`/`) — Dagens hissar, snabbåtgärder
2. Ny hiss (`/ny`) — Steg-för-steg-formulär
3. Redigera (`/hiss/:id/redigera`) — Uppdatera befintlig
4. Sök (`/sok`) — Hitta hiss
5. Profil (`/profil`) — Konto

Desktop (administration):
1. Dashboard (`/dashboard`) — KPI-kort + visualiseringar (med organisations-väljare)
2. Hissregister (`/register`) — Sök, filtrera, detaljvy med redigering
3. Modernisering (`/modernisering`) — Tidslinje, budget, prioritering
4. Underhåll (`/underhall`) — Besiktning, skötsel, nödtelefoner
5. Organisationer (`/admin/organisationer`) — Hantera kundorganisationer
6. Användare (`/admin/anvandare`) — Hantera admin- och kundkonton
7. Import (`/admin/import`) — Excel-import
8. Referensdata (`/admin/referensdata`) — Hantera combobox-förslag

### Klient-appen (app.hisskompetens.se)

```
┌──────────────────────────────────────────────┐
│  [Logo]  Hisskompetens       [Organisation]  │
├──────┬───────────────────────────────────────┤
│      │                                       │
│  📊  │   (Aktivt sidinnehåll)               │
│  Dash│                                       │
│      │                                       │
│  🔍  │                                       │
│  Reg.│                                       │
│      │                                       │
│  🔧  │                                       │
│  Mod.│                                       │
│      │                                       │
│  🛠   │                                       │
│  Und.│                                       │
│      │                                       │
└──────┴───────────────────────────────────────┘
```

Notera: ingen organisations-väljare — kunden ser enbart sin egen organisation. Organisationsnamnet visas som fast text, inte som dropdown.

**Sidor i klient-appen:**
1. Dashboard (`/`) — KPI-kort + visualiseringar (sin organisation)
2. Hissregister (`/register`) — Sök, filtrera, detaljvy (läsvy, ingen redigering)
3. Modernisering (`/modernisering`) — Tidslinje, budget, prioritering
4. Underhåll (`/underhall`) — Besiktning, skötsel, nödtelefoner

**Autentiseringsskydd i klient-appen:**
- `ConvexProviderWithClerk` skickar Clerk-token till Convex. Varje Convex-funktion validerar roll och organisation_id.
- Varje query och mutation kontrollerar organisation_id — om användaren saknar giltig organisation returneras felmeddelande
- Inga admin-routes existerar i klient-appens kodbas — de finns inte ens i bundlen
- Om en kund försöker nå admin.hisskompetens.se nekas åtkomst vid inloggning

---

## 11. Excel-importformat

Systemet ska stödja import av Excel-filer (.xlsx) som följer strukturen i Hisskompetens befintliga "Statuslista"-format. Filen innehåller tre flikar (sheets) med specifika kolumnlayouter.

### 11.1 Filstruktur

| Flik (sheet) | Syfte | Rad med kolumnrubriker | Datastart |
|---|---|---|---|
| Hissar | Aktiva hissar med all teknisk och budgetdata | Rad 2 | Rad 3 |
| Nödtelefoner | Nödtelefonstatus och uppgraderingsbehov | Rad 2 | Rad 3 |
| Rivna hissar | Avvecklade hissar (samma kolumnstruktur som Hissar men utan kolumn AH, kolumnerna förskjuts) | Rad 2 (data, inga rubriker) | Rad 2 |

Rad 1 i fliken "Hissar" innehåller metadata (datum i C1, sektionsrubriker i J1 och AF1) — dessa ignoreras vid import.

### 11.2 Flik: Hissar — kolumnspecifikation

Kolumnrubrikerna finns i rad 2. Data börjar på rad 3.

| Kolumn | Rubrik | Datatyp | Mappning till systemfält | Exempel | Obligatorisk |
|---|---|---|---|---|---|
| A | Inventerings datum | String (YYYY-MM) | inventeringsdatum | "2021-10" | Nej |
| B | Kund nummer | String | organisation.organisationsnummer | "969676-6923" | Nej |
| C | Kund | String | organisation.namn | "Bostadsbolaget" | Ja |
| D | Kontaktperson | String | organisation.kontaktperson | — | Nej |
| E | Telefonnummer | String/Number | organisation.telefonnummer | — | Nej |
| F | E-mail | String | organisation.email | — | Nej |
| G | Distrikt/ Ort | String | hiss.distrikt | "Hisingen" | Nej |
| H | Fastighets beteckning | String | hiss.fastighetsbeteckning | — | Nej |
| I | Hissbeteckning | String | hiss.hissbeteckning | "Möbelhiss" | Nej |
| J | Hissadress | String | hiss.hissadress | "Memoargatan 18" | Ja |
| K | Besiktningsorgan | String | hiss.besiktningsorgan | "Dekra" | Nej |
| L | Hissnummer | String | hiss.hissnummer (PK) | "L7787113" | Ja |
| M | Besiktningsmånad | String | hiss.besiktningsmanad | "April" | Nej |
| N | Skötselföretag | String | hiss.skotselforetag | "Hissteknik" | Nej |
| O | Märklast / Antal personer | String | Parsas → marklast | "500*6" (500 kg, 6 pers) | Nej |
| P | Antal Plan/ Antal Dörrar | String | Parsas → antal_plan, antal_dorrar | "10*10" | Nej |
| Q | Typ av dörrar | String | hiss.typ_dorrar | "Slagdörrar" | Nej |
| R | Genomgång | String | hiss.genomgang | "Nej" / "Ja" | Nej |
| S | Kollektiv | String | hiss.kollektiv | "Nedkollektiv" | Nej |
| T | Bärbeslag automatdörrar typ och år | String | hiss.barbeslag_autodorrar | "Inga automatdörrar" | Nej |
| U | Dörrmaskin / Korgdörr typ och år | String | hiss.dorrmaskin | "Ingen korgdörr" | Nej |
| V | Korgstorlek BxDjxH i mm | String | Parsas → korgstorlek_b, _d, _h | "1000*2050*2300" | Nej |
| W | Dagöppning dörrar BxH | String | Parsas → dagoppning_b, dagoppning_h | "900*2000" | Nej |
| X | Nödtelefon | String | Parsas → har_nodtelefon, nodtelefon_modell, nodtelefon_typ | "Nej" eller "Ja, Safeline, GSM med pictogram, Modell, SL6+" | Nej |
| Y | Hastighet i m/s | Float | hiss.hastighet_ms | 0.6 | Nej |
| Z | Lyfthöjd i m | Float | hiss.lyfthojd_m | 26 | Nej |
| AA | Schaktbelysning | String | hiss.schaktbelysning | "Ja Lysrör" | Nej |
| AB | Hisstyp | String | hiss.hisstyp | "Linhiss" | Ja |
| AC | Byggår | Integer/String | hiss.byggar | 1962 eller "Okänt" | Nej |
| AD | Moderniseringsår | Integer/String | hiss.moderniserar | 2011 eller "Ej ombyggd" | Nej |
| AE | Garanti | String | hiss.garanti | "Nej" / "Ja" | Nej |
| AF | Rekommenderat moderniseringsår | Integer | hiss.rekommenderat_moderniserar | 2033 | Nej |
| AG | Uppdaterat budgetbelopp 2026 | Float | hiss.budget_belopp | 1040000 | Nej |
| AH | EJ aktuellt budgetbelopp | String/Float | (Lagras separat — ej aktivt budgetbelopp) | "800000" | Nej |
| AI | Drivsystem | String | hiss.drivsystem | "Frekvensstyrd" | Nej |
| AJ | Upphängning | String | hiss.upphangning | "1;1" | Nej |
| AK | Hiss Fabrikat | String | hiss.fabrikat | "Asea" | Nej |
| AL | Maskinplacering | String | hiss.maskinplacering | "Toppmaskin dubbel omslutning" | Nej |
| AM | Typ av maskin och år | String | hiss.typ_maskin | "Asea HSE 40" | Nej |
| AN | Typ av styrsystem och år | String | hiss.typ_styrsystem | "Kone TMS50*1998" | Nej |
| AO | Övriga kommentarer | String | hiss.kommentarer | "Ursprunglig HR och maskin." | Nej |
| AP | Åtgärder vid modernisering | String (lång, kommaseparerad) | hiss.atgarder_vid_modernisering | "Styrsystem byts, Knappar & tablåer byts, ..." | Nej |

### 11.3 Flik: Nödtelefoner — kolumnspecifikation

Kolumnrubrikerna finns i rad 2. Data börjar på rad 3.

| Kolumn | Rubrik | Datatyp | Mappning | Exempel |
|---|---|---|---|---|
| A | Inventerings datum | String (YYYY-MM) | — (metadata) | "2021-09" |
| B | Kund | String | Matchas mot organisation | "Bostadsbolaget" |
| C | Distrikt/ Ort | String | — (finns redan på hissen) | "Hisingen" |
| D | Hissbeteckning | String | — (finns redan) | "Personhiss" |
| E | Hissadress | String | — (finns redan) | "Styrfarten 10" |
| F | Besiktningsorgan | String | — (finns redan) | "Dekra" |
| G | Hissnummer | String | Kopplingsnyckeln till hiss | "L7213741" |
| H | Nödtelefon | String | Parsas → nodtelefon-fält | "Ja, Safeline, GSM med pictogram, Modell, SL6+" |
| I | Uppdatering | String | nodtelefon_behover_uppgradering | "4G uppgradering" |
| J | Ca pris | Float | nodtelefon_uppgraderings_pris | 6500 |
| K | Pris | Float | (Faktiskt pris, om känt) | — |

Denna flik kopplas till hissar via kolumn G (Hissnummer). Vid import uppdateras nödtelefonfälten på motsvarande hiss.

### 11.4 Flik: Rivna hissar — kolumnspecifikation

**Viktigt:** Denna flik har samma kolumnstruktur som "Hissar" men med två skillnader:
1. Kolumn AH ("EJ aktuellt budgetbelopp") saknas — kolumnerna AI–AP i "Hissar" motsvarar AH–AO i "Rivna hissar" (en kolumns förskjutning)
2. Fliken saknar kolumnrubriker i rad 1 — data kan börja direkt på rad 2

Vid import sätts status till "rivd" för alla poster från denna flik.

### 11.5 Parsningsregler för sammansatta fält

Flera kolumner innehåller sammansatta värden som behöver parsas till separata fält:

**Märklast / Antal personer (kolumn O):** Format "VIKT*PERSONER" (t.ex. "500*6"). Separator: `*`. Delas till vikt i kg och antal personer. Kan även förekomma som "950 kg / 12 pers" eller liknande — parsern bör hantera båda format.

**Antal Plan / Antal Dörrar (kolumn P):** Format "PLAN*DÖRRAR" (t.ex. "10*10"). Separator: `*` eller `;`. Delas till antal_plan och antal_dorrar.

**Korgstorlek BxDjxH (kolumn V):** Format "B*Dj*H" i mm (t.ex. "1000*2050*2300"). Separator: `*`. Delas till korgstorlek_b, korgstorlek_d, korgstorlek_h.

**Dagöppning dörrar BxH (kolumn W):** Format "B*H" i mm (t.ex. "900*2000"). Separator: `*`. Delas till dagoppning_b, dagoppning_h.

**Nödtelefon (kolumn X):** Fritext som blandar status, fabrikat, modell och typ. Parsningslogik:
- Börjar med "Nej" → har_nodtelefon = false
- Börjar med "Ja" → har_nodtelefon = true, resten parsas för modell och typ
- Exempel: "Ja, Safeline, GSM med pictogram, Modell, SL6+" → har_nodtelefon: true, nodtelefon_modell: "Safeline SL6+", nodtelefon_typ: "GSM med pictogram"

**Byggår (kolumn AC):** Vanligtvis heltal (1962). Kan vara text ("Okänt", "2015-Schindler"). Parsern extraherar numeriskt årtal om möjligt, lagrar originalvärde som kommentar vid avvikande format.

**Moderniseringsår (kolumn AD):** Vanligtvis heltal (2011). Kan vara "Ej ombyggd" (→ null) eller fritext med suffix ("2007-vinga", "2014-Rc"). Parsern extraherar årtalet och lagrar suffix som kommentar.

**Upphängning (kolumn AJ):** Format "X;Y" eller "X:Y" (t.ex. "1;1", "2;1"). Lagras som string.

### 11.6 Importflöde

1. Admin laddar upp .xlsx-fil
2. Systemet kontrollerar att filen innehåller förväntade flikar ("Hissar" krävs, "Nödtelefoner" och "Rivna hissar" valfria)
3. Systemet läser kolumnrubriker från rad 2 i "Hissar" och validerar att obligatoriska kolumner (C, J, L, AB) finns
4. Förhandsgranskning visar:
   - Antal poster per flik
   - Antal nya hissar (hissnummer som inte finns i systemet)
   - Antal uppdaterade hissar (hissnummer som redan finns — data uppdateras)
   - Antal parsningsvarningar (sammansatta fält som inte kunde tolkas)
   - Felaktiga poster (saknar obligatoriska fält)
5. Admin granskar och bekräftar import
6. Import genomförs via Convex mutations (med transaktionsgaranti)
7. Valideringsrapport genereras

### 11.7 Valideringsregler

| Regel | Typ | Beskrivning |
|---|---|---|
| Hissnummer unikt | Fel | Dubbletter inom filen avvisas |
| Hissnummer ifyllt | Fel | Rader utan hissnummer hoppas över |
| Hissadress ifyllt | Fel | Rader utan adress avvisas |
| Hisstyp ifyllt | Fel | Rader utan hisstyp avvisas |
| Kund finns | Varning | Om kundnamnet inte matchar en befintlig organisation skapas en ny |
| Distrikt stavning | Varning | Om distriktet inte matchar befintliga (case-insensitive) visas förslag |
| Byggår rimligt | Varning | Om byggår < 1900 eller > nuvarande år |
| Parsningsfel | Varning | Om sammansatta fält inte kan tolkas — originalvärdet lagras som fritext |

### 11.8 Kända datakvalitetsproblem

| Problem | Förekomst | Åtgärd |
|---|---|---|
| Inkonsekvent distriktnamn ("Centrum/Haga" vs "Centrum/haga") | Vanligt | Normalisera till gemensam stavning (case-insensitive match) |
| Byggår som text ("Okänt", "2015-Schindler") | Sällsynt | Extrahera årtal; lagra original som kommentar |
| Moderniseringsår som fritext ("2007-vinga", "2014-Rc") | Vanligt | Extrahera årtal; lagra suffix som kommentar |
| Rivna hissar-fliken saknar kolumnrubriker | Alltid | Använd positionsbaserad mappning med känd kolumnförskjutning |
| Kolumn AH saknas i Rivna hissar | Alltid | Detektera automatiskt och justera kolumnmappning |
| Nödtelefon-fältet blandar status och modellinfo | Alltid | Parsning enligt regel i 11.5 |
| Tomma rader i slutet av flik | Vanligt | Ignorera rader där alla obligatoriska fält är tomma |

### 11.9 Combobox-mönster för kategorifält

Många fält i datamodellen (hisstyp, fabrikat, distrikt, skötselföretag, besiktningsorgan, hissbeteckning, dörrtyp, kollektiv, drivsystem, maskinplacering) representerar kategorier där vi inte kan förutse alla möjliga värden. Nya hisstyper, fabrikat och serviceföretag kan dyka upp när konsulten är ute i fält.

**Dessa fält ska inte lagras som databas-enums eller foreign keys till normaliserade tabeller.** Istället lagras värdet som en fri sträng direkt på hissen.

#### Lagring

- Kategorifält lagras som `string` direkt på hiss-dokumentet i Convex — inte som referens till en separat tabell
- En separat tabell `forslagsvarden` (suggestions) håller listan över kända värden per fältkategori, men den är enbart för UI-förslag — inte en constraint

```
forslagsvarden
├── id (PK)
├── kategori (string) — t.ex. "hisstyp", "fabrikat", "distrikt"
├── varde (string) — t.ex. "Linhiss", "Kone", "Väster"
├── aktiv (boolean) — false = visas inte som förslag men befintlig data bevaras
└── skapad_datum (timestamp)
```

#### UI-beteende (combobox)

1. Användaren börjar skriva → listan filtreras på befintliga förslag (fuzzy match)
2. Om ett befintligt värde matchar → välj det
3. Om inget matchar → användaren kan skriva ett helt nytt värde och bekräfta
4. Nytt värde sparas på hissen OCH läggs automatiskt till i `forslagsvarden` så att det föreslås nästa gång
5. Convex real-time: förslagslistan hämtas via `useQuery` och uppdateras automatiskt om nya värden läggs till av andra användare.

#### Undantag — fasta listor

Följande fält använder fasta listor som inte kan utökas i fält (dessa är genuina enums):

| Fält | Värden | Motivering |
|---|---|---|
| status | aktiv, rivd, arkiverad | Systemstatus — påverkar logik |
| besiktningsmanad | Januari–December | Kalenderbaserat, inga nya månader |
| genomgang | Ja, Nej | Binärt |
| garanti | Ja, Nej | Binärt |
| har_nodtelefon | Ja, Nej | Binärt |
| nodtelefon_behover_uppgradering | Ja, Nej | Binärt |

#### Fält som använder combobox-mönstret

| Fält | Initiala förslag (från befintlig data) |
|---|---|
| hisstyp | Linhiss, Linhydraulhiss, Hydraulhiss, MRL linhiss, Plattformshiss, Trapphiss, m.fl. (se bilaga C) |
| fabrikat | Kone, Kalea, Asea, Otis, Deve, Schindler, m.fl. (se bilaga C) |
| distrikt | Väster, Hisingen, Hammarkullen, Angered, m.fl. (se bilaga C) |
| skotselforetag | Hissteknik, Schindler, Vinga Hiss, Kone, m.fl. (se bilaga C) |
| besiktningsorgan | Dekra, Kiwa |
| hissbeteckning | Personhiss, Möbelhiss, Lasthiss |
| typ_dorrar | Automatdörrar, Slagdörrar, Halvautomatdörrar |
| kollektiv | Nedkollektiv, Fullkollektiv, Simplex |
| drivsystem | Frekvensstyrd, 2-hastighet, 1-hastighet |
| maskinplacering | Toppmaskin, Sidohängd toppmaskin, MRL, Bottenmaskin |
| atgarder_vid_modernisering | Styrsystem byts, Knappar & tablåer byts, Hissmaskineri byts, Linor byts, m.fl. (multi-select combobox) |

---

## 12. Säkerhet och regelefterlevnad

### GDPR
- Systemet lagrar personuppgifter (kontaktpersoner, e-post). Hanteras enligt GDPR.
- Databehandlingsavtal (DPA) med varje kundorganisation.
- Möjlighet att radera personuppgifter på begäran.
- Exportfunktion för registrerades data (data portability).

### Tenant isolation
- Varje Convex query/mutation filtreras på organisationsnivå
- En kund kan aldrig se en annan kunds data, varken via Convex-funktioner eller UI
- Tenant isolation implementeras i delad helper-funktion (`convex/auth.ts`) som alla funktioner använder

### Datalagring
- Convex hanterar automatisk backup (point-in-time recovery)
- localStorage-utkast innehåller enbart teknisk hissdata (inga personuppgifter)
- localStorage rensas vid lyckad submit

### Auditlogg
- Alla inloggningar, skapa/uppdatera-operationer och importer loggas
- Loggar tillgängliga för admin

### Felhantering vid import
- Import är transaktionell: allt eller inget (rollback vid kritiskt fel)
- Delvis lyckad import möjlig vid varningar — användaren väljer

---

## 13. Rivna hissar (arkiv)

Hissar kan markeras som "rivd" eller "arkiverad" via statusfältet. Dessa:
- Visas inte i standardvyer (filtrerade per default)
- Kan sökas fram via filter (status = rivd)
- Räknas inte med i KPI:er, budgetar eller moderniseringsplanering
- Behålls i databasen för historik

---

## 14. Framtida vidareutveckling (utanför v1)

Dessa funktioner ingår inte i v1 men arkitekturen ska stödja dem:

- **Foton** — Ladda upp och visa foton per hiss (Convex fillagring redan tillgänglig)
- **Kartvy** — Visa hissar på karta baserat på adress (geocoding)
- **Notifieringar** — Push-notiser vid kommande besiktning, moderniseringsdeadlines
- **Besiktningsrapporter** — Ladda upp PDF:er och koppla till hissar
- **Kundspecifika rapporter** — PDF-generering per distrikt, hisstyp, period
- **Tidsserie** — Spåra förändringar i en hiss över tid (versionshistorik)
- **Integration med besiktningsorgan** — Automatisk import av besiktningsresultat
- **Fleradministratörs-stöd** — Rollhantering med finare granularitet
- **Offline-först** — Service Worker och IndexedDB för fullständigt offline-arbete (om behov uppstår)

---

## 15. Framgångskriterier

| Kriterium | Mål |
|---|---|
| Fältarbete | Admin-användare använder appen (inte Excel) vid alla inventeringar inom 1 månad |
| Noll dataförlust | Ingen rapporterad förlust av pågående inmatning pga. nätverksavbrott inom 6 månader |
| Kundadoption | Minst en kund loggar in regelbundet inom 2 månader |
| Dubbelinmatning eliminerad | Admin-användaren matar in data en gång — ingen efterbearbetning |
| Svarstid | Kunden hittar specifik hiss inom 5 sekunder |
| Kundnöjdhet | Kunden föredrar portalen framför Excel-leverans |

---

## Bilagor

### A. Nyckeltal från befintlig data (Bostadsbolaget)

- **Totalt antal hissar:** 683
- **Kunder:** Bostadsbolaget (644 st), Fastighetsbolaget Bredfjäll KB (27 st)
- **Vanligaste hisstyp:** Linhiss (361 st, 53%)
- **Vanligaste fabrikat:** Kone (256 st, 37%), Kalea (143 st, 21%), Asea (72 st, 11%)
- **Vanligaste skötselföretag:** Hissteknik (443 st, 65%), Schindler (164 st, 24%)
- **Hissar utan modernisering:** 98 st ("Ej ombyggd")
- **Total budget 2026:** 383 233 500 SEK (för de 480 hissar som har budgetpost)
- **Snittbudget per hiss (med budgetpost):** ~798 000 SEK
- **Rekommenderad modernisering 2026:** 42 hissar
- **Rekommenderad modernisering 2027:** 36 hissar
- **Nödtelefoner som behöver 4G-uppgradering:** 669 poster

### B. Distrikt med flest hissar

1. Väster — 139
2. Hisingen — 135
3. Hammarkullen — 87
4. Angered — 74
5. Centrum/Landala — 58

### C. Befintliga fältvärden (initiala combobox-förslag)

**Hisstyper:** Linhiss, Linhydraulhiss, Hydraulhiss, MRL linhiss, Linhydraulhiss (Smalhiss), MRL linhiss (Remdriven), Linhiss toppsid, Plattformshiss, MRL Hydraulhiss, Trapphiss, Smalhiss

**Fabrikat:** Kone, Kalea, Asea, Otis, Deve, Bpa, Alexandersson, Schindler, Okänt, Siemens, Graham Brothers, Kleemann, GMV, ALT, Dansk Siemens

**Besiktningsorgan:** Dekra, Kiwa

**Skötselföretag:** Hissteknik, Schindler, Vinga Hiss, Kone, RC Hiss, Rikshiss, ALT Hiss, Element Hiss, GL hiss, Kalea
