import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import type { BankTransaction, Consult, Debtor, Expense, HoursEntry, Mileage, Service, Settings } from '../domain/types'
import { db } from '../firebase'
import { collectionRepo, practicePath } from './repo'

export const servicesRepo = collectionRepo<Service>('services')
export const debtorsRepo = collectionRepo<Debtor>('debtors')
export const consultsRepo = collectionRepo<Consult>('consults')
export const expensesRepo = collectionRepo<Expense>('expenses')
export const transactionsRepo = collectionRepo<BankTransaction>('bankTransactions')
export const mileageRepo = collectionRepo<Mileage>('mileage')
export const hoursRepo = collectionRepo<HoursEntry>('hours')
export const supplierRulesRepo = collectionRepo<{ id: string; category: string }>('supplierRules')

const settingsDoc = () => doc(db, practicePath(), 'settings', 'main')

export const settingsRepo = {
  subscribe(cb: (settings: Settings | null) => void, onError: (e: Error) => void): Unsubscribe {
    return onSnapshot(settingsDoc(), (snap) => cb(snap.exists() ? (snap.data() as Settings) : null), onError)
  },
  save(settings: Settings) {
    return setDoc(settingsDoc(), settings)
  },
}
