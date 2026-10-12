import { extractInvoiceNumbers } from './invoiceNumber'
import { allocatePayment } from './invoices'
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
      return { type: 'invoice', ids: invoices.map((i) => i.id), reason: `Factuur ${invoices.map((i) => i.number).join(', ')} herkend in de mededeling` }
    }

    const counterparty = tx.counterparty.toLowerCase()
    const payer = ctx.debtors.find(
      (d) => (d.type === 'mutuality' || d.type === 'network') && d.displayName && counterparty.includes(d.displayName.toLowerCase()),
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
        if (sum === tx.amountCents) return { type: 'consults', ids, reason: `${ids.length} betaalde sessies van ${payer.displayName}` }
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

export interface ConfirmationPlan {
  invoiceUpdates: { id: string; paidCents: number; status: Invoice['status'] }[]
  consultIds: string[]
}

/** What confirming a bank match changes. Refuses a transaction that is already linked, so retries never pay twice. */
export function planConfirmation(tx: BankTransaction, match: { type: MatchType; ids: string[] }, invoices: Invoice[], credits: Invoice[] = []): ConfirmationPlan {
  if (tx.confirmed) throw new Error('Deze transactie is al gekoppeld')
  if (match.type === 'invoice') {
    const matched = match.ids.map((id) => invoices.find((i) => i.id === id)).filter((i): i is Invoice => !!i)
    return { invoiceUpdates: allocatePayment(matched, credits, tx.amountCents), consultIds: [] }
  }
  return { invoiceUpdates: [], consultIds: match.type === 'consults' ? match.ids : [] }
}
