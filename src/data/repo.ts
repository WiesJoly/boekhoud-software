import {
  addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore'
import { auth, db } from '../firebase'

export function practicePath(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Niet ingelogd')
  return `practices/${uid}`
}

export interface CollectionRepo<T extends { id: string }> {
  subscribe(cb: (items: T[]) => void, onError: (e: Error) => void): Unsubscribe
  add(data: Omit<T, 'id'>): Promise<string>
  update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<void>
  upsert(id: string, data: Omit<T, 'id'>): Promise<void>
  upsertMany(items: { id: string; data: Omit<T, 'id'> }[]): Promise<void>
  remove(id: string): Promise<void>
}

/** Repository for `practices/{uid}/{name}`; the uid is resolved at call time. */
export function collectionRepo<T extends { id: string }>(name: string): CollectionRepo<T> {
  const col = () => collection(db, practicePath(), name)
  return {
    subscribe(cb, onError) {
      return onSnapshot(col(), (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<T, 'id'>), id: d.id }) as T)), onError)
    },
    async add(data) {
      return (await addDoc(col(), data as DocumentData)).id
    },
    update(id, patch) {
      return updateDoc(doc(col(), id), patch as DocumentData)
    },
    upsert(id, data) {
      return setDoc(doc(col(), id), data as DocumentData)
    },
    async upsertMany(items) {
      // Firestore batches are limited to 500 writes.
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(db)
        for (const { id, data } of items.slice(i, i + 400)) batch.set(doc(col(), id), data as DocumentData)
        await batch.commit()
      }
    },
    remove(id) {
      return deleteDoc(doc(col(), id))
    },
  }
}
