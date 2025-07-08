import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DOCUMENT_PRESETS } from '@/constants'
import type { Document } from '@/types'

interface DocumentStore {
  // Current document
  currentDocument: Document | null
  
  // Recent documents
  recentDocuments: Document[]
  
  // Document state
  hasUnsavedChanges: boolean
  
  // Actions
  createNewDocument: (preset: keyof typeof DOCUMENT_PRESETS | 'custom', customOptions?: Partial<Document>) => void
  openDocument: (file: File) => Promise<void>
  saveDocument: () => void
  closeDocument: () => void
  
  // Recent documents
  addToRecent: (doc: Document) => void
  clearRecent: () => void
  
  // State management
  markAsModified: () => void
  markAsSaved: () => void
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  currentDocument: null,
  recentDocuments: [],
  hasUnsavedChanges: false,
  
  createNewDocument: (preset, customOptions) => {
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
    
    set({ 
      currentDocument: newDocument,
      hasUnsavedChanges: false 
    })
    
    // Initialize canvas with new document dimensions
    const canvasStore = useCanvasStore.getState()
    if (canvasStore.fabricCanvas) {
      canvasStore.resize(newDocument.width, newDocument.height)
      
      // Use theme-aware background color
      const isDarkMode = document.documentElement.classList.contains('dark')
      const bgColor = isDarkMode ? '#191817' : '#FAF9F5'
      canvasStore.setBackgroundColor(bgColor)
      
      canvasStore.fabricCanvas.clear()
      canvasStore.centerContent()
      canvasStore.zoomToFit()
    }
  },
  
  openDocument: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
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
          
          set({ 
            currentDocument: newDocument,
            hasUnsavedChanges: false 
          })
          
          // Load image into canvas
          const canvasStore = useCanvasStore.getState()
          if (canvasStore.fabricCanvas) {
            console.log('[DocumentStore] Loading image into canvas...')
            canvasStore.resize(newDocument.width, newDocument.height)
            
            FabricImage.fromURL(e.target?.result as string).then((fabricImg) => {
              console.log('[DocumentStore] FabricImage created, adding to canvas')
              canvasStore.fabricCanvas!.clear()
              canvasStore.fabricCanvas!.add(fabricImg)
              fabricImg.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false
              })
              canvasStore.fabricCanvas!.renderAll()
              canvasStore.centerContent()
              canvasStore.zoomToFit()
              console.log('[DocumentStore] Image loaded successfully, objects:', canvasStore.fabricCanvas!.getObjects().length)
            })
          }
          
          get().addToRecent(newDocument)
          resolve()
        }
        
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
        
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  },
  
  saveDocument: () => {
    const { currentDocument } = get()
    const canvasStore = useCanvasStore.getState()
    
    if (!currentDocument || !canvasStore.fabricCanvas) return
    
    // Convert canvas to blob and download
    canvasStore.fabricCanvas.getElement().toBlob((blob) => {
      if (!blob) return
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentDocument.name}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      set({ hasUnsavedChanges: false })
    })
  },
  
  closeDocument: () => {
    const canvasStore = useCanvasStore.getState()
    if (canvasStore.fabricCanvas) {
      canvasStore.fabricCanvas.clear()
    }
    
    set({ 
      currentDocument: null,
      hasUnsavedChanges: false 
    })
  },
  
  addToRecent: (doc) => {
    set((state) => ({
      recentDocuments: [
        doc,
        ...state.recentDocuments.filter(d => d.id !== doc.id)
      ].slice(0, 10) // Keep only 10 recent documents
    }))
  },
  
  clearRecent: () => {
    set({ recentDocuments: [] })
  },
  
  markAsModified: () => {
    set((state) => ({
      hasUnsavedChanges: true,
      currentDocument: state.currentDocument ? {
        ...state.currentDocument,
        modified: new Date()
      } : null
    }))
  },
  
  markAsSaved: () => {
    set({ hasUnsavedChanges: false })
  }
}))

// Import canvas store after export to avoid circular dependency
import { useCanvasStore } from './canvasStore'
import { FabricImage } from 'fabric' 