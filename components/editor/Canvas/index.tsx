'use client'

import { useEffect, useRef, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { CanvasManagerFactory } from '@/lib/editor/canvas/CanvasManagerFactory'
import { useCanvasStore as useTypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { useFileHandler } from '@/hooks/useFileHandler'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null)
  
  // Get services from DI container
  const canvasFactory = useService<CanvasManagerFactory>('CanvasManagerFactory')
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  
  // Use the typed canvas store (removed unused variable)
  useTypedCanvasStore(canvasStore)
  
  const { handleDrop, handleDragOver } = useFileHandler('insert')
  
  // Initialize canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container || !canvasFactory) return
    
    console.log('[Canvas] Starting Konva initialization...')
    const startTime = Date.now()
    
    try {
      // Create canvas manager
      const manager = canvasFactory.create(container)
      setCanvasManager(manager)
      
      // Add initial layer
      manager.addLayer({ name: 'Layer 1' })
      
      console.log('[Canvas] Konva initialization complete after', Date.now() - startTime, 'ms')
    } catch (error) {
      console.error('[Canvas] Initialization failed:', error)
    }
    
    return () => {
      console.log('[Canvas] Disposing canvas...')
      // Use the ref to get the current canvas manager
      if (containerRef.current) {
        // Canvas manager will be cleaned up by ResourceManager
      }
    }
  }, [canvasFactory])
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!canvasManager) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      const isMeta = e.metaKey || e.ctrlKey
      
      // Selection shortcuts
      if (isMeta && e.key === 'a') {
        e.preventDefault()
        canvasManager.selectAll()
      } else if (isMeta && e.key === 'd') {
        e.preventDefault()
        canvasManager.deselectAll()
      }
      
      // Zoom shortcuts
      else if (isMeta && e.key === '=') {
        e.preventDefault()
        const currentZoom = canvasManager.state.zoom
        canvasManager.setZoom(Math.min(currentZoom * 1.2, 5))
      } else if (isMeta && e.key === '-') {
        e.preventDefault()
        const currentZoom = canvasManager.state.zoom
        canvasManager.setZoom(Math.max(currentZoom / 1.2, 0.1))
      } else if (isMeta && e.key === '0') {
        e.preventDefault()
        canvasManager.fitToScreen()
      } else if (isMeta && e.key === '1') {
        e.preventDefault()
        canvasManager.setZoom(1)
      }
      
      // Delete key handling
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const selection = canvasManager.state.selection
        if (selection?.type === 'objects') {
          // Delete selected objects
          selection.objectIds.forEach(id => {
            canvasManager.removeObject(id)
          })
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canvasManager])
  
  // Handle window resize
  useEffect(() => {
    if (!canvasManager || !containerRef.current) return
    
    const handleResize = () => {
      const container = containerRef.current
      if (!container) return
      
      const { width, height } = container.getBoundingClientRect()
      canvasManager.resize(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [canvasManager])
  
  return (
    <div 
      ref={containerRef}
      className="relative flex-1 bg-content-background p-4 min-w-0 overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Konva will create the canvas elements inside the container */}
      
      {/* Zoom indicator */}
      {canvasManager && (
        <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-md text-sm font-mono border border-foreground/10 shadow-lg">
          {Math.round(canvasManager.state.zoom * 100)}%
        </div>
      )}
    </div>
  )
} 