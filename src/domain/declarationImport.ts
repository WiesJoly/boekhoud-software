import type { ImportResult } from './bankImport'
import { parseCsv } from './csv'
import { parseAmount } from './money'
import type { Consult, ConsultStatus } from './types'

export type RejectionReason = 'insurance_ended' | 'referral_missing' | 'max_reached' | 'other'

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
  gedeclareerd: 'declared',
  afgewezen: 'rejected',
  betaald: 'paid',
}

const ACTIONS: Record<RejectionReason, string> = {
  insurance_ended: 'Verzekering beëindigd: factureer het consult aan de cliënt.',
  referral_missing: 'Verwijsbrief ontbreekt: vraag de verwijzing op en dien opnieuw in.',
  max_reached: 'Maximum bereikt: neem contact op met de verzekeraar over het plafond.',
  other: 'Bekijk de afwijzing in het EPD en dien zo nodig opnieuw in.',
}

export function rejectionAction(reason: RejectionReason): string {
  return ACTIONS[reason]
}

function mapReason(text: string): RejectionReason {
  const t = text.toLowerCase()
  if (t.includes('beëindigd') || t.includes('beeindigd')) return 'insurance_ended'
  if (t.includes('verwijzing')) return 'referral_missing'
  if (t.includes('maximum') || t.includes('plafond')) return 'max_reached'
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
  const header = (table.shift() ?? []).map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const required = ['consult_id', 'datum', 'debiteur', 'prestatiecode', 'bedrag', 'status']
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
    const paid = get('betaald') ? parseAmount(get('betaald')) : 0
    const externalId = get('consult_id')
    if (!externalId) return result.errors.push({ line, message: 'consult_id ontbreekt' })
    if (!status) return result.errors.push({ line, message: `Onbekende status "${get('status')}"` })
    if (!date) return result.errors.push({ line, message: `Ongeldige datum "${get('datum')}"` })
    if (amount === null || paid === null) return result.errors.push({ line, message: 'Ongeldig bedrag' })
    const row: ParsedConsult = { externalId, date, debtorName: get('debiteur'), serviceCode: get('prestatiecode'), amountCents: amount, status, paidCents: paid }
    if (status === 'rejected') row.rejectionReason = mapReason(get('afwijsreden'))
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
