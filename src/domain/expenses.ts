export interface Category {
  id: string
  label: string
  account: string
  hint: string
}

export const CATEGORIES: Category[] = [
  { id: 'huisvesting', label: 'Huur en praktijkruimte', account: 'kosten-huisvesting', hint: 'Praktijkruimte in je woning: alleen het beroepsmatig gebruikte deel (pro rata oppervlakte) is aftrekbaar.' },
  { id: 'software-ict', label: 'ICT en software', account: 'kosten-ict', hint: 'Buitenlandse leveranciers (Zoom, Google, Microsoft) rekenen vaak geen btw aan: btw verlegd. Bespreek met je boekhouder.' },
  { id: 'lidmaatschappen', label: 'Lidmaatschappen en beroepsbijdragen', account: 'kosten-lidmaatschappen', hint: 'Bijdrage Psychologencommissie, beroepsvereniging, netwerk: volledig beroepsmatig.' },
  { id: 'verzekeringen', label: 'Verzekeringen', account: 'kosten-verzekeringen', hint: 'Beroepsaansprakelijkheid is een beroepskost. VAPZ en sociale bijdragen boek je niet hier; ze tellen apart mee in de belastingraming.' },
  { id: 'scholing', label: 'Vorming en bijscholing', account: 'kosten-vorming', hint: 'Opleidingen, congressen en vakliteratuur zijn aftrekbaar, inclusief verplaatsing.' },
  { id: 'supervisie', label: 'Supervisie en intervisie', account: 'kosten-supervisie', hint: 'Aftrekbaar als het nodig is voor je beroepsuitoefening.' },
  { id: 'testmateriaal', label: 'Testmateriaal', account: 'kosten-testmateriaal', hint: 'Duurzaam testmateriaal afschrijven over de gebruiksduur.' },
  { id: 'inventaris', label: 'Inrichting en materiaal', account: 'kosten-kantoor', hint: 'Duurzame aankopen afschrijven; kleine aankopen onder de drempel ineens als kost.' },
  { id: 'vervoer', label: 'Wagen en verplaatsingen', account: 'kosten-wagen', hint: 'Autokosten zijn aftrekbaar volgens de CO2-uitstoot van je wagen en enkel voor het beroepsmatige deel; houd een rittenlogboek bij.' },
  { id: 'kantoor', label: 'Kantoor en communicatie', account: 'kosten-kantoor', hint: 'Telefoon en internet bij gemengd gebruik: alleen het beroepsmatige deel.' },
  { id: 'marketing', label: 'Promotie', account: 'kosten-marketing', hint: 'Website, vermeldingen op platforms, drukwerk.' },
  { id: 'advies', label: 'Boekhouder en advies', account: 'kosten-boekhouder', hint: 'Volledig aftrekbaar.' },
  { id: 'bank', label: 'Bankkosten', account: 'kosten-bank', hint: 'Zichtrekening, betaalterminal, betaallinks.' },
  { id: 'onderaanneming', label: 'Onderaanneming en vervanging', account: 'kosten-onderaanneming', hint: 'Vraag altijd een factuur; let op schijnzelfstandigheid.' },
  { id: 'representatie', label: 'Representatie en restaurant', account: 'kosten-representatie', hint: 'Restaurantkosten 69% aftrekbaar, receptie- en geschenkkosten 50%; btw niet aftrekbaar.' },
]

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id)

export function supplierKey(supplier: string): string {
  return supplier
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\b(b\.v\.|bvba|bv|n\.v\.|nv|srl|sa|cv|vzw)$/, '')
    .trim()
}

export function suggestCategory(supplier: string, rules: Record<string, string>): string | null {
  return rules[supplierKey(supplier)] ?? null
}

export function shouldCapitalize(amountExclCents: number, thresholdCents: number): boolean {
  return amountExclCents > thresholdCents
}
