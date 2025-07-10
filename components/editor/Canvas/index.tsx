'use client'

import { useEffect, useRef, useState } from 'react'
import { useService, useAsyncService } from '@/lib/core/AppInitializer'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { CanvasManagerFactory } from '@/lib/editor/canvas/CanvasManagerFactory'
import { useCanvasStore as useTypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'
import { useFileHandler } from '@/hooks/useFileHandler'
import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { ToolEvent } from '@/lib/editor/canvas/types'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null)
  
  // Get services
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const toolStore = useService<EventToolStore>('ToolStore')
  const eventBus = useService<ReturnType<typeof getTypedEventBus>>('TypedEventBus')
  
  // Get the async CanvasManagerFactory
  const { service: canvasFactory, loading } = useAsyncService<CanvasManagerFactory>('CanvasManagerFactory')
  
  // Get the service container to update the CanvasManager instance
  const container = ServiceContainer.getInstance()
  
  // Use the typed canvas store (removed unused variable)
  useTypedCanvasStore(canvasStore)
  
  const { handleDrop, handleDragOver } = useFileHandler('insert')
  
  // Initialize canvas
  useEffect(() => {
    if (!containerRef.current || !canvasFactory || loading) return
    
    console.log('[Canvas] Starting Konva initialization...')
    const startTime = Date.now()
    
    try {
      // Create canvas manager
      const manager = canvasFactory.create(containerRef.current)
      
      setCanvasManager(manager)
      
      // Register the active CanvasManager instance in the container
      container.updateInstance('CanvasManager', manager)
      
      // Add initial layer
      manager.addLayer({ name: 'Layer 1' })
      
      console.log('[Canvas] Konva initialization complete after', Date.now() - startTime, 'ms')
    } catch (error) {
      console.error('[Canvas] Initialization failed:', error)
    }
    
    return () => {
      // Clean up
      const currentManager = canvasManager
      if (currentManager) {
        currentManager.destroy()
      }
      setCanvasManager(null)
      
      // Clear the CanvasManager from the container
      container.updateInstance('CanvasManager', null)
    }
  }, [canvasFactory, loading, canvasStore, toolStore, eventBus, container])
  
  // Handle document image loading
  useEffect(() => {
    if (!canvasManager) return
    
    const unsubscribe = eventBus.on('document.image.ready', async (data) => {
      console.log('[Canvas] Loading document image...')
      
      try {
        // Clear existing content
        const layers = [...canvasManager.state.layers]
        layers.forEach(layer => {
          layer.objects.forEach(obj => {
            canvasManager.removeObject(obj.id)
          })
        })
        
        // Resize canvas to match image
        await canvasManager.resize(data.imageElement.width, data.imageElement.height)
        
        // Add the image to the canvas
        await canvasManager.addObject({
          type: 'image',
          data: data.imageElement,
          name: 'Background',
          transform: {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            skewX: 0,
            skewY: 0
          }
        })
        
        // Fit to screen
        canvasManager.fitToScreen()
        
        console.log('[Canvas] Document image loaded successfully')
      } catch (error) {
        console.error('[Canvas] Failed to load document image:', error)
      }
    })
    
    return () => {
      unsubscribe()
    }
  }, [canvasManager, eventBus])
  
  // Handle tool activation
  useEffect(() => {
    if (!canvasManager || !toolStore) return
    
    const typedEventBus = getTypedEventBus()
    const unsubscribe = typedEventBus.on('tool.activated', (data) => {
      const tool = toolStore.getTool(data.toolId)
      if (tool) {
        // Deactivate previous tool
        const previousTool = toolStore.getActiveTool()
        if (previousTool && previousTool.id !== tool.id) {
          previousTool.onDeactivate?.(canvasManager)
        }
        
        // Activate new tool
        tool.onActivate?.(canvasManager)
      }
    })
    
    // Listen for option changes
    const unsubscribeOptions = typedEventBus.on('tool.option.changed', (data) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool && activeTool.id === data.toolId && 'setOption' in activeTool) {
        const tool = activeTool as { setOption: (key: string, value: unknown) => void }
        tool.setOption(data.optionId, data.value)
      }
    })
    
    // Activate initial tool if any
    const activeTool = toolStore.getActiveTool()
    if (activeTool) {
      activeTool.onActivate?.(canvasManager)
    }
    
    return () => {
      unsubscribe()
      unsubscribeOptions()
      // Deactivate current tool
      const currentTool = toolStore.getActiveTool()
      if (currentTool) {
        currentTool.onDeactivate?.(canvasManager)
      }
    }
  }, [canvasManager, toolStore])
  
  // Handle mouse events for tools
  useEffect(() => {
    if (!canvasManager || !toolStore) return
    
    const stage = canvasManager.konvaStage
    const container = stage.container()
    
    // Helper to create ToolEvent from mouse event
    const createToolEvent = (type: 'mousedown' | 'mousemove' | 'mouseup', e: MouseEvent): ToolEvent => {
      const rect = container.getBoundingClientRect()
      const pointerPos = stage.getPointerPosition() || { x: 0, y: 0 }
      
      // Calculate canvas coordinates considering zoom and pan
      const zoom = canvasManager.state.zoom
      const pan = canvasManager.state.pan
      
      // Screen coordinates (relative to viewport)
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      
      // Canvas coordinates (considering zoom and pan)
      const point = {
        x: (screenPoint.x - pan.x) / zoom,
        y: (screenPoint.y - pan.y) / zoom
      }
      
      return {
        type,
        point,
        screenPoint,
        pressure: 1, // TODO: Support pressure-sensitive devices
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        button: e.button,
        nativeEvent: e
      }
    }
    
    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onMouseDown) {
        const toolEvent = createToolEvent('mousedown', e)
        activeTool.onMouseDown(toolEvent)
      }
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onMouseMove) {
        const toolEvent = createToolEvent('mousemove', e)
        activeTool.onMouseMove(toolEvent)
      }
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onMouseUp) {
        const toolEvent = createToolEvent('mouseup', e)
        activeTool.onMouseUp(toolEvent)
      }
    }
    
    // Add event listeners
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    
    // Also listen on window for mouseup to catch drags that end outside canvas
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [canvasManager, toolStore])
  
  // Handle keyboard events for tools
  useEffect(() => {
    if (!canvasManager || !toolStore) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // First, let the active tool handle the event
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onKeyDown) {
        activeTool.onKeyDown(e)
        // If the tool handled it, it should preventDefault
        if (e.defaultPrevented) return
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
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Let the active tool handle the event
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onKeyUp) {
        activeTool.onKeyUp(e)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [canvasManager, toolStore])
  
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
  
  // Show loading state while canvas factory is being loaded
  if (loading) {
    return (
      <div className="relative flex-1 bg-content-background p-4 min-w-0 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <p className="text-sm text-gray-400">Loading canvas...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      data-canvas-container
      className="relative flex-1 bg-content-background min-w-0"
      style={{ 
        overflow: 'auto',
        position: 'relative'
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Canvas wrapper with proper dimensions */}
      <div 
        style={{
          position: 'relative',
          margin: '16px', // Equivalent to p-4
          minWidth: canvasManager ? `${canvasManager.state.width}px` : '800px',
          minHeight: canvasManager ? `${canvasManager.state.height}px` : '600px',
          backgroundColor: canvasManager?.state.backgroundColor || '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden' // Only hide overflow on the actual canvas area
        }}
      >
        {/* Konva will create the canvas elements inside this wrapper */}
      </div>
      
      {/* Zoom indicator */}
      {canvasManager && (
        <div className="fixed bottom-8 right-8 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-md text-sm font-mono border border-foreground/10 shadow-lg z-10">
          {Math.round(canvasManager.state.zoom * 100)}%
        </div>
      )}
    </div>
  )
} 