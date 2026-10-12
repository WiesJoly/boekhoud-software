import { parseCsv } from './csv'
import { parseAmount } from './money'

export interface ParsedBankRow {
  date: string
  amountCents: number
  counterparty: string
  description: string
  importHash: string
}

export interface ImportResult<T> {
  rows: T[]
  errors: { line: number; message: string }[]
}

export type BankFormat = 'coda' | 'mt940' | 'csv'

type RawRow = Omit<ParsedBankRow, 'importHash'>

const COLUMNS = {
  date: ['boekingsdatum', 'uitvoeringsdatum', 'datum', 'date', 'valutadatum'],
  amount: ['bedrag', 'amount', 'montant'],
  counterparty: ['naam tegenpartij bevat', 'naam tegenpartij', 'tegenpartij', 'naam', 'counterparty', 'name'],
  description: ['mededelingen', 'mededeling', 'vrije mededeling', 'gestructureerde mededeling', 'omschrijving', 'description', 'details'],
}

export function detectBankFormat(text: string): BankFormat | null {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length && lines[0].startsWith('0') && lines.some((l) => l.startsWith('21')) && lines.every((l) => l.length === 128)) return 'coda'
  if (/^:61:/m.test(text)) return 'mt940'
  return findCsvHeader(text) ? 'csv' : null
}

export function parseBankFile(text: string): ImportResult<ParsedBankRow> {
  const format = detectBankFormat(text)
  if (!format) throw new Error('Onbekend bankformaat')
  const raw = format === 'coda' ? parseCoda(text) : format === 'mt940' ? parseMt940(text) : parseGenericCsv(text)
  return { rows: withHashes(raw.rows), errors: raw.errors }
}

function normaliseDate(s: string): string | null {
  const t = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

const delimiterOf = (line: string) => ((line.match(/;/g)?.length ?? 0) >= (line.match(/,/g)?.length ?? 0) ? ';' : ',')

/** Locates the header row (banks often prepend account info) and the column index per field. */
function findCsvHeader(text: string): { line: number; delimiter: string; col: Record<keyof typeof COLUMNS, number[]> } | null {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const delimiter = delimiterOf(lines[i])
    const cells = parseCsv(lines[i], delimiter)[0]?.map((c) => c.trim().toLowerCase()) ?? []
    const find = (names: string[]) => {
      for (const n of names) {
        const idx = cells.indexOf(n)
        if (idx >= 0) return [idx]
      }
      return []
    }
    const col = {
      date: find(COLUMNS.date),
      amount: find(COLUMNS.amount),
      counterparty: find(COLUMNS.counterparty),
      description: COLUMNS.description.map((n) => cells.indexOf(n)).filter((x) => x >= 0),
    }
    if (col.date.length && col.amount.length) return { line: i, delimiter, col }
  }
  return null
}

function parseGenericCsv(text: string): ImportResult<RawRow> {
  const result: ImportResult<RawRow> = { rows: [], errors: [] }
  const header = findCsvHeader(text)!
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  for (let i = header.line + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cells = parseCsv(lines[i], header.delimiter)[0] ?? []
    const get = (idx: number[]) => idx.map((x) => (cells[x] ?? '').trim()).filter(Boolean).join(' ')
    const line = i + 1
    const amount = parseAmount(get(header.col.amount))
    const date = normaliseDate(get(header.col.date))
    if (amount === null) result.errors.push({ line, message: 'Ongeldig bedrag: bedrag kon niet worden gelezen' })
    else if (!date) result.errors.push({ line, message: 'Ongeldige datum' })
    else result.rows.push({ date, amountCents: amount, counterparty: get(header.col.counterparty), description: get(header.col.description) })
  }
  return result
}

/** CODA (Belgian bank statement standard), 128-character records. Only movement records with detail number 0000 are booked, so globalised payments count once. */
function parseCoda(text: string): ImportResult<RawRow> {
  const result: ImportResult<RawRow> = { rows: [], errors: [] }
  const field = (line: string, from: number, to: number) => line.slice(from - 1, to)
  const ddmmyy = (s: string) => `20${s.slice(4, 6)}-${s.slice(2, 4)}-${s.slice(0, 2)}`
  let current: RawRow | null = null
  const parts: string[] = []
  const flush = () => {
    if (current) {
      current.description = parts.join('').replace(/\s+/g, ' ').trim()
      result.rows.push(current)
    }
    current = null
    parts.length = 0
  }

  text.split(/\r?\n/).forEach((line, i) => {
    const type = line.slice(0, 2)
    const detail = field(line, 7, 10)
    if (type === '21') {
      flush()
      if (detail !== '0000') return
      const amount = Number(field(line, 33, 47))
      if (!Number.isFinite(amount)) return result.errors.push({ line: i + 1, message: 'Ongeldig bedrag: bedrag kon niet worden gelezen' })
      const cents = Math.round(amount / 10)
      current = { date: ddmmyy(field(line, 116, 121)), amountCents: field(line, 32, 32) === '1' ? -cents : cents, counterparty: '', description: '' }
      if (field(line, 62, 62) === '1' && field(line, 63, 65) === '101') {
        const d = field(line, 66, 77)
        parts.push(`+++${d.slice(0, 3)}/${d.slice(3, 7)}/${d.slice(7)}+++`)
      } else parts.push(field(line, 63, 115))
    } else if (type === '22' && current && detail === '0000') {
      parts.push(field(line, 11, 63))
    } else if (type === '23' && current && detail === '0000') {
      ;(current as RawRow).counterparty = field(line, 48, 82).trim()
      parts.push(field(line, 83, 125))
    } else if (type[0] === '8' || type[0] === '9') flush()
  })
  flush()
  return result
}

function parseMt940(text: string): ImportResult<RawRow> {
  const result: ImportResult<RawRow> = { rows: [], errors: [] }
  const lines = text.split(/\r?\n/)
  let current: RawRow | null = null
  let inDescription = false
  const flush = () => { if (current) result.rows.push(current); current = null }

  lines.forEach((line, i) => {
    const m61 = line.match(/^:61:(\d{6})(\d{4})?(R?[CD])[A-Z]?([\d,]+)/)
    if (m61) {
      flush()
      inDescription = false
      const amount = parseAmount(m61[4])
      if (amount === null) { result.errors.push({ line: i + 1, message: 'Ongeldig bedrag: bedrag kon niet worden gelezen' }); return }
      const debit = m61[3].endsWith('D') !== m61[3].startsWith('R')
      current = { date: `20${m61[1].slice(0, 2)}-${m61[1].slice(2, 4)}-${m61[1].slice(4, 6)}`, amountCents: debit ? -amount : amount, counterparty: '', description: '' }
    } else if (line.startsWith(':86:') && current) {
      inDescription = true
      current.description = line.slice(4).trim()
    } else if (line.startsWith(':')) {
      inDescription = false
    } else if (inDescription && current) {
      current.description += ' ' + line.trim()
    }
  })
  flush()
  for (const row of result.rows) {
    const name = row.description.match(/\/NAME\/([^/]*)/)
    if (name) row.counterparty = name[1].trim()
  }
  return result
}

/** Deterministic 53-bit hash (cyrb53) — Firestore-safe document id. */
function hash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

function withHashes(rows: RawRow[]): ParsedBankRow[] {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    const key = `${r.date}|${r.amountCents}|${r.counterparty}|${r.description}`
    const n = seen.get(key) ?? 0
    seen.set(key, n + 1)
    return { ...r, importHash: `tx-${hash(`${key}|${n}`)}` }
  })
}
