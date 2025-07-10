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
  insertImage: (file: File) => Promise<void>
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
      // Don't resize the canvas - keep it at its current viewport size
      // canvasStore.resize(newDocument.width, newDocument.height)
      
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
            // Don't resize canvas to image dimensions - keep current canvas size
            // canvasStore.resize(newDocument.width, newDocument.height)
            
            FabricImage.fromURL(e.target?.result as string).then((fabricImg) => {
              console.log('[DocumentStore] FabricImage created, adding to canvas')
              canvasStore.fabricCanvas!.clear()
              
              // Create a background layer and associate the image with it
              const layerStore = useLayerStore.getState()
              const backgroundLayer = layerStore.addLayer({
                name: 'Background',
                type: 'image'
              })
              
              const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              
              fabricImg.set({
                left: 0,
                top: 0,
                selectable: true,
                evented: true,
                id: imageId,
                layerId: backgroundLayer.id,
                centeredRotation: true  // Ensure rotation happens around center
              })
              
              canvasStore.fabricCanvas!.add(fabricImg)
              
              // Update layer with object ID
              layerStore.updateLayer(backgroundLayer.id, {
                objectIds: [imageId]
              })
              
              canvasStore.fabricCanvas!.renderAll()
              
              // Center and fit the image in the viewport
              canvasStore.centerContent()
              
              // Calculate zoom to fit the image in the viewport
              const canvasWidth = canvasStore.fabricCanvas!.getWidth()
              const canvasHeight = canvasStore.fabricCanvas!.getHeight()
              const imgWidth = fabricImg.width || newDocument.width
              const imgHeight = fabricImg.height || newDocument.height
              
              // Calculate zoom to fit with some padding
              const zoomX = canvasWidth / imgWidth * 0.9
              const zoomY = canvasHeight / imgHeight * 0.9
              const zoom = Math.min(zoomX, zoomY, 1) // Don't zoom in beyond 100%
              
              canvasStore.setZoom(zoom)
              canvasStore.centerContent()
              
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
  
  insertImage: async (file) => {
    console.log('[DocumentStore] ========== INSERT IMAGE START ==========')
    console.log('[DocumentStore] File:', file.name)
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          // Insert image into existing canvas
          const canvasStore = useCanvasStore.getState()
          if (canvasStore.fabricCanvas) {
            console.log('[DocumentStore] Inserting image into existing canvas...')
            console.log('[DocumentStore] Canvas objects BEFORE insertion:', canvasStore.fabricCanvas.getObjects().length)
            
            // Log existing objects
            canvasStore.fabricCanvas.getObjects().forEach((obj, i) => {
              console.log(`[DocumentStore] Existing object ${i}:`, {
                id: obj.get('id' as any),
                layerId: obj.get('layerId' as any),
                type: obj.type
              })
            })
            
            FabricImage.fromURL(e.target?.result as string).then((fabricImg) => {
              console.log('[DocumentStore] FabricImage created, adding to canvas')
              
              // Create a new layer for the inserted image
              const layerStore = useLayerStore.getState()
              console.log('[DocumentStore] Current layers BEFORE adding:', layerStore.layers.length)
              layerStore.layers.forEach((layer, i) => {
                console.log(`[DocumentStore] Layer ${i}:`, {
                  id: layer.id,
                  name: layer.name,
                  objectIds: layer.objectIds
                })
              })
              
              const imageName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
              console.log('[DocumentStore] Creating layer with name:', imageName)
              
              const insertedLayer = layerStore.addLayer({
                name: imageName,
                type: 'image'
              })
              
              console.log('[DocumentStore] Layer created:', insertedLayer)
              console.log('[DocumentStore] Canvas objects AFTER layer creation:', canvasStore.fabricCanvas!.getObjects().length)
              
              const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              console.log('[DocumentStore] Generated image ID:', imageId)
              
              // Center the image in the viewport
              const viewportCenter = canvasStore.fabricCanvas!.getVpCenter()
              fabricImg.set({
                left: viewportCenter.x - (fabricImg.width || 0) / 2,
                top: viewportCenter.y - (fabricImg.height || 0) / 2,
                selectable: true,
                evented: true,
                id: imageId,
                layerId: insertedLayer.id,
                centeredRotation: true  // Ensure rotation happens around center
              })
              
              console.log('[DocumentStore] Adding fabricImg to canvas...')
              canvasStore.fabricCanvas!.add(fabricImg)
              console.log('[DocumentStore] Canvas objects AFTER adding fabricImg:', canvasStore.fabricCanvas!.getObjects().length)
              
              canvasStore.fabricCanvas!.setActiveObject(fabricImg)
              
              // Update layer with object ID
              console.log('[DocumentStore] Updating layer with object ID...')
              layerStore.updateLayer(insertedLayer.id, {
                objectIds: [imageId]
              })
              
              console.log('[DocumentStore] Canvas objects AFTER layer update:', canvasStore.fabricCanvas!.getObjects().length)
              
              canvasStore.fabricCanvas!.renderAll()
              
              console.log('[DocumentStore] Final canvas objects:', canvasStore.fabricCanvas!.getObjects().length)
              console.log('[DocumentStore] Image inserted successfully with layer association')
              console.log('[DocumentStore] ========== INSERT IMAGE END ==========')
              
              // Mark document as modified
              get().markAsModified()
            })
          } else {
            // If no canvas exists, create a new document with the image
            console.log('[DocumentStore] No canvas exists, calling openDocument instead')
            get().openDocument(file)
          }
          
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
import { useLayerStore } from './layerStore'
import { FabricImage } from 'fabric' 