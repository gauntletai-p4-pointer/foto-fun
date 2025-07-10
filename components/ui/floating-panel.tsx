"use client"

import * as React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, GripVertical } from "lucide-react"

interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showCloseButton?: boolean
  initialPosition?: { x: number; y: number }
  constrainToViewport?: boolean
}

export const FloatingPanel = React.forwardRef<
  HTMLDivElement,
  FloatingPanelProps
>(
  ({ 
    className, 
    children, 
    title, 
    open = true, 
    onOpenChange, 
    showCloseButton = true,
    initialPosition,
    constrainToViewport = true,
    ...props 
  }, ref) => {
    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const panelRef = useRef<HTMLDivElement>(null)
    
    // Initialize position on mount
    useEffect(() => {
      if (!panelRef.current || (position.x !== 0 || position.y !== 0)) return
      
      const panel = panelRef.current
      const rect = panel.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      if (initialPosition) {
        // Use provided initial position
        setPosition(initialPosition)
      } else {
        // Default position: right side of screen, vertically centered
        const defaultX = viewportWidth - rect.width - 40 // 40px from right edge
        const defaultY = (viewportHeight - rect.height) / 2
        
        setPosition({ x: defaultX, y: defaultY })
      }
    }, [open, initialPosition, position.x, position.y])
    
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // Only drag from the header
      const target = e.target as HTMLElement
      if (!target.closest('[data-drag-handle]')) return
      
      setIsDragging(true)
      const rect = panelRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }, [])
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return
      
      let newX = e.clientX - dragOffset.x
      let newY = e.clientY - dragOffset.y
      
      if (constrainToViewport) {
        const rect = panelRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        // Constrain to viewport
        newX = Math.max(0, Math.min(newX, viewportWidth - rect.width))
        newY = Math.max(0, Math.min(newY, viewportHeight - rect.height))
      }
      
      setPosition({ x: newX, y: newY })
    }, [isDragging, dragOffset, constrainToViewport])
    
    const handleMouseUp = useCallback(() => {
      setIsDragging(false)
    }, [])
    
    // Add global mouse event listeners
    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging, handleMouseMove, handleMouseUp])
    
    if (!open) return null
    
    return (
      <div
        ref={ref}
        className={cn(
          "fixed z-50 bg-background border border-foreground/10 rounded-lg shadow-2xl",
          isDragging && "cursor-move select-none",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
        onMouseDown={handleMouseDown}
        {...props}
      >
        <div ref={panelRef} className="flex flex-col max-h-[90vh]">
          {/* Header */}
          {(title || showCloseButton) && (
            <div
              data-drag-handle
              className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 cursor-move"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-foreground/40" />
                {title && <h3 className="font-semibold text-sm">{title}</h3>}
              </div>
              {showCloseButton && onOpenChange && (
                <button
                  onClick={() => onOpenChange(false)}
                  className="ml-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    )
  }
)

FloatingPanel.displayName = "FloatingPanel"

// Header component for semantic structure
export function FloatingPanelHeader({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-4 py-3", className)}
      {...props}
    />
  )
}

// Content component for semantic structure
export function FloatingPanelContent({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-4", className)}
      {...props}
    />
  )
}

// Footer component for semantic structure
export function FloatingPanelFooter({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 p-4 border-t border-foreground/10 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
} 