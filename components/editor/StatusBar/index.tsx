'use client'

import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'

export function StatusBar() {
  const documentStore = useService<EventDocumentStore>('DocumentStore')
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const canvasState = useCanvasStore(canvasStore)
  
  const currentDocument = documentStore.getCurrentDocument()
  
  return (
    <div className="h-6 bg-background border-t border-foreground/10 flex items-center px-4 text-xs text-foreground/60">
      <div className="flex items-center gap-4">
        {currentDocument && (
          <>
            <span>{currentDocument.width} × {currentDocument.height}px</span>
            <span>·</span>
            <span>{Math.round(canvasState.zoom * 100)}%</span>
          </>
        )}
      </div>
    </div>
  )
} 