import { DocumentSerializer } from '../persistence/DocumentSerializer'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { EventDocumentStore, type Document } from '@/lib/store/document/EventDocumentStore'

export interface AutoSaveOptions {
  interval: number // milliseconds
  maxVersions: number
  strategy: 'local' | 'cloud'
}

export interface RecoveryInfo {
  documentId: string
  documentName: string
  lastSaved: Date
  hasUnsavedChanges: boolean
}

/**
 * Manages automatic document saving and recovery
 */
export class AutoSaveManager {
  private static readonly DEFAULT_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private static readonly DEFAULT_MAX_VERSIONS = 5
  private static readonly RECOVERY_KEY_PREFIX = 'fotofun-autosave-'
  private static readonly RECOVERY_INFO_KEY = 'fotofun-recovery-info'
  
  private intervalId: NodeJS.Timeout | null = null
  private isEnabled = false
  private lastSaveTime: Date | null = null
  private saveInProgress = false
  
  private options: AutoSaveOptions = {
    interval: AutoSaveManager.DEFAULT_INTERVAL,
    maxVersions: AutoSaveManager.DEFAULT_MAX_VERSIONS,
    strategy: 'local'
  }
  
  constructor(
    private documentSerializer: DocumentSerializer,
    private documentStore: EventDocumentStore,
    private typedEventBus: TypedEventBus
  ) {
    this.subscribeToEvents()
  }

  /**
   * Enable auto-save
   */
  enable(interval?: number): void {
    if (this.isEnabled) {
      this.disable()
    }
    
    if (interval) {
      this.options.interval = interval
    }
    
    this.isEnabled = true
    this.startAutoSave()
    
    console.log(`Auto-save enabled with ${this.options.interval / 1000}s interval`)
  }

  /**
   * Disable auto-save
   */
  disable(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    this.isEnabled = false
    console.log('Auto-save disabled')
  }

  /**
   * Set auto-save strategy
   */
  setStrategy(strategy: 'local' | 'cloud'): void {
    this.options.strategy = strategy
  }

  /**
   * Manually trigger auto-save
   */
  async save(): Promise<void> {
    if (this.saveInProgress) {
      console.log('Auto-save already in progress')
      return
    }
    
    const document = this.documentStore.getCurrentDocument()
    if (!document || !this.documentStore.hasUnsavedChanges()) {
      return
    }
    
    this.saveInProgress = true
    
    try {
      const key = this.getAutoSaveKey(document.id)
      
      // Save to storage
      await this.documentSerializer.saveToStorage(key)
      
      // Update recovery info
      await this.updateRecoveryInfo(document)
      
      // Clean up old versions
      await this.cleanupOldVersions(document.id)
      
      this.lastSaveTime = new Date()
      
      // Emit auto-save event
      this.typedEventBus.emit('document.autosaved', {
        documentId: document.id,
        location: this.options.strategy
      })
      
      console.log(`Auto-saved document: ${document.name}`)
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      this.saveInProgress = false
    }
  }

  /**
   * Check if recovery is available
   */
  async hasRecovery(): Promise<boolean> {
    try {
      const info = await this.getRecoveryInfo()
      return info.length > 0
    } catch (error) {
      console.error('Failed to check recovery:', error)
      return false
    }
  }

  /**
   * Get recovery information
   */
  async getRecoveryInfo(): Promise<RecoveryInfo[]> {
    try {
      const stored = localStorage.getItem(AutoSaveManager.RECOVERY_INFO_KEY)
      if (!stored) return []
      
      const info = JSON.parse(stored) as RecoveryInfo[]
      return info.map(item => ({
        ...item,
        lastSaved: new Date(item.lastSaved)
      }))
    } catch (error) {
      console.error('Failed to get recovery info:', error)
      return []
    }
  }

  /**
   * Recover a document
   */
  async recover(documentId: string): Promise<void> {
    try {
      const key = this.getAutoSaveKey(documentId)
      const serialized = await this.documentSerializer.loadFromStorage(key)
      
      if (!serialized) {
        throw new Error('No recovery data found')
      }
      
      // Create a temporary file from the serialized data
      const json = JSON.stringify(serialized)
      const blob = new Blob([json], { type: 'application/json' })
      const file = new File([blob], 'recovery.fotofun', { type: 'application/json' })
      
      // Load the document
      await this.documentSerializer.loadFromFile(file)
      
      // Clean up recovery data
      await this.removeRecovery(documentId)
      
      // Emit recovery event
      this.typedEventBus.emit('document.recovered', {
        documentId,
        recoveredFrom: 'autosave'
      })
      
      console.log('Document recovered successfully')
    } catch (error) {
      console.error('Recovery failed:', error)
      throw error
    }
  }

