import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { mergeConsult, parseDeclarationFile, rejectionAction } from '../../src/domain/declarationImport'
import type { Consult } from '../../src/domain/types'

const text = readFileSync(new URL('../fixtures/declaraties.csv', import.meta.url), 'utf8')

describe('parseDeclarationFile', () => {
  const { rows, errors } = parseDeclarationFile(text)
  test('parses all rows', () => {
    expect(errors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ externalId: 'EPD-1001', date: '2026-01-05', debtorName: 'CZ', serviceCode: 'CO0012', amountCents: 13246, status: 'paid', paidCents: 13246 })
  })
  test('normalises DD-MM-YYYY and maps rejection reasons', () => {
    expect(rows[1]).toMatchObject({ date: '2026-01-12', status: 'rejected', rejectionReason: 'referral_missing', paidCents: 0 })
  })
  test('empty paid amount means 0', () => {
    expect(rows[2]).toMatchObject({ status: 'declared', paidCents: 0 })
  })
  test('unknown status is a row error', () => {
    const result = parseDeclarationFile(text.replace('gedeclareerd', 'onbekend'))
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toEqual([{ line: 4, message: expect.stringContaining('status') }])
  })
  test('unparsable amount is a row error', () => {
    expect(parseDeclarationFile(text.replace('98,10', 'x')).errors).toHaveLength(1)
  })
})

describe('rejection reasons', () => {
  test.each([
    ['Verzekering beëindigd', 'insurance_ended'],
    ['verzekering beeindigd per 1-1', 'insurance_ended'],
    ['Maximum aantal consulten', 'max_reached'],
    ['Omzetplafond bereikt', 'max_reached'],
    ['Overig', 'other'],
  ])('%s → %s', (reason, code) => {
    const row = `EPD-9;2026-01-05;CZ;CO0012;10,00;afgewezen;${reason};`
    expect(parseDeclarationFile(`consult_id;datum;debiteur;prestatiecode;bedrag;status;afwijsreden;betaald\n${row}`).rows[0].rejectionReason).toBe(code)
  })
  test('actions', () => {
    expect(rejectionAction('referral_missing')).toBe('Verwijsbrief ontbreekt: vraag de verwijzing op en dien opnieuw in.')
    expect(rejectionAction('insurance_ended')).toBe('Verzekering beëindigd: factureer het consult aan de cliënt.')
  })
})

describe('mergeConsult', () => {
  test('keeps links from the existing consult and updates status', () => {
    const existing: Consult = { id: 'EPD-1001', externalId: 'EPD-1001', date: '2026-01-05', debtorId: 'd1', serviceCode: 'CO0012', amountCents: 13246, status: 'declared', paidCents: 0, invoiceId: 'x', bankTransactionId: 'tx-1', resolution: 'opnieuw ingediend' }
    const parsed = parseDeclarationFile(text).rows[0]
    const merged = mergeConsult(existing, parsed, 'd1')
    expect(merged).toMatchObject({ status: 'paid', paidCents: 13246, invoiceId: 'x', bankTransactionId: 'tx-1', resolution: 'opnieuw ingediend' })
    expect(merged).not.toHaveProperty('id')
  })
  test('new consult has no undefined fields', () => {
    const merged = mergeConsult(undefined, parseDeclarationFile(text).rows[2], 'd2')
    expect(Object.values(merged)).not.toContain(undefined)
  })
})
