'use client'

import React, { useRef, useEffect, useState } from 'react'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { useFileHandler } from '@/hooks/useFileHandler'
import { useService, useAsyncService, useServiceContainer } from '@/lib/core/AppInitializer'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { TypedCanvasStore, useCanvasStore as useTypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'

import { CanvasManagerFactory } from '@/lib/editor/canvas/CanvasManagerFactory'
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasManager, setCanvasManager] = useState<CanvasManager | null>(null)
  
  // Get services
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const toolStore = useService<EventToolStore>('ToolStore')
  const eventBus = useService<TypedEventBus>('TypedEventBus')
  
  // Get the async CanvasManagerFactory
  const { service: canvasFactory, loading } = useAsyncService<CanvasManagerFactory>('CanvasManagerFactory')
  
  // Get the service container from React context (not singleton)
  const container = useServiceContainer()
  
  // Use the typed canvas store
  useTypedCanvasStore(canvasStore)
  
  // File handler for drag and drop
  const { handleDrop, handleDragOver } = useFileHandler()
  
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
      
      // Canvas is always ready - no document needed
      
      console.log('[Canvas] Konva initialization complete after', Date.now() - startTime, 'ms')
    } catch (error) {
      console.error('[Canvas] Initialization failed:', error)
    }
    
    return () => {
      // Clean up
      if (canvasManager) {
        canvasManager.destroy()
      }
      setCanvasManager(null)
      
      // Clear the CanvasManager from the container
      container.updateInstance('CanvasManager', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasFactory, loading, canvasStore, toolStore, eventBus, container])
  
  // Handle tool activation
  useEffect(() => {
    if (!canvasManager || !toolStore) return
    
    const typedEventBus = eventBus
    const unsubscribe = typedEventBus.on('tool.activated', (_data) => {
      const tool = toolStore.getActiveTool()
      if (tool) {
        // Set cursor
        const container = canvasManager.stage.container()
        if (container) {
          container.style.cursor = tool.cursor || 'default'
        }
      }
    })
    
    // Listen for option changes
    const unsubscribeOptions = typedEventBus.on('tool.option.changed', (data) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool && activeTool.toolId === data.toolId) {
        // Tools now handle options internally through their options system
        // The tool will be notified through the event system
      }
    })
    
    // Set initial cursor if tool is active
    const activeTool = toolStore.getActiveTool()
    if (activeTool) {
      const container = canvasManager.stage.container()
      if (container) {
        container.style.cursor = activeTool.cursor || 'default'
      }
    }
    
    return () => {
      unsubscribe()
      unsubscribeOptions()
    }
  }, [canvasManager, toolStore, eventBus])
  
  // Handle mouse events for tools
  useEffect(() => {
    if (!canvasManager || !toolStore) return
    
    const stage = canvasManager.stage
    const container = stage.container()
    
    // Helper to create ToolEvent from mouse event
    const createCanvasToolEvent = (eventType: 'mousedown' | 'mousemove' | 'mouseup', e: MouseEvent): ToolEvent => {
      const rect = container.getBoundingClientRect()
      
      // Calculate canvas coordinates considering zoom and pan
      const camera = canvasManager.getCamera()
      const zoom = camera.zoom
      const pan = { x: camera.x, y: camera.y }
      
      // Screen coordinates (relative to viewport)
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      
      // Canvas coordinates (considering zoom and pan)
      const canvasPoint = {
        x: (screenPoint.x - pan.x) / zoom,
        y: (screenPoint.y - pan.y) / zoom
      }
      
      return {
        // Screen coordinates
        x: e.clientX,
        y: e.clientY,
        
        // Canvas coordinates (transformed)
        canvasX: canvasPoint.x,
        canvasY: canvasPoint.y,
        
        // Mouse button data
        button: e.button,
        buttons: e.buttons,
        
        // Keyboard modifiers
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        
        // Event metadata
        eventType,
        timestamp: Date.now(),
        
        // Touch/pressure support
        pressure: 1.0,
        
        // Event control
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation()
      }
    }
    
    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onMouseDown) {
        const toolEvent = createCanvasToolEvent('mousedown', e)
        activeTool.onMouseDown(toolEvent)
      }
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onMouseMove) {
        const toolEvent = createCanvasToolEvent('mousemove', e)
        activeTool.onMouseMove(toolEvent)
      }
    }
    
    const handleMouseUp = (e: MouseEvent) => {
      const activeTool = toolStore.getActiveTool()
      if (activeTool?.onMouseUp) {
        const toolEvent = createCanvasToolEvent('mouseup', e)
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
          const currentCamera = canvasManager.getCamera()
          canvasManager.setPan({
            x: currentCamera.x - deltaX,
            y: currentCamera.y
          })
        } else {
          // Alt + scroll for vertical pan
          const deltaY = e.deltaY * panSpeed
          const currentCamera = canvasManager.getCamera()
          canvasManager.setPan({
            x: currentCamera.x,
            y: currentCamera.y - deltaY
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
        const currentZoom = canvasManager.getCamera().zoom
        const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + delta)))
        
        // Get mouse position for zoom center
        const rect = container.getBoundingClientRect()
        const mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
        
        // Calculate zoom with mouse position as center
        const oldZoom = currentZoom
        const stage = canvasManager.stage
        
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
        const currentCamera = canvasManager.getCamera()
        canvasManager.setPan({
          x: currentCamera.x - deltaX,
          y: currentCamera.y
        })
      } else {
        // Regular two-finger scroll should zoom (Photoshop behavior)
        // Two fingers up (negative deltaY) = zoom in
        // Two fingers down (positive deltaY) = zoom out
        const zoomSpeed = 0.001
        const delta = -e.deltaY * zoomSpeed
        const currentZoom = canvasManager.getCamera().zoom
        const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + delta)))
        
        // Get mouse position for zoom center
        const rect = container.getBoundingClientRect()
        const mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
        
        const oldZoom = currentZoom
        const stage = canvasManager.stage
        
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
        if (currentTool && currentTool.toolId !== 'hand') {
          // Temporarily enable dragging
          canvasManager.setDraggable(true)
          canvasManager.stage.container().style.cursor = 'grab'
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
        const currentZoom = canvasManager.getCamera().zoom
        canvasManager.setZoom(Math.min(currentZoom * 1.2, 10))
      } else if (isMeta && e.key === '-') {
        e.preventDefault()
        const currentZoom = canvasManager.getCamera().zoom
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
        const selectedObjects = canvasManager.getSelectedObjects()
        if (selectedObjects.length > 0) {
          // Delete selected objects
          selectedObjects.forEach(obj => {
            canvasManager.removeObject(obj.id)
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
        if (currentTool && currentTool.toolId !== 'hand') {
          // Disable dragging if not hand tool
          canvasManager.setDraggable(false)
          canvasManager.stage.container().style.cursor = currentTool.cursor || 'default'
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
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-foreground/20 mx-auto mb-2"></div>
          <p className="text-sm text-foreground/60">Loading canvas...</p>
        </div>
      </div>
    )
  }
  
  // Canvas always renders - no empty state
  return (
    <div 
      ref={containerRef} 
      className="flex-1 relative overflow-hidden bg-content-background"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    />
  )
} 