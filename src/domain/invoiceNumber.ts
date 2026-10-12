/** One counter document per year, so back-dated invoices never reset another year's sequence. */
export function invoiceCounterId(year: number): string {
  return `invoice-${year}`
}

/** Pure part of gap-free numbering; the repository runs this inside a Firestore transaction on that year's counter. */
export function allocateInvoiceNumber(next: number | null, year: number): { number: string; next: number } {
  const seq = next ?? 1
  return { number: `${year}-${String(seq).padStart(4, '0')}`, next: seq + 1 }
}

const longDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Invoices are numbered chronologically: a new invoice may not be dated before the last one of the same year,
 * and only the current or previous calendar year can still be invoiced. Returns a Dutch explanation, or null.
 */
export function chronologyProblem(date: string, issued: { date: string; kind: 'invoice' | 'credit' }[], today?: string): string | null {
  const year = date.slice(0, 4)
  if (today && Number(year) < Number(today.slice(0, 4)) - 1) {
    return `Je kunt geen factuur meer maken in ${year}. Kies een datum in dit of vorig jaar.`
  }
  const last = issued.filter((i) => i.date.startsWith(year)).reduce((max, i) => (i.date > max ? i.date : max), '')
  if (last && date < last) {
    return `De factuurdatum ligt vóór je laatste factuur van ${longDate(last)}. Facturen moeten chronologisch genummerd zijn.`
  }
  return null
}

const checkDigits = (base: string) => String(Number(BigInt(base) % 97n) || 97).padStart(2, '0')

/** Belgian gestructureerde mededeling (OGM): year + 6-digit sequence + mod-97 check, as +++123/4567/89012+++. */
export function structuredCommunication(invoiceNumber: string): string {
  const [year, seq] = invoiceNumber.split('-')
  const base = `${year}${seq.padStart(6, '0').slice(-6)}`
  const digits = base + checkDigits(base)
  return `+++${digits.slice(0, 3)}/${digits.slice(3, 7)}/${digits.slice(7)}+++`
}

/** Neutral reference for the client's bank statement: the OGM never reveals anything about care. */
export function paymentReference(invoiceNumber: string): string {
  return structuredCommunication(invoiceNumber)
}

/** Invoice numbers mentioned in a bank description, either literally or as a valid OGM. */
export function extractInvoiceNumbers(text: string): string[] {
  const found = new Set(text.match(/\b20\d{2}-\d{4,}\b/g) ?? [])
  const ogm = /(?<!\d)(\d{3})[\s/]?(\d{4})[\s/]?(\d{5})(?!\d)/g
  for (const m of text.matchAll(ogm)) {
    const digits = m[1] + m[2] + m[3]
    const base = digits.slice(0, 10)
    if (!digits.startsWith('20') || checkDigits(base) !== digits.slice(10)) continue
    found.add(`${base.slice(0, 4)}-${String(Number(base.slice(4))).padStart(4, '0')}`)
  }
  return [...found]
}
