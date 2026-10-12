import { expect, test } from 'vitest'
import { buildTasks } from '../../src/domain/tasks'
import type { BankTransaction, Consult } from '../../src/domain/types'

const consult = (id: string, status: Consult['status'], o: Partial<Consult> = {}): Consult => ({ id, externalId: id, date: '2026-01-05', debtorId: 'cm', serviceCode: '', amountCents: 100, status, paidCents: 0, ...o })
const tx = (id: string, confirmed: boolean): BankTransaction => ({ id, date: '2026-01-05', amountCents: 100, counterparty: '', description: '', importHash: id, confirmed })

test('only open work, in a fixed order, with counts', () => {
  const tasks = buildTasks({
    consults: [consult('a', 'rejected'), consult('b', 'rejected', { resolution: 'Opnieuw ingediend' }), consult('c', 'rejected', { invoiceId: 'i' })],
    invoices: [],
    debtors: [],
    transactions: [tx('t1', false), tx('t2', true)],
    today: '2026-02-01',
  })
  expect(tasks).toEqual([
    { id: 'rejections', label: '1 geweigerde sessie bekijken', route: 'consults', count: 1 },
    { id: 'bank', label: '1 banktransactie bevestigen', route: 'bank', count: 1 },
  ])
})

test('plural labels and unbilled sessions', () => {
  const tasks = buildTasks({
    consults: [consult('a', 'registered'), consult('b', 'registered')],
    invoices: [],
    debtors: [],
    transactions: [],
    today: '2026-02-01',
  })
  expect(tasks).toEqual([{ id: 'unbilled', label: '2 sessies nog te factureren', route: 'consults', count: 2 }])
})
