'use client'

import { useDocumentStore } from '@/store/documentStore'
import { useCanvasStore } from '@/store/canvasStore'

export function StatusBar() {
  const { currentDocument } = useDocumentStore()
  const { zoom } = useCanvasStore()
  
  return (
    <div className="h-6 bg-background border-t border-foreground/10 flex items-center px-2 md:px-4 text-xs text-foreground/60 overflow-x-auto">
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {currentDocument && (
          <>
            <span className="whitespace-nowrap">{currentDocument.width} × {currentDocument.height}px</span>
            <span className="hidden sm:inline">·</span>
            <span className="whitespace-nowrap">{Math.round(zoom * 100)}%</span>
          </>
        )}
      </div>
    </div>
  )
} 