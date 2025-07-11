import { useCallback, useRef } from 'react'
import { useServiceContainer } from '@/lib/core/AppInitializer'
import { MAX_FILE_SIZE } from '@/constants'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'

export function useFileHandler() {
  const container = useServiceContainer()
  
  const loadImage = async (file: File) => {
    try {
      await performLoadImage(file)
    } catch (error) {
      console.error('[FileHandler] Failed to load image:', error)
      throw error
    }
  }
  
  const performLoadImage = async (file: File) => {
    // Get canvas manager
    const canvasManager = await container.get<CanvasManager>('CanvasManager')
    
    // Load the image
    const img = new Image()
    img.onload = async () => {
      // Add image to canvas
      const objectData: Partial<CanvasObject> = {
        type: 'image',
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        data: {
          element: img,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        }
      }
      
      await canvasManager.addObject(objectData as any)
      
      console.log('[FileHandler] Image loaded successfully')
    }
    
    img.onerror = () => {
      console.error('[FileHandler] Failed to load image')
      throw new Error('Failed to load image')
    }
    
    // Create object URL for the file
    img.src = URL.createObjectURL(file)
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
    console.log('[FileHandler] File:', file.name)
    console.log('[FileHandler] File type:', file.type)
    console.log('[FileHandler] File size:', file.size)
    
    const error = validateFile(file)
    if (error) {
      console.error('[FileHandler] Validation error:', error)
      alert(error) // In production, use a proper toast notification
      return
    }
    
    try {
      console.log('[FileHandler] Loading image...')
      await loadImage(file)
      console.log('[FileHandler] Image loaded successfully')
      console.log('[FileHandler] ========== HANDLE FILE END ==========')
    } catch (error) {
      console.error('[FileHandler] Failed to handle file:', error)
      alert('Failed to handle file. Please try again.')
    }
  }, [])
  
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
      // Add a small delay between files to ensure proper object creation
      setTimeout(() => {
        handleFile(file)
      }, index * 100)
    })
  }, [handleFile])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])
  
  const openFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  
  return {
    handleFile,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    openFile,
    fileInputRef,
    // Legacy method for backward compatibility
    triggerFileInput: openFile
  }
} 