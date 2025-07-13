'use client'

import { useEffect, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'

import { useFileHandler } from '@/hooks/useFileHandler'
import { useHistoryStore } from '@/store/historyStore'

import { CopyCommand, CutCommand, PasteCommand } from '@/lib/editor/commands/clipboard'
import { ClearSelectionCommand } from '@/lib/editor/commands/selection'
import { useSelectionStore } from '@/store/selectionStore'
import { RemoveObjectCommand } from '@/lib/editor/commands/canvas'
import { IText } from 'fabric'

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
    clipboardManager,
    resizeViewport
  } = useCanvasStore()
  
  const { handleDrop, handleDragOver } = useFileHandler('insert')
  const { executeCommand } = useHistoryStore()
  
  // Initialize canvas
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    
    console.log('[Canvas] Starting initialization...')
    const startTime = Date.now()
    
    // Get the canvas wrapper dimensions (accounting for padding)
    const canvasWrapper = container.querySelector('div') as HTMLDivElement
    if (!canvasWrapper) return
    
    const { width, height } = canvasWrapper.getBoundingClientRect()
    
    // Initialize canvas
    initCanvas(canvas, width, height).then(() => {
      console.log('[Canvas] Initialization complete after', Date.now() - startTime, 'ms')
      // Update filter states after canvas is initialized
      useCanvasStore.getState().updateFilterStates()
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
      
      // Delete key handling
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only handle delete if not in a text input
        if (fabricCanvas) {
          const activeObject = fabricCanvas.getActiveObject()
          if (activeObject && !(activeObject.type === 'i-text' && (activeObject as IText).isEditing)) {
            e.preventDefault()
            const command = new RemoveObjectCommand(fabricCanvas, activeObject)
            executeCommand(command)
          }
        }
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
  
  // Handle space-bar panning (independent of tool system)
  useEffect(() => {
    if (!fabricCanvas) return
    
    const handleMouseDown = (options: unknown) => {
      // Check if space is pressed for temporary hand tool
      const spacePressed = (window as { spacePressed?: boolean }).spacePressed
      if (spacePressed) {
        const e = options as { e: MouseEvent | TouchEvent }
        if ('button' in e.e && e.e.button === 0) { // Left mouse button
          startPanning(options as Parameters<typeof startPanning>[0])
          return
        }
      }
    }
    
    const handleMouseMove = (options: unknown) => {
      // Check if we're panning with space
      const spacePressed = (window as { spacePressed?: boolean }).spacePressed
      if (spacePressed && useCanvasStore.getState().isPanning) {
        pan(options as Parameters<typeof pan>[0])
        return
      }
    }
    
    const handleMouseUp = () => {
      // End panning if we were panning
      if (useCanvasStore.getState().isPanning) {
        endPanning()
        return
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
  }, [fabricCanvas, startPanning, pan, endPanning])
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      
      const { width, height } = containerRef.current.getBoundingClientRect()
      resizeViewport(width, height)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [resizeViewport])
  
  return (
    <div 
      ref={containerRef}
      className="relative flex-1 bg-content-background p-2 md:p-4 min-w-0"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Canvas wrapper with subtle border to indicate boundaries */}
      <div className="relative w-full h-full border border-foreground/10 rounded-lg overflow-hidden">
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
      </div>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-md text-sm font-mono border border-foreground/10 shadow-lg">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
} 