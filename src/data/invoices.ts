import { collection, doc, onSnapshot, runTransaction, updateDoc, type DocumentData, type Unsubscribe } from 'firebase/firestore'
import { allocateInvoiceNumber, paymentReference, type InvoiceCounter } from '../domain/invoiceNumber'
import { buildCreditLines, invoiceTotals } from '../domain/invoices'
import type { Invoice } from '../domain/types'
import { db } from '../firebase'
import { practicePath } from './repo'

export type InvoiceDraft = Omit<Invoice, 'id' | 'number' | 'paymentReference'>

const invoicesCol = () => collection(db, practicePath(), 'invoices')

export const invoicesRepo = {
  subscribe(cb: (items: Invoice[]) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(invoicesCol(), (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Invoice, 'id'>), id: d.id }))), onError)
  },
  update(id: string, patch: Partial<Omit<Invoice, 'id' | 'number'>>) {
    return updateDoc(doc(invoicesCol(), id), patch as DocumentData)
  },
}

/** Allocates the next gap-free number and stores the invoice in one transaction. */
export async function createInvoice(draft: InvoiceDraft, afterCreate?: (tx: { update: (path: string, data: DocumentData) => void }) => void): Promise<Invoice> {
  const counterRef = doc(db, practicePath(), 'counters', 'invoice')
  const invoiceRef = doc(invoicesCol())
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const counter = snap.exists() ? (snap.data() as InvoiceCounter) : null
    const { number, counter: next } = allocateInvoiceNumber(counter, Number(draft.date.slice(0, 4)))
    const invoice: Invoice = { ...draft, id: invoiceRef.id, number, paymentReference: paymentReference(number) }
    const { id: _id, ...data } = invoice
    tx.set(counterRef, next)
    tx.set(invoiceRef, data)
    afterCreate?.({ update: (path, d) => tx.update(doc(db, practicePath(), path), d) })
    return invoice
  })
}

export async function createCredit(original: Invoice, date: string): Promise<Invoice> {
  const lines = buildCreditLines(original)
  return createInvoice(
    {
      kind: 'credit',
      creditOf: original.id,
      date,
      dueDate: date,
      debtorId: original.debtorId,
      lines,
      ...invoiceTotals(lines),
      paidCents: 0,
      status: 'paid',
      reminders: [],
    },
    (tx) => tx.update(`invoices/${original.id}`, { status: 'credited' }),
  )
}
