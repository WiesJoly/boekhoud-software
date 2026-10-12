import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { mergeConsult, parseDeclarationFile, rejectionAction } from '../../src/domain/declarationImport'
import type { Consult } from '../../src/domain/types'

const text = readFileSync(new URL('../fixtures/sessies.csv', import.meta.url), 'utf8')
const HEADER = 'sessie_id;datum;ziekenfonds;pseudocode;bedrag;status;reden;betaald'

describe('parseDeclarationFile', () => {
  const { rows, errors } = parseDeclarationFile(text)
  test('parses all rows', () => {
    expect(errors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ externalId: 'ELP-1001', date: '2026-01-05', debtorName: 'CM', serviceCode: '7980', amountCents: 7859, status: 'paid', paidCents: 7859 })
  })
  test('normalises DD-MM-YYYY and maps refusal reasons', () => {
    expect(rows[1]).toMatchObject({ date: '2026-01-12', status: 'rejected', rejectionReason: 'max_sessions', paidCents: 0 })
  })
  test('submitted without payment', () => {
    expect(rows[2]).toMatchObject({ status: 'declared', paidCents: 0, debtorName: 'Solidaris' })
  })
  test('unknown status is a row error', () => {
    const result = parseDeclarationFile(text.replace('ingediend', 'onbekend'))
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toEqual([{ line: 4, message: expect.stringContaining('status') }])
  })
  test('unparsable amount is a row error', () => {
    expect(parseDeclarationFile(text.replace('78,59;ingediend', 'x;ingediend')).errors).toHaveLength(1)
  })
  test('missing columns reported once', () => {
    expect(parseDeclarationFile('a;b\n1;2').errors[0].message).toContain('Kolommen ontbreken')
  })
})

describe('refusal reasons', () => {
  test.each([
    ['Verzekerbaarheid niet in orde', 'insurability'],
    ['Patiënt niet verzekerbaar', 'insurability'],
    ['Maximum aantal sessies bereikt', 'max_sessions'],
    ['Verwijzing ontbreekt', 'referral_missing'],
    ['Overig', 'other'],
  ])('%s → %s', (reason, code) => {
    const row = `S-9;2026-01-05;CM;7980;10,00;geweigerd;${reason};`
    expect(parseDeclarationFile(`${HEADER}\n${row}`).rows[0].rejectionReason).toBe(code)
  })
  test('actions', () => {
    expect(rejectionAction('referral_missing')).toBe('Verwijzing ontbreekt: vraag de verwijzing op en dien opnieuw in.')
    expect(rejectionAction('max_sessions')).toBe('Maximum aantal terugbetaalde sessies bereikt: bespreek met de cliënt verdere sessies aan het privétarief.')
  })
})

describe('mergeConsult', () => {
  test('keeps links from the existing session and updates status', () => {
    const existing: Consult = { id: 'ELP-1001', externalId: 'ELP-1001', date: '2026-01-05', debtorId: 'd1', serviceCode: '7980', amountCents: 7859, status: 'declared', paidCents: 0, invoiceId: 'x', bankTransactionId: 'tx-1', resolution: 'opnieuw ingediend' }
    const merged = mergeConsult(existing, parseDeclarationFile(text).rows[0], 'd1')
    expect(merged).toMatchObject({ status: 'paid', paidCents: 7859, invoiceId: 'x', bankTransactionId: 'tx-1', resolution: 'opnieuw ingediend' })
    expect(merged).not.toHaveProperty('id')
  })
  test('new session has no undefined fields', () => {
    expect(Object.values(mergeConsult(undefined, parseDeclarationFile(text).rows[2], 'd2'))).not.toContain(undefined)
  })
})

test('paid session with an empty betaald column counts the full amount', () => {
  const r = parseDeclarationFile(`${HEADER}\nS-1;2026-01-05;CM;7980;78,59;betaald;;`).rows[0]
  expect(r).toMatchObject({ status: 'paid', paidCents: 7859 })
})
