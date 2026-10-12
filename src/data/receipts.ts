import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'
import { practicePath } from './repo'

export async function uploadReceipt(file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, '_')
  const path = `${practicePath()}/receipts/${crypto.randomUUID()}-${safeName}`
  await uploadBytes(ref(storage, path), file, { contentType: file.type })
  return path
}

export function receiptUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path))
}
