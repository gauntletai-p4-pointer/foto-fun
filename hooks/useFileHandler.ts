import { useCallback, useRef } from 'react'
import { useDocumentStore } from '@/store/documentStore'
import { MAX_FILE_SIZE } from '@/constants'

export function useFileHandler(mode: 'open' | 'insert' = 'open') {
  const openDocument = useDocumentStore(state => state.openDocument)
  const insertImage = useDocumentStore(state => state.insertImage)
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
      // Reset the input value to allow selecting the same file again
      e.target.value = ''
    }
  }, [handleFile])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
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