import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { detectBankFormat, parseBankFile } from '../../src/domain/bankImport'

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')

describe('detectBankFormat', () => {
  test('detects each format', () => {
    expect(detectBankFormat(fixture('ing.csv'))).toBe('ing')
    expect(detectBankFormat(fixture('rabobank.csv'))).toBe('rabobank')
    expect(detectBankFormat(fixture('abnamro.txt'))).toBe('abnamro')
    expect(detectBankFormat(fixture('sample.mt940'))).toBe('mt940')
    expect(detectBankFormat('foo')).toBeNull()
  })
  test('parseBankFile throws on unknown format', () => {
    expect(() => parseBankFile('foo')).toThrow('Onbekend bankformaat')
  })
})

describe('ING', () => {
  const { rows, errors } = parseBankFile(fixture('ing.csv'))
  test('parses incoming and outgoing rows', () => {
    expect(errors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ date: '2026-01-05', amountCents: 123456, counterparty: 'CZ Zorgverzekeringen', description: 'Declaratie, januari' })
    expect(rows[1].amountCents).toBe(-1499)
  })
  test('row with unparsable amount becomes an error, others still import', () => {
    const text = fixture('ing.csv').replace('"14,99"', '"veertien"')
    const result = parseBankFile(text)
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toEqual([{ line: 3, message: expect.stringContaining('bedrag') }])
  })
})

describe('Rabobank', () => {
  test('signed amounts and joined descriptions', () => {
    const { rows } = parseBankFile(fixture('rabobank.csv'))
    expect(rows[0]).toMatchObject({ date: '2026-02-01', amountCents: -1250, counterparty: 'Bol.com', description: 'Bestelling 123' })
    expect(rows[1]).toMatchObject({ amountCents: 9500, description: 'factuur 2026-0002 extra' })
  })
})

describe('ABN AMRO', () => {
  test('tab-separated rows', () => {
    const { rows } = parseBankFile(fixture('abnamro.txt'))
    expect(rows[0]).toMatchObject({ date: '2026-03-01', amountCents: -1000, description: 'ZOOM.US SUBSCRIPTION' })
    expect(rows[1].amountCents).toBe(9500)
  })
})

describe('MT940', () => {
  test('credit and debit statement lines', () => {
    const { rows } = parseBankFile(fixture('sample.mt940'))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: '2026-01-05', amountCents: 9500, counterparty: 'J. de Vries' })
    expect(rows[0].description).toContain('factuur 2026-0001')
    expect(rows[1]).toMatchObject({ date: '2026-01-06', amountCents: -1250, counterparty: 'Zoom' })
  })
})

describe('importHash', () => {
  test('stable across re-imports', () => {
    const a = parseBankFile(fixture('ing.csv')).rows.map((r) => r.importHash)
    const b = parseBankFile(fixture('ing.csv')).rows.map((r) => r.importHash)
    expect(a).toEqual(b)
  })
  test('identical rows in one file get distinct hashes', () => {
    const lines = fixture('ing.csv').trim().split('\n')
    const { rows } = parseBankFile([...lines, lines[2]].join('\n'))
    expect(new Set(rows.map((r) => r.importHash)).size).toBe(4)
  })
})
