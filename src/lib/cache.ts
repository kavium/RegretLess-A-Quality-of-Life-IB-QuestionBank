import { openDB } from 'idb'

const DB_NAME = 'qol-ib-qb'
const STORE_NAME = 'kv'

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function getCacheItem<T>(key: string): Promise<T | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, key)
}

export async function setCacheItem<T>(key: string, value: T) {
  const db = await getDb()
  await db.put(STORE_NAME, value, key)
}
