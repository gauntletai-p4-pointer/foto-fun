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
import { TOOL_IDS } from '@/constants'

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
      // Create canvas manager with the container div
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
  
  // Handle mouse wheel and trackpad gestures
  useEffect(() => {
    if (!canvasManager || !containerRef.current) return
    
    const container = containerRef.current
    
    // Handle wheel events for zoom and pan
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      // Alt + scroll for panning (override default zoom behavior)
      if (e.altKey) {
        const panSpeed = 1
        if (e.shiftKey) {
          // Alt + Shift + scroll for horizontal pan
          const deltaX = e.deltaY * panSpeed
          const currentPan = canvasManager.state.pan
          canvasManager.setPan({
            x: currentPan.x - deltaX,
            y: currentPan.y
          })
        } else {
          // Alt + scroll for vertical pan
          const deltaY = e.deltaY * panSpeed
          const currentPan = canvasManager.state.pan
          canvasManager.setPan({
            x: currentPan.x,
            y: currentPan.y - deltaY
          })
        }
        return
      }
      
      // Check if it's a pinch gesture (trackpad)
      // On macOS, pinch gestures come through as ctrl+wheel events
      if (e.ctrlKey) {
        // Pinch zoom on trackpad - match Photoshop behavior
        // Photoshop behavior:
        // - Two fingers spreading apart (pinch out) = zoom in
        // - Two fingers coming together (pinch in) = zoom out
        // Browser wheel events:
        // - Pinch out (zoom in) = negative deltaY
        // - Pinch in (zoom out) = positive deltaY
        const zoomSpeed = 0.01
        const delta = -e.deltaY * zoomSpeed  // Negative deltaY increases zoom
        const currentZoom = canvasManager.state.zoom
        const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + delta)))
        
        // Get mouse position for zoom center
        const rect = container.getBoundingClientRect()
        const mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
        
        // Calculate zoom with mouse position as center
        const oldZoom = currentZoom
        const stage = canvasManager.konvaStage
        
        // Get the current stage position (pan)
        const oldPos = stage.position()
        
        // Calculate the point on the canvas that's under the mouse
        // This accounts for the current zoom and pan
        const pointTo = {
          x: (mousePos.x - oldPos.x) / oldZoom,
          y: (mousePos.y - oldPos.y) / oldZoom
        }
        
        // Calculate new position to keep the same point under the mouse after zoom
        const newPos = {
          x: mousePos.x - pointTo.x * newZoom,
          y: mousePos.y - pointTo.y * newZoom
        }
        
        // Apply the new zoom and position
        canvasManager.setZoom(newZoom)
        canvasManager.setPan(newPos)
      } else if (e.shiftKey) {
        // Shift + scroll for horizontal pan
        const panSpeed = 1
        const deltaX = e.deltaY * panSpeed
        const currentPan = canvasManager.state.pan
        canvasManager.setPan({
          x: currentPan.x - deltaX,
          y: currentPan.y
        })
      } else {
        // Regular two-finger scroll should zoom (Photoshop behavior)
        // Two fingers up (negative deltaY) = zoom in
        // Two fingers down (positive deltaY) = zoom out
        const zoomSpeed = 0.001
        const delta = -e.deltaY * zoomSpeed
        const currentZoom = canvasManager.state.zoom
        const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + delta)))
        
        // Get mouse position for zoom center
        const rect = container.getBoundingClientRect()
        const mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
        
        const oldZoom = currentZoom
        const stage = canvasManager.konvaStage
        
        // Get the current stage position (pan)
        const oldPos = stage.position()
        
        // Calculate the point on the canvas that's under the mouse
        // This accounts for the current zoom and pan
        const pointTo = {
          x: (mousePos.x - oldPos.x) / oldZoom,
          y: (mousePos.y - oldPos.y) / oldZoom
        }
        
        // Calculate new position to keep the same point under the mouse after zoom
        const newPos = {
          x: mousePos.x - pointTo.x * newZoom,
          y: mousePos.y - pointTo.y * newZoom
        }
        
        // Apply the new zoom and position
        canvasManager.setZoom(newZoom)
        canvasManager.setPan(newPos)
      }
    }
    
    // Add passive: false to prevent Chrome warning and ensure preventDefault works
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [canvasManager])
  
  // Handle keyboard events for tools
  useEffect(() => {
    if (!canvasManager || !toolStore) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Spacebar for temporary hand tool
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        // Store current tool
        const currentTool = toolStore.getActiveTool()
        if (currentTool && currentTool.id !== TOOL_IDS.HAND) {
          // Temporarily enable dragging
          canvasManager.setDraggable(true)
          canvasManager.konvaStage.container().style.cursor = 'grab'
        }
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
      else if (isMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const currentZoom = canvasManager.state.zoom
        canvasManager.setZoom(Math.min(currentZoom * 1.2, 10))
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
      
      // Release spacebar - restore previous tool
      if (e.code === 'Space') {
        const currentTool = toolStore.getActiveTool()
        if (currentTool && currentTool.id !== TOOL_IDS.HAND) {
          // Disable dragging if not hand tool
          canvasManager.setDraggable(false)
          canvasManager.konvaStage.container().style.cursor = currentTool.cursor || 'default'
        }
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
  
  // Handle window resize for viewport changes
  useEffect(() => {
    if (!canvasManager || !containerRef.current) return
    
    const handleResize = () => {
      const container = containerRef.current
      if (!container) return
      
      // Only update viewport size, not canvas size
      canvasManager.updateViewport()
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
      className="relative flex-1 bg-content-background min-w-0 overflow-hidden"
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