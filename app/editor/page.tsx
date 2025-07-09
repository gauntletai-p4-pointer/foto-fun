'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MenuBar } from '@/components/editor/MenuBar'
import { ToolPalette } from '@/components/editor/ToolPalette'
import { Canvas } from '@/components/editor/Canvas'
import { Panels } from '@/components/editor/Panels'
import { OptionsBar } from '@/components/editor/OptionsBar'
import { StatusBar } from '@/components/editor/StatusBar'
import { NewDocumentDialog } from '@/components/dialogs/NewDocumentDialog'
import { ImageGenerationDialog } from '@/components/editor/dialogs/ImageGenerationDialog'
import { useDocumentStore } from '@/store/documentStore'
import { useToolStore } from '@/store/toolStore'
import { createClient } from '@/lib/db/supabase/client'
import { historyKeyboardHandlers } from '@/store/historyStore'

export default function EditorPage() {
  const { saveDocument, currentDocument, createNewDocument } = useDocumentStore()
  const router = useRouter()
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // Redirect to sign-in page if not authenticated
        router.push('/auth/signin')
      } else {
        // Only set authChecked to true if user is authenticated
        setAuthChecked(true)
      }
    }
    
    checkAuth()
  }, [router])
  
  // Create default document on mount if none exists
  useEffect(() => {
    if (!currentDocument) {
      createNewDocument('default')
    }
  }, [currentDocument, createNewDocument])
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      const isMeta = e.metaKey || e.ctrlKey
      
      // Check for undo/redo first (handled by historyStore)
      if (isMeta && e.key === 'z') {
        if (e.shiftKey) {
          historyKeyboardHandlers.handleRedo(e)
        } else {
          historyKeyboardHandlers.handleUndo(e)
        }
        return
      }
      
      if (isMeta && e.key === 'y') {
        historyKeyboardHandlers.handleRedo(e)
        return
      }
      
      // Save (Cmd/Ctrl + S)
      if (isMeta && e.key === 's') {
        e.preventDefault()
        if (currentDocument) {
          saveDocument()
        }
        return
      }
      
      // New document (Cmd/Ctrl + N)
      if (isMeta && e.key === 'n') {
        e.preventDefault()
        setShowNewDocumentDialog(true)
        return
      }
      
      // Tool shortcuts (when not holding modifiers)
      if (!isMeta && !e.altKey && !e.shiftKey) {
        const toolStore = useToolStore.getState()
        const { tools } = toolStore
        
        // Find tool by shortcut
        for (const [, tool] of tools) {
          if (tool.shortcut?.toLowerCase() === e.key.toLowerCase() && tool.isImplemented) {
            e.preventDefault()
            toolStore.setActiveTool(tool.id)
            break
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveDocument, currentDocument])
  
  // Show loading state while checking auth
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1e1e1e] text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Loading editor...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-gray-200 overflow-hidden">
      <MenuBar />
      <OptionsBar />
      <div className="flex-1 flex overflow-hidden">
        <ToolPalette />
        <Canvas />
        <Panels />
      </div>
      <StatusBar />
      <NewDocumentDialog 
        open={showNewDocumentDialog}
        onOpenChange={setShowNewDocumentDialog}
      />
      <ImageGenerationDialog />
    </div>
  )
} 