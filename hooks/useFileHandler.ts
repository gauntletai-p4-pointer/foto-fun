import { useCallback, useRef } from 'react'
import { useDocumentStore } from '@/store/documentStore'
import { MAX_FILE_SIZE } from '@/constants'

export function useFileHandler() {
  const openDocument = useDocumentStore(state => state.openDocument)
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
    const error = validateFile(file)
    if (error) {
      alert(error) // In production, use a proper toast notification
      return
    }
    
    try {
      await openDocument(file)
    } catch (error) {
      console.error('Failed to open file:', error)
      alert('Failed to open file. Please try again.')
    }
  }, [openDocument])
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
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