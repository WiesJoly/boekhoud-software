export interface InvoiceCounter {
  year: number
  next: number
}

/** Pure part of gap-free numbering; the repository runs this inside a Firestore transaction. */
export function allocateInvoiceNumber(counter: InvoiceCounter | null, year: number): { number: string; counter: InvoiceCounter } {
  const seq = counter && counter.year === year ? counter.next : 1
  return { number: `${year}-${String(seq).padStart(4, '0')}`, counter: { year, next: seq + 1 } }
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
