import type { ImportResult } from './bankImport'
import { parseCsv } from './csv'
import { parseAmount } from './money'
import type { Consult, ConsultStatus } from './types'

export type RejectionReason = 'insurability' | 'max_sessions' | 'referral_missing' | 'other'

export interface ParsedConsult {
  externalId: string
  date: string
  debtorName: string
  serviceCode: string
  amountCents: number
  status: ConsultStatus
  rejectionReason?: RejectionReason
  paidCents: number
}

const STATUS: Record<string, ConsultStatus> = {
  geregistreerd: 'registered',
  ingediend: 'declared',
  gefactureerd: 'declared',
  gedeclareerd: 'declared',
  geweigerd: 'rejected',
  afgewezen: 'rejected',
  betaald: 'paid',
}

const ACTIONS: Record<RejectionReason, string> = {
  insurability: 'Verzekerbaarheid niet in orde: vraag de cliënt de situatie bij het ziekenfonds na te kijken of factureer de sessie aan de cliënt.',
  max_sessions: 'Maximum aantal terugbetaalde sessies bereikt: bespreek met de cliënt verdere sessies aan het privétarief.',
  referral_missing: 'Verwijzing ontbreekt: vraag de verwijzing op en dien opnieuw in.',
  other: 'Bekijk de weigering op het platform en dien zo nodig opnieuw in.',
}

export function rejectionAction(reason: RejectionReason): string {
  return ACTIONS[reason]
}

function mapReason(text: string): RejectionReason {
  const t = text.toLowerCase()
  if (t.includes('verzekerba')) return 'insurability'
  if (t.includes('verwijzing') || t.includes('verwijsbrief')) return 'referral_missing'
  if (t.includes('maximum') || t.includes('aantal sessies')) return 'max_sessions'
  return 'other'
}

function normaliseDate(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

export function parseDeclarationFile(text: string): ImportResult<ParsedConsult> {
  const result: ImportResult<ParsedConsult> = { rows: [], errors: [] }
  const table = parseCsv(text, ';')
  const ALIASES: Record<string, string> = { consult_id: 'sessie_id', debiteur: 'ziekenfonds', prestatiecode: 'pseudocode', afwijsreden: 'reden' }
  const header = (table.shift() ?? []).map((h) => ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const required = ['sessie_id', 'datum', 'ziekenfonds', 'pseudocode', 'bedrag', 'status']
  const missing = required.filter((n) => col(n) < 0)
  if (missing.length) {
    result.errors.push({ line: 1, message: `Kolommen ontbreken: ${missing.join(', ')}` })
    return result
  }

  table.forEach((cells, i) => {
    const line = i + 2
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? '').trim() : '')
    const status = STATUS[get('status').toLowerCase()]
    const date = normaliseDate(get('datum'))
    const amount = parseAmount(get('bedrag'))
    // A paid session without an explicit paid amount was paid in full.
    const paid = get('betaald') ? parseAmount(get('betaald')) : status === 'paid' ? amount : 0
    const externalId = get('sessie_id')
    if (!externalId) return result.errors.push({ line, message: 'sessie_id ontbreekt' })
    if (!status) return result.errors.push({ line, message: `Onbekende status "${get('status')}"` })
    if (!date) return result.errors.push({ line, message: `Ongeldige datum "${get('datum')}"` })
    if (amount === null || paid === null) return result.errors.push({ line, message: 'Ongeldig bedrag' })
    const row: ParsedConsult = { externalId, date, debtorName: get('ziekenfonds'), serviceCode: get('pseudocode'), amountCents: amount, status, paidCents: paid }
    if (status === 'rejected') row.rejectionReason = mapReason(get('reden'))
    result.rows.push(row)
  })
  return result
}

/** Combine a re-imported row with what the app already knows; links made in the app survive re-imports. */
export function mergeConsult(existing: Consult | undefined, parsed: ParsedConsult, debtorId: string): Omit<Consult, 'id'> {
  const merged: Omit<Consult, 'id'> = {
    externalId: parsed.externalId,
    date: parsed.date,
    debtorId,
    serviceCode: parsed.serviceCode,
    amountCents: parsed.amountCents,
    status: parsed.status,
    paidCents: parsed.paidCents,
  }
  if (parsed.rejectionReason) merged.rejectionReason = parsed.rejectionReason
  if (existing?.invoiceId) merged.invoiceId = existing.invoiceId
  if (existing?.bankTransactionId) merged.bankTransactionId = existing.bankTransactionId
  if (existing?.resolution) merged.resolution = existing.resolution
  return merged
}