  /**
   * Remove recovery data
   */
  async removeRecovery(documentId: string): Promise<void> {
    try {
      const key = this.getAutoSaveKey(documentId)
      await this.documentSerializer.deleteFromStorage(key)
      
      // Update recovery info
      const info = await this.getRecoveryInfo()
      const filtered = info.filter(item => item.documentId !== documentId)
      localStorage.setItem(AutoSaveManager.RECOVERY_INFO_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to remove recovery:', error)
    }
  }

  /**
   * Get last save time
   */
  getLastSaveTime(): Date | null {
    return this.lastSaveTime
  }

  /**
   * Subscribe to document events
   */
  private subscribeToEvents(): void {
    // Auto-save when document is modified
    this.typedEventBus.on('canvas.object.added', () => this.scheduleAutoSave())
    this.typedEventBus.on('canvas.object.modified', () => this.scheduleAutoSave())
    this.typedEventBus.on('canvas.object.removed', () => this.scheduleAutoSave())
    this.typedEventBus.on('canvas.resized', () => this.scheduleAutoSave())
    
    // Clear auto-save when document is saved manually
    this.typedEventBus.on('document.saved', async (data) => {
      await this.removeRecovery(data.documentId)
    })
    
    // Clear auto-save when document is closed
    this.typedEventBus.on('document.closed', async (data) => {
      if (data && data.documentId) {
        await this.removeRecovery(data.documentId)
      }
    })
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
    
    this.intervalId = setInterval(() => {
      this.save()
    }, this.options.interval)
    
    // Do an initial save
    this.save()
  }

  /**
   * Schedule an auto-save (debounced)
   */
  private scheduleAutoSave(): void {
    if (!this.isEnabled) return
    
    // Auto-save will happen on the next interval
    // This prevents too frequent saves
  }

  /**
   * Get auto-save key for a document
   */
  private getAutoSaveKey(documentId: string): string {
    const timestamp = Date.now()
    return `${AutoSaveManager.RECOVERY_KEY_PREFIX}${documentId}-${timestamp}`
  }

  /**
   * Update recovery information
   */
  private async updateRecoveryInfo(document: Document): Promise<void> {
    try {
      const info = await this.getRecoveryInfo()
      const existing = info.find(item => item.documentId === document.id)
      
      if (existing) {
        existing.documentName = document.name
        existing.lastSaved = new Date()
        existing.hasUnsavedChanges = true
      } else {
        info.push({
          documentId: document.id,
          documentName: document.name,
          lastSaved: new Date(),
          hasUnsavedChanges: true
        })
      }
      
      localStorage.setItem(AutoSaveManager.RECOVERY_INFO_KEY, JSON.stringify(info))
    } catch (error) {
      console.error('Failed to update recovery info:', error)
    }
  }

  /**
   * Clean up old auto-save versions
   */
  private async cleanupOldVersions(documentId: string): Promise<void> {
    try {
      const db = await this.openDatabase()
      const transaction = db.transaction(['documents'], 'readwrite')
      const store = transaction.objectStore('documents')
      
      // Get all keys for this document
      const request = store.getAllKeys()
      
      request.onsuccess = async () => {
        const keys = request.result.filter(key => 
          typeof key === 'string' && 
          key.startsWith(`${AutoSaveManager.RECOVERY_KEY_PREFIX}${documentId}-`)
        )
        
        // Sort by timestamp (newest first)
        keys.sort((a, b) => {
          if (typeof a !== 'string' || typeof b !== 'string') return 0
          const timestampA = parseInt(a.split('-').pop() || '0')
          const timestampB = parseInt(b.split('-').pop() || '0')
          return timestampB - timestampA
        })
        
        // Delete old versions
        if (keys.length > this.options.maxVersions) {
          const toDelete = keys.slice(this.options.maxVersions)
          for (const key of toDelete) {
            store.delete(key)
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old versions:', error)
    }
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('fotofun-documents', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'key' })
        }
      }
    })
  }
} 