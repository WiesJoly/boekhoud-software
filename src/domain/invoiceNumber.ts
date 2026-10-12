export interface InvoiceCounter {
  year: number
  next: number
}

/** Pure part of gap-free numbering; the repository runs this inside a Firestore transaction. */
export function allocateInvoiceNumber(counter: InvoiceCounter | null, year: number): { number: string; counter: InvoiceCounter } {
  const seq = counter && counter.year === year ? counter.next : 1
  return { number: `${year}-${String(seq).padStart(4, '0')}`, counter: { year, next: seq + 1 } }
}

/** Neutral reference for the client's bank statement: never mentions therapy or care. */
export function paymentReference(practiceName: string, invoiceNumber: string): string {
  return `${practiceName} – factuur ${invoiceNumber}`
}

export function extractInvoiceNumbers(text: string): string[] {
  return text.match(/\b20\d{2}-\d{4,}\b/g) ?? []
}
