import { useCallback, useRef } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import { MAX_FILE_SIZE } from '@/constants'

export function useFileHandler(mode: 'open' | 'insert' = 'open') {
  const documentStore = useService<EventDocumentStore>('DocumentStore')
  
  const openDocument = (file: File) => documentStore.openDocument(file)
  
  const insertImage = async (file: File) => {
    // Get the canvas manager from the container
    try {
      const container = ServiceContainer.getInstance()
      const canvasManager = container.getSync<CanvasManager>('CanvasManager')
      
      if (!canvasManager) {
        console.error('CanvasManager not available')
        alert('Canvas not ready. Please wait a moment and try again.')
        return
      }
      
      // Read the file as data URL
      const reader = new FileReader()
      
      return new Promise<void>((resolve, reject) => {
        reader.onload = async (e) => {
          const img = new Image()
          
          img.onload = async () => {
            try {
              // Add the image to the canvas
              await canvasManager.addObject({
                type: 'image',
                data: img,
                name: file.name,
                transform: {
                  x: 50, // Offset from top-left
                  y: 50,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  skewX: 0,
                  skewY: 0
                }
              })
              
              console.log('[FileHandler] Image inserted successfully')
              resolve()
            } catch (error) {
              console.error('[FileHandler] Failed to insert image:', error)
              reject(error)
            }
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
    } catch (error) {
      console.error('[FileHandler] Failed to get CanvasManager:', error)
      throw error
    }
  }
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file'
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
    
    return null
  }
  
  const handleFile = useCallback(async (file: File) => {
    console.log('[FileHandler] ========== HANDLE FILE START ==========')
    console.log('[FileHandler] File:', file.name, 'Mode:', mode)
    console.log('[FileHandler] File type:', file.type)
    console.log('[FileHandler] File size:', file.size)
    
    const error = validateFile(file)
    if (error) {
      console.error('[FileHandler] Validation error:', error)
      alert(error) // In production, use a proper toast notification
      return
    }
    
    try {
      if (mode === 'insert') {
        console.log('[FileHandler] Calling insertImage...')
        await insertImage(file)
        console.log('[FileHandler] insertImage completed successfully')
      } else {
        console.log('[FileHandler] Calling openDocument...')
        await openDocument(file)
        console.log('[FileHandler] openDocument completed successfully')
      }
      console.log('[FileHandler] ========== HANDLE FILE END ==========')
    } catch (error) {
      console.error('[FileHandler] Failed to handle file:', error)
      alert('Failed to handle file. Please try again.')
    }
  }, [openDocument, mode])
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Handle multiple files if dropped
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      alert('Please drop image files only')
      return
    }
    
    // Process each file
    imageFiles.forEach(async (file, index) => {
      // Add a small delay between files to ensure proper layer creation
      setTimeout(() => {
        handleFile(file)
      }, index * 100)
    })
  }, [handleFile])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Set drop effect to indicate this is a valid drop target
    e.dataTransfer.dropEffect = 'copy'
  }, [])
  
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  return {
    fileInputRef,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    triggerFileInput
  }
} 