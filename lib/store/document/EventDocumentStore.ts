import { BaseStore } from '../base/BaseStore'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { Event } from '@/lib/events/core/Event'
import { nanoid } from 'nanoid'

export interface Document {
  id: string
  name: string
  path?: string
  created: Date
  modified: Date
  size?: number
  thumbnail?: string
  metadata?: Record<string, unknown>
}

export interface DocumentStoreState {
  currentDocument: Document | null
  recentDocuments: Document[]
  isDirty: boolean
  isSaving: boolean
  isLoading: boolean
  lastSaved: Date | null
  autoSaveEnabled: boolean
  autoSaveInterval: number
}

/**
 * Event-driven document store
 * Manages document metadata, recent files, and save state
 */
export class EventDocumentStore extends BaseStore<DocumentStoreState> {
  private typedEventBus: TypedEventBus
  private typedSubscriptions: Array<() => void> = []
  private autoSaveTimer: NodeJS.Timeout | null = null

  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        currentDocument: null,
        recentDocuments: [],
        isDirty: false,
        isSaving: false,
        isLoading: false,
        lastSaved: null,
        autoSaveEnabled: true,
        autoSaveInterval: 30000 // 30 seconds
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
    this.initializeTypedSubscriptions()
    this.loadRecentDocuments()
  }

  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // For now, return empty map as we're using TypedEventBus for UI events
    // Event sourcing events would be handled here if needed
    return new Map()
  }

  private initializeTypedSubscriptions(): void {
    // Listen to document events
    this.typedSubscriptions.push(
      this.typedEventBus.on('document.loaded', (data) => {
        this.handleDocumentLoaded(data.document)
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('document.saved', (data) => {
        this.handleDocumentSaved(data.documentId)
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('document.created', (data) => {
        this.handleDocumentCreated(data)
      })
    )

    // Listen to canvas changes to mark as dirty
    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.added', () => {
        this.markAsDirty()
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.modified', () => {
        this.markAsDirty()
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.removed', () => {
        this.markAsDirty()
      })
    )
  }

  private handleDocumentLoaded(documentData: {
    id: string
    name: string
    width: number
    height: number
    backgroundColor: string
    createdAt: number
    lastModified: number
  }): void {
    const document: Document = {
      id: documentData.id,
      name: documentData.name,
      created: new Date(documentData.createdAt),
      modified: new Date(documentData.lastModified),
      metadata: {
        width: documentData.width,
        height: documentData.height,
        backgroundColor: documentData.backgroundColor
      }
    }

    this.setState(state => ({
      ...state,
      currentDocument: document,
      isDirty: false,
      isLoading: false,
      lastSaved: new Date()
    }))

    this.addToRecentDocuments(document)
  }

  private handleDocumentSaved(documentId: string): void {
    const currentDoc = this.getState().currentDocument
    if (currentDoc && currentDoc.id === documentId) {
      this.setState(state => ({
        ...state,
        isDirty: false,
        isSaving: false,
        lastSaved: new Date()
      }))
    }
  }

  private handleDocumentCreated(data: {
    documentId: string
    name: string
    bounds: { width: number; height: number; x: number; y: number }
    metadata: {
      id: string
      name: string
      created: Date
      modified: Date
      author?: string
      colorSpace: 'RGB' | 'CMYK' | 'LAB'
      resolution: number
      bitDepth: 8 | 16 | 32
      backgroundColor?: string
    }
  }): void {
    const document: Document = {
      id: data.documentId,
      name: data.name,
      created: data.metadata.created,
      modified: data.metadata.modified,
      metadata: {
        ...data.metadata,
        width: data.bounds.width,
        height: data.bounds.height
      }
    }

    this.setState(state => ({
      ...state,
      currentDocument: document,
      isDirty: false,
      isLoading: false
    }))
  }

  // Public API methods
  getCurrentDocument(): Document | null {
    return this.getState().currentDocument
  }

  createNewDocument(name: string, width: number, height: number, backgroundColor: string = '#ffffff'): Document {
    const document: Document = {
      id: nanoid(),
      name,
      created: new Date(),
      modified: new Date(),
      metadata: {
        width,
        height,
        backgroundColor
      }
    }

    this.setState(state => ({
      ...state,
      currentDocument: document,
      isDirty: false,
      isLoading: false,
      lastSaved: null
    }))

    this.typedEventBus.emit('document.created', {
      documentId: document.id,
      name: document.name,
      bounds: { width, height, x: 0, y: 0 },
      metadata: {
        id: document.id,
        name: document.name,
        created: document.created,
        modified: document.modified,
        colorSpace: 'RGB' as const,
        resolution: 72,
        bitDepth: 8 as const,
        backgroundColor
      }
    })

    return document
  }

  markAsDirty(): void {
    const state = this.getState()
    if (!state.isDirty && state.currentDocument) {
      this.setState(s => ({ ...s, isDirty: true }))
      
      // Update document modified time
      const updatedDoc = {
        ...state.currentDocument,
        modified: new Date()
      }
      this.setState(s => ({ ...s, currentDocument: updatedDoc }))
    }
  }

  markAsSaved(): void {
    this.setState(state => ({
      ...state,
      isDirty: false,
      isSaving: false,
      lastSaved: new Date()
    }))
  }

  setLoading(loading: boolean): void {
    this.setState(state => ({ ...state, isLoading: loading }))
  }

  setSaving(saving: boolean): void {
    this.setState(state => ({ ...state, isSaving: saving }))
  }

  getRecentDocuments(): Document[] {
    return this.getState().recentDocuments
  }

  private addToRecentDocuments(document: Document): void {
    const state = this.getState()
    const existing = state.recentDocuments.findIndex(d => d.id === document.id)
    
    let recentDocuments = [...state.recentDocuments]
    
    if (existing >= 0) {
      // Move to front
      recentDocuments.splice(existing, 1)
    }
    
    recentDocuments.unshift(document)
    
    // Keep only last 10
    recentDocuments = recentDocuments.slice(0, 10)
    
    this.setState(state => ({ ...state, recentDocuments }))
    this.saveRecentDocuments(recentDocuments)

    this.typedEventBus.emit('recentFiles.updated', {
      files: recentDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        path: doc.path,
        lastOpened: doc.modified,
        thumbnail: doc.thumbnail,
        size: doc.size
      }))
    })
  }

  private async loadRecentDocuments(): Promise<void> {
    try {
      const stored = localStorage.getItem('fotofun-recent-documents')
      if (stored) {
        const recentDocuments = JSON.parse(stored).map((doc: any) => ({
          ...doc,
          created: new Date(doc.created),
          modified: new Date(doc.modified)
        }))
        this.setState(state => ({ ...state, recentDocuments }))
      }
    } catch (error) {
      console.warn('Failed to load recent documents:', error)
    }
  }

  private saveRecentDocuments(documents: Document[]): void {
    try {
      localStorage.setItem('fotofun-recent-documents', JSON.stringify(documents))
    } catch (error) {
      console.warn('Failed to save recent documents:', error)
    }
  }

  dispose(): void {
    super.dispose()
    this.typedSubscriptions.forEach(unsubscribe => unsubscribe())
    this.typedSubscriptions = []
    
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }
}

// Export singleton instance and hook
let eventDocumentStore: EventDocumentStore | null = null

export function getEventDocumentStore(eventStore: EventStore, typedEventBus: TypedEventBus): EventDocumentStore {
  if (!eventDocumentStore) {
    eventDocumentStore = new EventDocumentStore(eventStore, typedEventBus)
  }
  return eventDocumentStore
}

// React hook
import { useStore } from '../base/BaseStore'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

export function useEventDocumentStore(): DocumentStoreState {
  const eventStore = EventStore.getInstance()
  const typedEventBus = getTypedEventBus()
  const store = getEventDocumentStore(eventStore, typedEventBus)
  return useStore(store)
} 