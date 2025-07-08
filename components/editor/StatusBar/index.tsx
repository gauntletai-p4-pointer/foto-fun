'use client'

import { useDocumentStore } from '@/store/documentStore'
import { useCanvasStore } from '@/store/canvasStore'

export function StatusBar() {
  const { currentDocument } = useDocumentStore()
  const { zoom } = useCanvasStore()
  
  return (
    <div className="h-6 bg-background border-t border-foreground/10 flex items-center px-4 text-xs text-foreground/60">
      <div className="flex items-center gap-4">
        {currentDocument && (
          <>
            <span>{currentDocument.width} × {currentDocument.height}px</span>
            <span>·</span>
            <span>{Math.round(zoom * 100)}%</span>
          </>
        )}
      </div>
    </div>
  )
} 