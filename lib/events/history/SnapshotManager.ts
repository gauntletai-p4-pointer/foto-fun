import { nanoid } from 'nanoid'
import { EventStore } from '../core/EventStore'
import { TypedEventBus } from '../core/TypedEventBus'

export interface Snapshot {
  id: string
  name: string
  description?: string
  eventId: string
  timestamp: number
  thumbnail?: string
}

export interface SnapshotStorage {
  save(snapshot: Snapshot): Promise<void>
  load(snapshotId: string): Promise<Snapshot | null>
  delete(snapshotId: string): Promise<void>
  list(): Promise<Snapshot[]>
}

/**
 * IndexedDB storage for snapshots
 */
class IndexedDBSnapshotStorage implements SnapshotStorage {
  private dbName = 'fotofun-snapshots'
  private storeName = 'snapshots'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  async save(snapshot: Snapshot): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(snapshot)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async load(snapshotId: string): Promise<Snapshot | null> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(snapshotId)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async delete(snapshotId: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(snapshotId)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async list(): Promise<Snapshot[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
}

/**
 * Manages history snapshots (named checkpoints)
 */
export class SnapshotManager {
  private storage: SnapshotStorage
  private snapshots: Map<string, Snapshot> = new Map()
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    storage?: SnapshotStorage
  ) {
    this.storage = storage || new IndexedDBSnapshotStorage()
    this.loadSnapshots()
  }

  /**
   * Load all snapshots from storage
   */
  private async loadSnapshots(): Promise<void> {
    try {
      const snapshots = await this.storage.list()
      snapshots.forEach(snapshot => {
        this.snapshots.set(snapshot.id, snapshot)
      })
    } catch (error) {
      console.error('Failed to load snapshots:', error)
    }
  }

  /**
   * Create a new snapshot at the current state
   */
  async createSnapshot(name: string, description?: string): Promise<Snapshot> {
    // Get all events from event store
    const events = this.eventStore.query({})
    const currentEvent = events[events.length - 1]
    
    if (!currentEvent) {
      throw new Error('No events to snapshot')
    }

    const snapshot: Snapshot = {
      id: nanoid(),
      name,
      description,
      eventId: currentEvent.id,
      timestamp: Date.now()
    }

    // Save to storage
    await this.storage.save(snapshot)
    this.snapshots.set(snapshot.id, snapshot)

    // Emit event
    this.typedEventBus.emit('history.snapshot.created', {
      snapshotId: snapshot.id,
      timestamp: snapshot.timestamp,
      eventCount: events.length,
      name: snapshot.name,
      description: snapshot.description
    })

    return snapshot
  }

  /**
   * Load a snapshot (navigate to its state)
   */
  async loadSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`)
    }

    // Navigate to the snapshot's event
    // This will be handled by the history store
    this.typedEventBus.emit('history.snapshot.loaded', {
      snapshotId: snapshot.id,
      eventId: snapshot.eventId,
      timestamp: Date.now()
    })
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`)
    }

    await this.storage.delete(snapshotId)
    this.snapshots.delete(snapshotId)

    this.typedEventBus.emit('history.snapshot.deleted', {
      snapshotId: snapshot.id
    })
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get a specific snapshot
   */
  getSnapshot(snapshotId: string): Snapshot | null {
    return this.snapshots.get(snapshotId) || null
  }

  /**
   * Update snapshot metadata
   */
  async updateSnapshot(snapshotId: string, updates: Partial<Pick<Snapshot, 'name' | 'description'>>): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`)
    }

    const updatedSnapshot = {
      ...snapshot,
      ...updates
    }

    await this.storage.save(updatedSnapshot)
    this.snapshots.set(snapshotId, updatedSnapshot)
  }
} 