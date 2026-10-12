export interface Category {
  id: string
  label: string
  account: string
  hint: string
}

export const CATEGORIES: Category[] = [
  { id: 'huisvesting', label: 'Huisvesting', account: 'kosten-huisvesting', hint: 'Werkruimte thuis is alleen aftrekbaar onder strikte voorwaarden (zelfstandige ruimte).' },
  { id: 'software-ict', label: 'Software en ICT', account: 'kosten-ict', hint: 'Vaak buitenlandse leveranciers: btw verlegd.' },
  { id: 'lidmaatschappen', label: 'Beroepsregistratie en lidmaatschap', account: 'kosten-lidmaatschappen', hint: 'Volledig zakelijk.' },
  { id: 'verzekeringen', label: 'Verzekeringen', account: 'kosten-verzekeringen', hint: 'Een AOV is geen bedrijfskost maar een inkomensvoorziening (aftrekbaar in box 1).' },
  { id: 'scholing', label: 'Scholing en accreditatie', account: 'kosten-scholing', hint: 'Volledig aftrekbaar; neem reis- en verblijfkosten mee.' },
  { id: 'supervisie', label: 'Supervisie, intervisie, eigen therapie', account: 'kosten-supervisie', hint: 'Zakelijk als het voor de beroepsuitoefening vereist is.' },
  { id: 'testmateriaal', label: 'Testmateriaal', account: 'kosten-testmateriaal', hint: 'Duurzame testkoffers als bedrijfsmiddel activeren.' },
  { id: 'inventaris', label: 'Inventaris', account: 'kosten-kantoor', hint: 'Boven € 450 per stuk activeren en afschrijven; investeringsaftrek mogelijk.' },
  { id: 'vervoer', label: 'Vervoer', account: 'kosten-vervoer', hint: 'Kilometervergoeding per km; auto van de zaak betekent bijtelling.' },
  { id: 'kantoor', label: 'Kantoor en communicatie', account: 'kosten-kantoor', hint: 'Bij gemengd gebruik alleen het zakelijke deel.' },
  { id: 'marketing', label: 'Marketing', account: 'kosten-marketing', hint: 'Volledig zakelijk.' },
  { id: 'advies', label: 'Advies en administratie', account: 'kosten-advies', hint: 'Volledig zakelijk.' },
  { id: 'bank', label: 'Bank en betaalverkeer', account: 'kosten-bank', hint: 'Volledig zakelijk.' },
  { id: 'personeel', label: 'Personeel en inhuur', account: 'kosten-inhuur', hint: 'Loonheffingen bij personeel; let op schijnzelfstandigheid bij inhuur.' },
  { id: 'representatie', label: 'Representatie', account: 'kosten-representatie', hint: 'Beperkt aftrekbaar; btw niet terug te vragen.' },
]

export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id)

export function supplierKey(supplier: string): string {
  return supplier
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\b(b\.v\.|bv)$/, '')
    .trim()
}

export function suggestCategory(supplier: string, rules: Record<string, string>): string | null {
  return rules[supplierKey(supplier)] ?? null
}

export function shouldCapitalize(amountExclCents: number, thresholdCents: number): boolean {
  return amountExclCents > thresholdCents
}
