'use client'

import { useEffect } from 'react'
import { MenuBar } from '@/components/editor/MenuBar'
import { ToolPalette } from '@/components/editor/ToolPalette'
import { Canvas } from '@/components/editor/Canvas'
import { Panels } from '@/components/editor/Panels'
import { OptionsBar } from '@/components/editor/OptionsBar'
import { StatusBar } from '@/components/editor/StatusBar'
import { useDocumentStore } from '@/store/documentStore'
import { useToolStore } from '@/store/toolStore'

export default function EditorPage() {
  const { saveDocument, currentDocument, createNewDocument } = useDocumentStore()
  
  // Create default document on mount
  useEffect(() => {
    if (!currentDocument) {
      createNewDocument('default')
    }
  }, [currentDocument, createNewDocument])
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      const isMeta = e.metaKey || e.ctrlKey
      
      // Save (Cmd/Ctrl + S)
      if (isMeta && e.key === 's') {
        e.preventDefault()
        if (currentDocument) {
          saveDocument()
        }
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
  
  return (
    <>
      <MenuBar />
      <OptionsBar />
      <div className="flex-1 flex overflow-hidden">
        <ToolPalette />
        <Canvas />
        <Panels />
      </div>
      <StatusBar />
    </>
  )
} 