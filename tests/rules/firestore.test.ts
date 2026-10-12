import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-boekhouding',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'practices/alice/invoices/i1'), { number: '2026-0001', status: 'open', totalCents: 7500, paidCents: 0, reminders: [], lines: [] })
    await setDoc(doc(ctx.firestore(), 'practices/alice/counters/invoice-2026'), { next: 2 })
    await setDoc(doc(ctx.firestore(), 'fiscalParameters/2026'), { year: 2026 })
  })
})

const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()

describe('practice data', () => {
  test('owner can read and write', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'practices/alice/expenses/x'), { amountInclCents: 100 }))
    await assertSucceeds(getDoc(doc(alice(), 'practices/alice/expenses/x')))
    await assertSucceeds(setDoc(doc(alice(), 'practices/alice'), { createdAt: 1 }))
  })
  test('other user cannot read or write', async () => {
    await assertFails(getDoc(doc(bob(), 'practices/alice/invoices/i1')))
    await assertFails(setDoc(doc(bob(), 'practices/alice/expenses/y'), { a: 1 }))
  })
  test('unauthenticated is denied', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'practices/alice/invoices/i1')))
  })
})

describe('invoices', () => {
  test('cannot be deleted', async () => {
    await assertFails(deleteDoc(doc(alice(), 'practices/alice/invoices/i1')))
  })
  test('number cannot change', async () => {
    await assertFails(updateDoc(doc(alice(), 'practices/alice/invoices/i1'), { number: '2026-0099' }))
  })
  test('content of an issued invoice cannot change', async () => {
    await assertFails(updateDoc(doc(alice(), 'practices/alice/invoices/i1'), { totalCents: 1 }))
    await assertFails(updateDoc(doc(alice(), 'practices/alice/invoices/i1'), { lines: [{ qty: 2 }] }))
  })
  test('payment status and reminders can change', async () => {
    await assertSucceeds(updateDoc(doc(alice(), 'practices/alice/invoices/i1'), { status: 'paid', paidCents: 7500, reminders: [{ level: 1, date: '2026-01-15' }] }))
  })
  test('creating needs the next number of that year, together with the counter', async () => {
    const db = alice()
    const batch = writeBatch(db)
    batch.set(doc(db, 'practices/alice/invoices/i2'), { number: '2026-0002', status: 'open' })
    batch.set(doc(db, 'practices/alice/counters/invoice-2026'), { next: 3 })
    await assertSucceeds(batch.commit())
  })
  test('creating with a number that skips or reuses the counter is refused', async () => {
    await assertFails(setDoc(doc(alice(), 'practices/alice/invoices/i3'), { number: '2026-0001', status: 'open' }))
    const db = alice()
    const batch = writeBatch(db)
    batch.set(doc(db, 'practices/alice/invoices/i4'), { number: '2026-0005', status: 'open' })
    batch.set(doc(db, 'practices/alice/counters/invoice-2026'), { next: 3 })
    await assertFails(batch.commit())
  })
  test('counter can only move forward by one', async () => {
    await assertFails(setDoc(doc(alice(), 'practices/alice/counters/invoice-2026'), { next: 1 }))
  })
})

describe('fiscal parameters', () => {
  test('readable when signed in, never writable', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'fiscalParameters/2026')))
    await assertFails(setDoc(doc(alice(), 'fiscalParameters/2026'), { year: 1 }))
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'fiscalParameters/2026')))
  })
})

describe('storage', () => {
  const pdf = new Uint8Array([37, 80, 68, 70])
  test('owner can upload a receipt', async () => {
    const storage = env.authenticatedContext('alice').storage()
    await assertSucceeds(uploadBytes(ref(storage, 'practices/alice/receipts/a.pdf'), pdf, { contentType: 'application/pdf' }))
  })
  test('other user cannot upload, wrong type rejected', async () => {
    await assertFails(uploadBytes(ref(env.authenticatedContext('bob').storage(), 'practices/alice/receipts/b.pdf'), pdf, { contentType: 'application/pdf' }))
    await assertFails(uploadBytes(ref(env.authenticatedContext('alice').storage(), 'practices/alice/receipts/c.exe'), pdf, { contentType: 'application/octet-stream' }))
  })
})
