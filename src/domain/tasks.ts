import { dueReminders } from './invoices'
import type { BankTransaction, Consult, Debtor, Invoice } from './types'

export interface Task {
  id: 'rejections' | 'reminders' | 'bank' | 'unbilled'
  label: string
  route: string
  count: number
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The weekly to-do list on the overview: only items that need action. */
export function buildTasks(ctx: { consults: Consult[]; invoices: Invoice[]; debtors: Debtor[]; transactions: BankTransaction[]; today: string }): Task[] {
  const rejections = ctx.consults.filter((c) => c.status === 'rejected' && !c.resolution && !c.invoiceId).length
  const reminders = dueReminders(ctx.invoices, ctx.debtors, ctx.today).length
  const bank = ctx.transactions.filter((t) => !t.confirmed).length
  const unbilled = ctx.consults.filter((c) => c.status === 'registered' && !c.invoiceId).length
  const tasks: Task[] = [
    { id: 'rejections', label: `${plural(rejections, 'geweigerde sessie', 'geweigerde sessies')} bekijken`, route: 'consults', count: rejections },
    { id: 'reminders', label: `${plural(reminders, 'herinnering', 'herinneringen')} versturen`, route: 'invoices', count: reminders },
    { id: 'bank', label: `${plural(bank, 'banktransactie', 'banktransacties')} bevestigen`, route: 'bank', count: bank },
    { id: 'unbilled', label: `${plural(unbilled, 'sessie', 'sessies')} nog te factureren`, route: 'consults', count: unbilled },
  ]
  return tasks.filter((t) => t.count > 0)
}
