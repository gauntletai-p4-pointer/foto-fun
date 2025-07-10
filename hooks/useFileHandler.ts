import { useCallback, useRef } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { MAX_FILE_SIZE } from '@/constants'

export function useFileHandler(mode: 'open' | 'insert' = 'open') {
  const documentStore = useService<EventDocumentStore>('DocumentStore')
  const openDocument = (file: File) => documentStore.openDocument(file)
  const insertImage = (file: File) => {
    // TODO: Implement insertImage for new canvas system
    console.log('insertImage needs implementation for Konva', file)
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
    
    const error = validateFile(file)
    if (error) {
      alert(error) // In production, use a proper toast notification
      return
    }
    
    try {
      if (mode === 'insert') {
        console.log('[FileHandler] Calling insertImage...')
        await insertImage(file)
      } else {
        console.log('[FileHandler] Calling openDocument...')
        await openDocument(file)
      }
      console.log('[FileHandler] ========== HANDLE FILE END ==========')
    } catch (error) {
      console.error('Failed to handle file:', error)
      alert('Failed to handle file. Please try again.')
    }
  }, [openDocument, insertImage, mode])
  
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