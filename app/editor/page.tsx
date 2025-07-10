'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MenuBar } from '@/components/editor/MenuBar'
import { ToolPalette } from '@/components/editor/ToolPalette'
import { Panels } from '@/components/editor/Panels'
import { OptionsBar } from '@/components/editor/OptionsBar'
import { StatusBar } from '@/components/editor/StatusBar'
import { NewDocumentDialog } from '@/components/dialogs/NewDocumentDialog'
import { ImageGenerationDialog } from '@/components/editor/dialogs/ImageGenerationDialog'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { createClient } from '@/lib/db/supabase/client'
import { eventHistoryKeyboardHandlers } from '@/lib/events/history/EventBasedHistoryStore'

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(
  () => import('@/components/editor/Canvas').then(mod => ({ default: mod.Canvas })),
  { 
    ssr: false,
    loading: () => (
      <div className="relative flex-1 bg-content-background p-4 min-w-0 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <p className="text-sm text-gray-400">Loading canvas...</p>
        </div>
      </div>
    )
  }
)

// Inner component that uses services
function EditorContent() {
  const documentStore = useService<EventDocumentStore>('DocumentStore')
  const documentState = useStore(documentStore)
  const currentDocument = documentState.currentDocument
  
  const toolStore = useService<EventToolStore>('ToolStore')
  const toolState = useStore(toolStore)
  
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false)
  
  // Create default document on mount if none exists
  useEffect(() => {
    if (!currentDocument) {
      documentStore.createNewDocument('default')
    }
  }, [currentDocument, documentStore])
  
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
          eventHistoryKeyboardHandlers.handleRedo(e)
        } else {
          eventHistoryKeyboardHandlers.handleUndo(e)
        }
        return
      }
      
      if (isMeta && e.key === 'y') {
        eventHistoryKeyboardHandlers.handleRedo(e)
        return
      }
      
      // Save (Cmd/Ctrl + S)
      if (isMeta && e.key === 's') {
        e.preventDefault()
        if (currentDocument) {
          documentStore.saveDocument()
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
        // Find tool by shortcut
        const tools = toolState.tools
        for (const [, tool] of tools) {
          if (tool.shortcut?.toLowerCase() === e.key.toLowerCase()) {
            e.preventDefault()
            toolStore.activateTool(tool.id)
            break
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentDocument, documentStore, toolState.tools, toolStore])
  
  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-gray-200 overflow-hidden">
      <MenuBar />
      <OptionsBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
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

// Main component that handles auth and service initialization
export default function EditorPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
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
        setIsAuthenticated(true)
        setAuthChecked(true)
      }
    }
    
    checkAuth()
  }, [router])
  
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
  
  // If authenticated, render the editor content
  if (isAuthenticated) {
    return <EditorContent />
  }
  
  // Otherwise, show loading (redirect will happen)
  return (
    <div className="h-screen flex items-center justify-center bg-[#1e1e1e] text-gray-200">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-400 mx-auto mb-4"></div>
        <p className="text-sm text-gray-400">Redirecting to sign in...</p>
      </div>
    </div>
  )
} 