import { extractInvoiceNumbers } from './invoiceNumber'
import type { BankTransaction, Consult, Debtor, Expense, Invoice, MatchType } from './types'

export interface MatchContext {
  invoices: Invoice[]
  consults: Consult[]
  debtors: Debtor[]
  expenses: Expense[]
  /** Other transactions, used to skip expenses that are already linked. */
  transactions: BankTransaction[]
}

export interface MatchSuggestion {
  type: MatchType
  ids: string[]
  reason: string
}

export function suggestMatch(tx: BankTransaction, ctx: MatchContext): MatchSuggestion | null {
  if (tx.amountCents > 0) {
    const numbers = extractInvoiceNumbers(tx.description)
    const invoices = ctx.invoices.filter((i) => i.status === 'open' && i.kind === 'invoice' && numbers.includes(i.number))
    if (invoices.length) {
      return { type: 'invoice', ids: invoices.map((i) => i.id), reason: `Factuurnummer ${invoices.map((i) => i.number).join(', ')} in omschrijving` }
    }

    const counterparty = tx.counterparty.toLowerCase()
    const payer = ctx.debtors.find(
      (d) => (d.type === 'insurer' || d.type === 'municipality') && d.displayName && counterparty.includes(d.displayName.toLowerCase()),
    )
    if (payer) {
      const open = ctx.consults
        .filter((c) => c.debtorId === payer.id && c.status === 'paid' && !c.bankTransactionId)
        .sort((a, b) => a.date.localeCompare(b.date))
      let sum = 0
      const ids: string[] = []
      for (const c of open) {
        sum += c.paidCents
        ids.push(c.id)
        if (sum === tx.amountCents) return { type: 'consults', ids, reason: `${ids.length} betaalde consulten van ${payer.displayName}` }
        if (sum > tx.amountCents) break
      }
    }
    return null
  }

  const linked = new Set(ctx.transactions.filter((t) => t.id !== tx.id && t.match?.type === 'expense').flatMap((t) => t.match!.ids))
  const counterparty = tx.counterparty.toLowerCase()
  const expense = ctx.expenses.find(
    (e) => !linked.has(e.id) && e.amountInclCents === -tx.amountCents && e.supplier && counterparty.includes(e.supplier.toLowerCase()),
  )
  return expense ? { type: 'expense', ids: [expense.id], reason: `Uitgave bij ${expense.supplier}` } : null
}
