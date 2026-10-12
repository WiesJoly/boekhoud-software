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

export type BankFormat = 'ing' | 'rabobank' | 'abnamro' | 'mt940'

type RawRow = Omit<ParsedBankRow, 'importHash'>

export function detectBankFormat(text: string): BankFormat | null {
  if (/^:61:/m.test(text)) return 'mt940'
  const first = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? ''
  if (first.includes('Af Bij')) return 'ing'
  if (first.includes('Naam tegenpartij')) return 'rabobank'
  const cols = first.split('\t')
  if (cols.length >= 8 && /^\d{8}$/.test(cols[2])) return 'abnamro'
  return null
}

export function parseBankFile(text: string): ImportResult<ParsedBankRow> {
  const format = detectBankFormat(text)
  if (!format) throw new Error('Onbekend bankformaat')
  const raw = format === 'mt940' ? parseMt940(text) : parseTabular(text, format)
  return { rows: withHashes(raw.rows), errors: raw.errors }
}

const ymd = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`

function parseTabular(text: string, format: Exclude<BankFormat, 'mt940'>): ImportResult<RawRow> {
  const result: ImportResult<RawRow> = { rows: [], errors: [] }
  const table = parseCsv(text, format === 'abnamro' ? '\t' : ',')
  const header = format === 'abnamro' ? null : table.shift()!
  const col = (name: string) => header!.indexOf(name)

  table.forEach((cells, index) => {
    const line = index + (header ? 2 : 1)
    let row: RawRow | string
    if (format === 'ing') {
      const amount = parseAmount(cells[col('Bedrag (EUR)')] ?? '')
      row = amount === null ? 'Ongeldig bedrag' : {
        date: ymd(cells[col('Datum')]),
        amountCents: cells[col('Af Bij')] === 'Af' ? -Math.abs(amount) : Math.abs(amount),
        counterparty: cells[col('Naam / Omschrijving')] ?? '',
        description: cells[col('Mededelingen')] ?? '',
      }
    } else if (format === 'rabobank') {
      const amount = parseAmount(cells[col('Bedrag')] ?? '')
      const description = ['Omschrijving-1', 'Omschrijving-2', 'Omschrijving-3']
        .map((n) => (col(n) >= 0 ? cells[col(n)] ?? '' : ''))
        .filter(Boolean)
        .join(' ')
      row = amount === null ? 'Ongeldig bedrag' : {
        date: cells[col('Datum')],
        amountCents: amount,
        counterparty: cells[col('Naam tegenpartij')] ?? '',
        description,
      }
    } else {
      const amount = parseAmount(cells[6] ?? '')
      row = amount === null ? 'Ongeldig bedrag' : { date: ymd(cells[2]), amountCents: amount, counterparty: '', description: (cells[7] ?? '').trim() }
    }
    if (typeof row === 'string') result.errors.push({ line, message: `${row}: bedrag kon niet worden gelezen` })
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) result.errors.push({ line, message: 'Ongeldige datum' })
    else result.rows.push(row)
  })
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
