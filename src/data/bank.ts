import { doc, runTransaction } from 'firebase/firestore'
import { planConfirmation } from '../domain/matching'
import type { BankTransaction, Invoice, MatchType } from '../domain/types'
import { db } from '../firebase'
import { practicePath } from './repo'

/** Confirms a bank match and applies its effects in one transaction, re-reading the transaction and invoices first. */
export function confirmBankMatch(txId: string, match: { type: MatchType; ids: string[] }, credits: Invoice[]): Promise<void> {
  const base = practicePath()
  return runTransaction(db, async (t) => {
    const txSnap = await t.get(doc(db, base, 'bankTransactions', txId))
    if (!txSnap.exists()) throw new Error('Transactie niet gevonden')
    const bankTx = { ...(txSnap.data() as Omit<BankTransaction, 'id'>), id: txId }
    const invoices: Invoice[] = []
    if (match.type === 'invoice') {
      for (const id of match.ids) {
        const snap = await t.get(doc(db, base, 'invoices', id))
        if (snap.exists()) invoices.push({ ...(snap.data() as Omit<Invoice, 'id'>), id })
      }
    }
    const plan = planConfirmation(bankTx, match, invoices, credits)
    for (const u of plan.invoiceUpdates) t.update(doc(db, base, 'invoices', u.id), { paidCents: u.paidCents, status: u.status })
    for (const id of plan.consultIds) t.update(doc(db, base, 'consults', id), { bankTransactionId: txId })
    t.update(doc(db, base, 'bankTransactions', txId), { match, confirmed: true })
  })
}
