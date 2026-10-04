export const EVIDENCE_DB_NAME = 'renta-demo-evidence'
export const EVIDENCE_STORE_NAME = 'photos'
export const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024
export const MAX_EVIDENCE_PER_COMMITMENT = 4

export const evidenceLabels = ['Before repair', 'After repair', 'Inspection'] as const
export type EvidenceLabel = typeof evidenceLabels[number]

export interface EvidenceMetadata {
  id: string
  commitmentId: string
  description: string
  label: EvidenceLabel
  mimeType: string
  size: number
  createdAt: string
}

export interface EvidenceFileDetails { type: string, size: number }

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateEvidenceDetails(file: EvidenceFileDetails | undefined, description: string, label: string, currentCount: number) {
  if (!file) return 'Choose a JPEG, PNG or WebP photo.'
  if (!allowedTypes.has(file.type)) return 'Photo must be a JPEG, PNG or WebP image.'
  if (file.size > MAX_EVIDENCE_FILE_SIZE) return 'Photo must be 5 MB or smaller.'
  if (!description.trim()) return 'Enter a short photo description.'
  if (!evidenceLabels.includes(label as EvidenceLabel)) return 'Choose a photo label.'
  if (currentCount >= MAX_EVIDENCE_PER_COMMITMENT) return 'A commitment can have up to 4 current photos.'
  return ''
}

export async function decodeImage(file: Blob) {
  if ('createImageBitmap' in globalThis) {
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    return
  }
  await new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve() }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be decoded.')) }
    image.src = url
  })
}

function openEvidenceDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB is unavailable.'))
    const request = indexedDB.open(EVIDENCE_DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(EVIDENCE_STORE_NAME)) request.result.createObjectStore(EVIDENCE_STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open photo storage.'))
  })
}

async function runRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openEvidenceDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(EVIDENCE_STORE_NAME, mode)
      const request = operation(transaction.objectStore(EVIDENCE_STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Photo storage operation failed.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Photo storage transaction was cancelled.'))
    })
  } finally { database.close() }
}

export function putEvidenceBlob(id: string, blob: Blob) { return runRequest('readwrite', (store) => store.put(blob, id)) }
export function getEvidenceBlob(id: string) { return runRequest<Blob | undefined>('readonly', (store) => store.get(id)) }

export function clearEvidenceDatabase() {
  return new Promise<void>((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB is unavailable.'))
    const request = indexedDB.deleteDatabase(EVIDENCE_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Could not clear photo storage.'))
    request.onblocked = () => reject(new Error('Photo storage is open in another tab. Close other RENTA tabs and try again.'))
  })
}
