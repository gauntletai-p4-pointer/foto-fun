'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MenuBar } from '@/components/editor/MenuBar'
import { ToolPalette } from '@/components/editor/ToolPalette'
import { Panels } from '@/components/editor/Panels'
import { OptionsBar } from '@/components/editor/OptionsBar'
import { StatusBar } from '@/components/editor/StatusBar'
import { ImageGenerationDialog } from '@/components/editor/dialogs/ImageGenerationDialog'
import { useAsyncService } from '@/lib/core/AppInitializer'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { createClient } from '@/lib/db/supabase/client'
import { eventHistoryKeyboardHandlers } from '@/lib/events/history/EventBasedHistoryStore'

// Dynamically import Canvas to avoid SSR issues with Konva
const Canvas = dynamic(
  () => import('@/components/editor/Canvas').then(mod => ({ default: mod.Canvas })),
  { 
    ssr: false,
    loading: () => (
      <LoadingFallback />
    )
  }
)

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-content-background min-w-0">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground/20 mx-auto mb-2"></div>
        <p className="text-sm text-foreground/60">Loading canvas...</p>
      </div>
    </div>
  )
}

// Inner component that uses services
function EditorContent() {
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore')
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!toolStore) return
    
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
      
      // Save (Cmd/Ctrl + S) - now saves project/workspace
      if (isMeta && e.key === 's') {
        e.preventDefault()
        // TODO: Implement project save
        console.log('Save project')
        return
      }
      
      // Tool shortcuts (when not holding modifiers)
      if (!isMeta && !e.altKey && !e.shiftKey) {
        // Find tool by shortcut from ToolRegistry
        const availableTools = toolStore.getAvailableTools()
        for (const toolClass of availableTools) {
          if (toolClass.metadata.shortcut?.toLowerCase() === e.key.toLowerCase()) {
            e.preventDefault()
            toolStore.activateTool(toolClass.id)
            break
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toolStore])
  
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <MenuBar />
      <OptionsBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Fixed width tool palette */}
        <div className="w-12 flex-shrink-0">
          <ToolPalette />
        </div>
        {/* Flexible canvas area */}
        <div className="flex-1 min-w-0">
          <Canvas />
        </div>
        {/* Fixed width panels */}
        <div className="w-80 flex-shrink-0">
          <Panels />
        </div>
      </div>
      <StatusBar />
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
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground/20 mx-auto mb-4"></div>
          <p className="text-sm text-foreground/60">Loading editor...</p>
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
    <div className="h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-foreground/20 mx-auto mb-4"></div>
        <p className="text-sm text-foreground/60">Redirecting to sign in...</p>
      </div>
    </div>
  )
} 