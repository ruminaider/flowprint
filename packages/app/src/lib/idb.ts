const DB_NAME = 'flowprint-app'
const DB_VERSION = 1

/** Object store names */
export const STORES = {
  recentFiles: 'recent-files',
  settings: 'settings',
} as const

let dbPromise: Promise<IDBDatabase> | undefined

/** Open the database, creating object stores on first run. */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORES.recentFiles)) {
        db.createObjectStore(STORES.recentFiles)
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to open database'))
    }
  })

  return dbPromise
}

/** Get a value by key from a store. */
export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => {
      resolve(request.result as T | undefined)
    }
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to get value'))
    }
  })
}

/** Put a value by key into a store. */
export async function put(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value, key)
    request.onsuccess = () => {
      resolve()
    }
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to put value'))
    }
  })
}

/** Get all values from a store. */
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => {
      resolve(request.result as T[])
    }
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to get all values'))
    }
  })
}

/** Delete a value by key from a store. */
export async function del(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => {
      resolve()
    }
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to delete value'))
    }
  })
}

/** Clear all entries from a store. */
export async function clear(storeName: string): Promise<void> {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => {
      resolve()
    }
    request.onerror = () => {
      reject(new Error(request.error?.message ?? 'Failed to clear store'))
    }
  })
}
