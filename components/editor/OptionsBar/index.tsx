'use client'

import { useToolStore } from '@/store/toolStore'
import { ToolOptions } from '../ToolOptions'
import { SelectionOptions } from './SelectionOptions'
import { TOOL_IDS } from '@/constants'

const SELECTION_TOOLS: string[] = [
  TOOL_IDS.MARQUEE_RECT,
  TOOL_IDS.MARQUEE_ELLIPSE,
  TOOL_IDS.LASSO,
  TOOL_IDS.MAGIC_WAND,
  TOOL_IDS.QUICK_SELECTION
]

export function OptionsBar() {
  const { activeTool } = useToolStore()
  
  const isSelectionTool = SELECTION_TOOLS.includes(activeTool)
  
  return (
    <div className="h-10 bg-background border-b border-foreground/10 flex items-center px-4 gap-4">
      <ToolOptions />
      
      {/* Selection tool mode indicator */}
      {isSelectionTool && <SelectionOptions />}
      
      {/* Crop tool specific UI */}
      {activeTool === 'crop' && (
        <div className="ml-auto text-sm text-foreground/60">
          Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-foreground/10 rounded">Enter</kbd> to apply crop or <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-foreground/10 rounded">Esc</kbd> to cancel
        </div>
      )}
    </div>
  )
} 