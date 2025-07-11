import { CanvasManager } from '../canvas/CanvasManager'
import { EventDocumentStore, type Document } from '@/lib/store/document/EventDocumentStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

import { nanoid } from 'nanoid'

export interface SerializedDocument {
  version: string
  document: Document
  canvas: {
    width: number
    height: number
    backgroundColor: string
    layers: unknown[]
    selection?: unknown
  }
  metadata: {
    createdAt: number
    lastModified: number
    application: string
    applicationVersion: string
  }
}

/**
 * Handles document serialization and deserialization
 */
export class DocumentSerializer {
  private static readonly CURRENT_VERSION = '1.0.0'
  private static readonly APPLICATION_NAME = 'FotoFun'
  
  constructor(
    private canvasManager: CanvasManager,
    private documentStore: EventDocumentStore,
    private typedEventBus: TypedEventBus
  ) {}

  /**
   * Serialize the current document to JSON
   */
  async serialize(): Promise<SerializedDocument> {
    const document = this.documentStore.getCurrentDocument()
    if (!document) {
      throw new Error('No document to serialize')
    }
    
    const canvasData = this.canvasManager.toJSON()
    
    return {
      version: DocumentSerializer.CURRENT_VERSION,
      document: {
        ...document,
        modified: new Date()
      },
      canvas: {
        width: canvasData.dimensions.width,
        height: canvasData.dimensions.height,
        backgroundColor: canvasData.backgroundColor,
        layers: canvasData.layers,
        selection: this.canvasManager.serializeSelection()
      },
      metadata: {
        createdAt: document.created.getTime(),
        lastModified: Date.now(),
        application: DocumentSerializer.APPLICATION_NAME,
        applicationVersion: DocumentSerializer.CURRENT_VERSION
      }
    }
  }

  /**
   * Save document to file
   */
  async saveToFile(): Promise<void> {
    try {
      const serialized = await this.serialize()
      const json = JSON.stringify(serialized, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${serialized.document.name}.fotofun`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Mark as saved
      this.documentStore.markAsSaved()
      
      // Emit save event
      this.typedEventBus.emit('document.saved', {
        documentId: serialized.document.id
      })
    } catch (error) {
      console.error('Failed to save document:', error)
      throw error
    }
  }

  /**
   * Load document from file
   */
  async loadFromFile(file: File): Promise<void> {
    try {
      const text = await file.text()
      const serialized = JSON.parse(text) as SerializedDocument
      
      // Validate version
      if (!this.isVersionCompatible(serialized.version)) {
        throw new Error(`Incompatible document version: ${serialized.version}`)
      }
      
      // Create new document
      const document: Document = {
        ...serialized.document,
        created: new Date(serialized.document.created),
        modified: new Date(serialized.document.modified)
      }
      
      // Load document into store
      this.typedEventBus.emit('document.loaded', {
        document: {
          id: document.id,
          name: document.name,
          width: serialized.canvas.width,
          height: serialized.canvas.height,
          backgroundColor: serialized.canvas.backgroundColor,
          createdAt: document.created.getTime(),
          lastModified: document.modified.getTime()
        }
      })
      
      // Load canvas state
      await this.loadCanvasState(serialized.canvas)
      
      // Restore selection if any
      if (serialized.canvas.selection) {
        this.canvasManager.deserializeSelection(serialized.canvas.selection)
      }
      
      // Mark as saved (just loaded)
      this.documentStore.markAsSaved()
    } catch (error) {
      console.error('Failed to load document:', error)
      throw error
    }
  }

  /**
   * Save to browser storage (for auto-save)
   */
  async saveToStorage(key: string): Promise<void> {
    try {
      const serialized = await this.serialize()
      const json = JSON.stringify(serialized)
      
      // Use IndexedDB for larger storage capacity
      const db = await this.openDatabase()
      const transaction = db.transaction(['documents'], 'readwrite')
      const store = transaction.objectStore('documents')
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ key, data: json, timestamp: Date.now() })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to save to storage:', error)
      throw error
    }
  }

  /**
   * Load from browser storage
   */
  async loadFromStorage(key: string): Promise<SerializedDocument | null> {
    try {
      const db = await this.openDatabase()
      const transaction = db.transaction(['documents'], 'readonly')
      const store = transaction.objectStore('documents')
      
      return new Promise((resolve, reject) => {
        const request = store.get(key)
        request.onsuccess = () => {
          if (request.result) {
            const serialized = JSON.parse(request.result.data) as SerializedDocument
            resolve(serialized)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to load from storage:', error)
      return null
    }
  }

  /**
   * Delete from storage
   */
  async deleteFromStorage(key: string): Promise<void> {
    try {
      const db = await this.openDatabase()
      const transaction = db.transaction(['documents'], 'readwrite')
      const store = transaction.objectStore('documents')
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to delete from storage:', error)
    }
  }

  /**
   * Load canvas state from serialized data
   */
  private async loadCanvasState(canvasData: SerializedDocument['canvas']): Promise<void> {
    // Clear existing canvas
    const layers = this.canvasManager.state.layers
    for (const layer of [...layers]) {
      this.canvasManager.removeLayer(layer.id)
    }
    
    // Resize canvas
    await this.canvasManager.resize(canvasData.width, canvasData.height)
    
    // Set background color
    this.canvasManager.state.backgroundColor = canvasData.backgroundColor
    
    // Load layers
    for (const layerData of canvasData.layers) {
      const layer = this.canvasManager.addLayer({
        id: layerData.id || nanoid(),
        name: layerData.name,
        visible: layerData.visible,
        locked: layerData.locked,
        opacity: layerData.opacity,
        blendMode: layerData.blendMode
      })
      
      // Load objects in the layer
      if (layerData.objects && Array.isArray(layerData.objects)) {
        for (const objData of layerData.objects) {
          await this.canvasManager.addObject(objData, layer.id)
        }
      }
    }
  }

  /**
   * Check if document version is compatible
   */
  private isVersionCompatible(version: string): boolean {
    const [major] = version.split('.')
    const [currentMajor] = DocumentSerializer.CURRENT_VERSION.split('.')
    return major === currentMajor
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

  /**
   * Export document as a specific format
   */
  async exportAs(format: 'json' | 'pdf'): Promise<Blob> {
    if (format === 'json') {
      const serialized = await this.serialize()
      const json = JSON.stringify(serialized, null, 2)
      return new Blob([json], { type: 'application/json' })
    } else if (format === 'pdf') {
      // TODO: Implement PDF export
      throw new Error('PDF export not yet implemented')
    }
    
    throw new Error(`Unsupported export format: ${format}`)
  }
} 