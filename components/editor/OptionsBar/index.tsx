'use client'

import { ToolOptions } from '@/components/editor/ToolOptions'
import { useToolStore } from '@/store/toolStore'
import { TOOL_IDS } from '@/constants'

export function OptionsBar() {
  const activeTool = useToolStore((state) => state.activeTool)
  
  return (
    <div className="h-10 bg-background border-b flex items-center px-4 gap-4">
      <ToolOptions />
      
      {/* Show help text for specific tools */}
      {activeTool === TOOL_IDS.CROP && (
        <div className="ml-auto text-sm text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to apply crop or <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded">Esc</kbd> to cancel
        </div>
      )}
    </div>
  )
} 