import { BaseStore } from '../base/BaseStore'
import { Event } from '@/lib/events/core/Event'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { v4 as uuidv4 } from 'uuid'
import { DOCUMENT_PRESETS } from '@/constants'

/**
 * Document type
 */
export interface Document {
  id: string
  name: string
  width: number
  height: number
  resolution: number
  colorMode: 'RGB' | 'CMYK' | 'Grayscale'
  created: Date
  modified: Date
  backgroundColor?: string
}

/**
 * Document store state
 */
export interface DocumentStoreState {
  // Current document
  currentDocument: Document | null
  
  // Recent documents
  recentDocuments: Document[]
  
  // Document state
  hasUnsavedChanges: boolean
  
  // Loading state
  isLoading: boolean
  loadingMessage: string | null
}

/**
 * Event-driven document store
 */
export class EventDocumentStore extends BaseStore<DocumentStoreState> {
  private typedEventBus: TypedEventBus
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        currentDocument: null,
        recentDocuments: [],
        hasUnsavedChanges: false,
        isLoading: false,
        loadingMessage: null
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We'll use TypedEventBus subscriptions
    return new Map()
  }
  
  /**
   * Initialize subscriptions to typed events
   */
  initialize(): void {
    // Subscribe to document events
    this.typedEventBus.on('document.created', (data) => {
      const document: Document = {
        id: data.documentId,
        name: data.name,
        width: 800, // Default, should come from event data
        height: 600,
        resolution: 72,
        colorMode: 'RGB',
        created: new Date(data.timestamp),
        modified: new Date(data.timestamp)
      }
      
      this.setState(state => ({
        ...state,
        currentDocument: document,
        hasUnsavedChanges: false
      }))
      
      this.addToRecent(document)
    })
    
    this.typedEventBus.on('document.loaded', (data) => {
      const document: Document = {
        id: data.document.id,
        name: data.document.name,
        width: data.document.width,
        height: data.document.height,
        resolution: 72,
        colorMode: 'RGB',
        created: new Date(data.document.createdAt),
        modified: new Date(data.document.lastModified),
        backgroundColor: data.document.backgroundColor
      }
      
      this.setState(state => ({
        ...state,
        currentDocument: document,
        hasUnsavedChanges: false,
        isLoading: false,
        loadingMessage: null
      }))
      
      this.addToRecent(document)
    })
    
    this.typedEventBus.on('document.saved', (data) => {
      this.setState(state => ({
        ...state,
        hasUnsavedChanges: false,
        currentDocument: state.currentDocument ? {
          ...state.currentDocument,
          modified: new Date(data.timestamp)
        } : null
      }))
    })
    
    // Subscribe to canvas events that mark document as modified
    this.typedEventBus.on('canvas.object.added', () => {
      this.markAsModified()
    })
    
    this.typedEventBus.on('canvas.object.modified', () => {
      this.markAsModified()
    })
    
    this.typedEventBus.on('canvas.object.removed', () => {
      this.markAsModified()
    })
  }
  
  // Public methods
  
  /**
   * Create a new document
   */
  createNewDocument(preset: keyof typeof DOCUMENT_PRESETS | 'custom', customOptions?: Partial<Document>): void {
    const presetConfig = preset === 'custom' ? 
      { width: 800, height: 600, resolution: 72 } : 
      DOCUMENT_PRESETS[preset]
    
    const newDocument: Document = {
      id: uuidv4(),
      name: 'Untitled',
      width: customOptions?.width || presetConfig.width,
      height: customOptions?.height || presetConfig.height,
      resolution: customOptions?.resolution || presetConfig.resolution,
      colorMode: 'RGB',
      created: new Date(),
      modified: new Date(),
      ...customOptions
    }
    
    // Emit document created event
    this.typedEventBus.emit('document.created', {
      documentId: newDocument.id,
      name: newDocument.name
    })
    
    // Emit document loaded event to set full state
    this.typedEventBus.emit('document.loaded', {
      document: {
        id: newDocument.id,
        name: newDocument.name,
        width: newDocument.width,
        height: newDocument.height,
        backgroundColor: newDocument.backgroundColor || '#ffffff',
        createdAt: newDocument.created.getTime(),
        lastModified: newDocument.modified.getTime()
      }
    })
  }
  
  /**
   * Open a document from file
   */
  async openDocument(file: File): Promise<void> {
    console.log('[DocumentStore] Opening document:', file.name)
    
    this.setState(state => ({
      ...state,
      isLoading: true,
      loadingMessage: 'Opening document...'
    }))
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        console.log('[DocumentStore] File read successfully')
        const img = new Image()
        
        img.onload = () => {
          console.log('[DocumentStore] Image loaded:', img.width, 'x', img.height)
          
          const newDocument: Document = {
            id: uuidv4(),
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            width: img.width,
            height: img.height,
            resolution: 72, // Default for web images
            colorMode: 'RGB',
            created: new Date(file.lastModified),
            modified: new Date()
          }
          
          console.log('[DocumentStore] Emitting document.loaded event')
          // Emit document loaded event
          this.typedEventBus.emit('document.loaded', {
            document: {
              id: newDocument.id,
              name: newDocument.name,
              width: newDocument.width,
              height: newDocument.height,
              backgroundColor: '#ffffff',
              createdAt: newDocument.created.getTime(),
              lastModified: newDocument.modified.getTime()
            }
          })
          
          console.log('[DocumentStore] Emitting document.image.ready event')
          // Emit image ready event for canvas to load the image
          this.typedEventBus.emit('document.image.ready', {
            documentId: newDocument.id,
            imageElement: img,
            dataUrl: e.target?.result as string
          })
          
          console.log('[DocumentStore] Document opened successfully')
          resolve()
        }
        
        img.onerror = () => {
          console.error('[DocumentStore] Failed to load image')
          this.setState(state => ({
            ...state,
            isLoading: false,
            loadingMessage: null
          }))
          reject(new Error('Failed to load image'))
        }
        
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => {
        console.error('[DocumentStore] Failed to read file')
        this.setState(state => ({
          ...state,
          isLoading: false,
          loadingMessage: null
        }))
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  }
  
  /**
   * Save the current document
   */
  saveDocument(): void {
    const currentDocument = this.getState().currentDocument
    if (!currentDocument) return
    
    // TODO: Implement actual save logic with CanvasManager
    // For now, just emit saved event
    this.typedEventBus.emit('document.saved', {
      documentId: currentDocument.id
    })
  }
  
  /**
   * Close the current document
   */
  closeDocument(): void {
    this.setState(state => ({
      ...state,
      currentDocument: null,
      hasUnsavedChanges: false
    }))
    
    // TODO: Clear canvas using CanvasManager
  }
  
  /**
   * Add document to recent list
   */
  private addToRecent(doc: Document): void {
    this.setState(state => ({
      ...state,
      recentDocuments: [
        doc,
        ...state.recentDocuments.filter(d => d.id !== doc.id)
      ].slice(0, 10) // Keep only 10 recent documents
    }))
  }
  
  /**
   * Clear recent documents
   */
  clearRecent(): void {
    this.setState(state => ({
      ...state,
      recentDocuments: []
    }))
  }
  
  /**
   * Mark document as modified
   */
  markAsModified(): void {
    this.setState(state => ({
      ...state,
      hasUnsavedChanges: true,
      currentDocument: state.currentDocument ? {
        ...state.currentDocument,
        modified: new Date()
      } : null
    }))
  }
  
  /**
   * Mark document as saved
   */
  markAsSaved(): void {
    this.setState(state => ({
      ...state,
      hasUnsavedChanges: false
    }))
  }
  
  // Getters
  
  getCurrentDocument(): Document | null {
    return this.getState().currentDocument
  }
  
  getRecentDocuments(): Document[] {
    return this.getState().recentDocuments
  }
  
  hasUnsavedChanges(): boolean {
    return this.getState().hasUnsavedChanges
  }
  
  isLoading(): boolean {
    return this.getState().isLoading
  }
} 