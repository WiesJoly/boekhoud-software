import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { detectBankFormat, parseBankFile } from '../../src/domain/bankImport'

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')

describe('detectBankFormat', () => {
  test('detects each format', () => {
    expect(detectBankFormat(fixture('sample.cod'))).toBe('coda')
    expect(detectBankFormat(fixture('sample.mt940'))).toBe('mt940')
    expect(detectBankFormat(fixture('belfius.csv'))).toBe('csv')
    expect(detectBankFormat('foo')).toBeNull()
  })
  test('parseBankFile throws on unknown format', () => {
    expect(() => parseBankFile('foo')).toThrow('Onbekend bankformaat')
  })
})

describe('CODA', () => {
  const { rows, errors } = parseBankFile(fixture('sample.cod'))
  test('credit with structured communication', () => {
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ date: '2026-01-05', amountCents: 9500, counterparty: 'JANSEN ANNA' })
    expect(rows[0].description).toContain('+++202/6000/14239+++')
  })
  test('debit with free communication over several records', () => {
    expect(rows[1]).toMatchObject({ date: '2026-01-06', amountCents: -1499, counterparty: 'ZOOM VIDEO COMMUNICATIONS' })
    expect(rows[1].description).toBe('ZOOM SUBSCRIPTION JANUARY MORE TEXT')
  })
  test('globalised movement counted once', () => {
    expect(rows).toHaveLength(3)
    expect(rows[2]).toMatchObject({ amountCents: 3000, counterparty: 'CM ZIEKENFONDS' })
  })
})

describe('generic CSV (Belfius export)', () => {
  test('skips intro lines, finds columns by name', () => {
    const { rows, errors } = parseBankFile(fixture('belfius.csv'))
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: '2026-02-03', amountCents: 9500, counterparty: 'A. Peeters', description: '+++202/6000/00697+++' })
    expect(rows[1]).toMatchObject({ date: '2026-02-04', amountCents: -1250, counterparty: 'Bol.com' })
  })
  test('KBC-style comma file with ISO dates', () => {
    const text = 'Datum,Bedrag,Naam,Omschrijving\n2026-03-01,"-10,00",Proximus,Internet\n'
    expect(parseBankFile(text).rows[0]).toMatchObject({ date: '2026-03-01', amountCents: -1000, counterparty: 'Proximus', description: 'Internet' })
  })
  test('row with unparsable amount becomes an error, others still import', () => {
    const result = parseBankFile(fixture('belfius.csv').replace('-12,50', 'twaalf'))
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toEqual([{ line: 6, message: expect.stringContaining('bedrag') }])
  })
})

describe('MT940', () => {
  test('credit and debit statement lines', () => {
    const { rows } = parseBankFile(fixture('sample.mt940'))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: '2026-01-05', amountCents: 9500, counterparty: 'J. de Vries' })
    expect(rows[1]).toMatchObject({ date: '2026-01-06', amountCents: -1250, counterparty: 'Zoom' })
  })
})

describe('importHash', () => {
  test('stable across re-imports', () => {
    const a = parseBankFile(fixture('sample.cod')).rows.map((r) => r.importHash)
    expect(parseBankFile(fixture('sample.cod')).rows.map((r) => r.importHash)).toEqual(a)
  })
  test('identical rows in one file get distinct hashes', () => {
    const text = 'Datum;Bedrag;Naam tegenpartij;Mededeling\n01/03/2026;10,00;X;Y\n01/03/2026;10,00;X;Y\n'
    const { rows } = parseBankFile(text)
    expect(new Set(rows.map((r) => r.importHash)).size).toBe(2)
  })
})
