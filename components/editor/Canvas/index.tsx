'use client'

import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolStore } from '@/store/toolStore'
import { useFileHandler } from '@/hooks/useFileHandler'
import { useHistoryStore } from '@/store/historyStore'
import type { TPointerEventInfo, TPointerEvent } from 'fabric'
import type { ToolEvent } from '@/types'
import { CopyCommand, CutCommand, PasteCommand } from '@/lib/editor/commands/clipboard'
import { ClearSelectionCommand } from '@/lib/editor/commands/selection'
import { useSelectionStore } from '@/store/selectionStore'

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    initCanvas,
    disposeCanvas,
    startPanning,
    pan,
    endPanning,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToActual,
    zoom,
    fabricCanvas,
    selectionManager,
    clipboardManager
  } = useCanvasStore()
  
  const { getActiveTool } = useToolStore()
  const { handleDrop, handleDragOver } = useFileHandler()
  const { executeCommand } = useHistoryStore()
  
  // Initialize canvas
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    
    console.log('[Canvas] Starting initialization...')
    const startTime = Date.now()
    
    // Initialize canvas
    initCanvas(canvas, container.offsetWidth, container.offsetHeight).then(() => {
      console.log('[Canvas] Initialization complete after', Date.now() - startTime, 'ms')
    }).catch((error) => {
      console.error('[Canvas] Initialization failed:', error)
    })
    
    return () => {
      console.log('[Canvas] Disposing canvas...')
      disposeCanvas()
    }
  }, [initCanvas, disposeCanvas])
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      const isMeta = e.metaKey || e.ctrlKey
      
      // Clipboard shortcuts
      if (isMeta && e.key === 'c' && clipboardManager) {
        e.preventDefault()
        const command = new CopyCommand(clipboardManager)
        executeCommand(command)
      } else if (isMeta && e.key === 'x' && clipboardManager && fabricCanvas && selectionManager) {
        e.preventDefault()
        const command = new CutCommand(fabricCanvas, clipboardManager, selectionManager)
        executeCommand(command)
      } else if (isMeta && e.key === 'v' && clipboardManager && fabricCanvas) {
        e.preventDefault()
        const command = new PasteCommand(fabricCanvas, clipboardManager)
        executeCommand(command)
      }
      
      // Selection shortcuts
      else if (isMeta && e.key === 'a' && selectionManager) {
        e.preventDefault()
        selectionManager.selectAll()
        useSelectionStore.getState().updateSelectionState(true, {
          x: 0,
          y: 0,
          width: fabricCanvas?.width || 0,
          height: fabricCanvas?.height || 0
        })
      } else if (isMeta && e.key === 'd' && selectionManager) {
        e.preventDefault()
        const command = new ClearSelectionCommand(selectionManager)
        executeCommand(command)
        useSelectionStore.getState().updateSelectionState(false)
      }
      
      // Zoom shortcuts
      else if (isMeta && e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (isMeta && e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if (isMeta && e.key === '0') {
        e.preventDefault()
        zoomToFit()
      } else if (isMeta && e.key === '1') {
        e.preventDefault()
        zoomToActual()
      }
      
      // Pan with space
      if (e.key === ' ' && fabricCanvas && !e.repeat) {
        e.preventDefault()
        // We'll handle panning with mouse events when space is held
        fabricCanvas.defaultCursor = 'grab'
        fabricCanvas.hoverCursor = 'grab'
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && fabricCanvas) {
        fabricCanvas.defaultCursor = 'default'
        fabricCanvas.hoverCursor = 'move'
        endPanning()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [fabricCanvas, clipboardManager, selectionManager, zoomIn, zoomOut, zoomToFit, zoomToActual, endPanning, executeCommand])
  
  // Handle tool events
  useEffect(() => {
    if (!fabricCanvas) return
    
    const handleMouseDown = (options: unknown) => {
      const activeTool = getActiveTool()
      
      // Check if space is pressed for temporary hand tool
      const spacePressed = (window as { spacePressed?: boolean }).spacePressed
      if (spacePressed) {
        const e = options as { e: MouseEvent | TouchEvent }
        if ('button' in e.e && e.e.button === 0) { // Left mouse button
          startPanning(options as Parameters<typeof startPanning>[0])
          return
        }
      }
      
      // Otherwise use active tool
      if (activeTool?.onMouseDown) {
        // Pass the event with canvas reference
        const toolEvent = { ...(options as TPointerEventInfo<TPointerEvent>), target: fabricCanvas }
        activeTool.onMouseDown(toolEvent as ToolEvent)
      }
    }
    
    const handleMouseMove = (options: unknown) => {
      const activeTool = getActiveTool()
      
      // Check if we're panning with space
      const spacePressed = (window as { spacePressed?: boolean }).spacePressed
      if (spacePressed && useCanvasStore.getState().isPanning) {
        pan(options as Parameters<typeof pan>[0])
        return
      }
      
      // Otherwise use active tool
      if (activeTool?.onMouseMove) {
        // Pass the event with canvas reference
        const toolEvent = { ...(options as TPointerEventInfo<TPointerEvent>), target: fabricCanvas }
        activeTool.onMouseMove(toolEvent as ToolEvent)
      }
    }
    
    const handleMouseUp = (options: unknown) => {
      const activeTool = getActiveTool()
      
      // End panning if we were panning
      if (useCanvasStore.getState().isPanning) {
        endPanning()
        return
      }
      
      // Otherwise use active tool
      if (activeTool?.onMouseUp) {
        // Pass the event with canvas reference
        const toolEvent = { ...(options as TPointerEventInfo<TPointerEvent>), target: fabricCanvas }
        activeTool.onMouseUp(toolEvent as ToolEvent)
      }
    }
    
    // Track space key state
    const trackSpace = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        (window as { spacePressed?: boolean }).spacePressed = e.type === 'keydown'
      }
    }
    
    fabricCanvas.on('mouse:down', handleMouseDown)
    fabricCanvas.on('mouse:move', handleMouseMove)
    fabricCanvas.on('mouse:up', handleMouseUp)
    window.addEventListener('keydown', trackSpace)
    window.addEventListener('keyup', trackSpace)
    
    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown)
      fabricCanvas.off('mouse:move', handleMouseMove)
      fabricCanvas.off('mouse:up', handleMouseUp)
      window.removeEventListener('keydown', trackSpace)
      window.removeEventListener('keyup', trackSpace)
    }
  }, [fabricCanvas, getActiveTool, startPanning, pan, endPanning])
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !fabricCanvas) return
      
      const { width, height } = containerRef.current.getBoundingClientRect()
      fabricCanvas.setDimensions({ width, height })
      fabricCanvas.renderAll()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fabricCanvas])
  
  return (
    <div 
      ref={containerRef}
      className="relative flex-1 bg-content-background overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Canvas checkerboard background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 
            50% / 20px 20px
          `
        }}
      />
      
      {/* Main canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-popover/90 backdrop-blur-sm text-popover-foreground px-3 py-1 rounded-md text-sm font-mono border border-border">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
} 