import { Move } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool, ToolEvent } from '@/types'
import type { Canvas } from 'fabric'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

export const moveTool: Tool = {
  id: TOOL_IDS.MOVE,
  name: 'Move Tool',
  icon: Move,
  cursor: 'move',
  shortcut: 'V',
  isImplemented: true,
  
  onActivate: (canvas: Canvas) => {
    // Enable object selection
    canvas.selection = true
    
    // Make all objects selectable based on auto-select option
    const autoSelect = useToolOptionsStore.getState().getOptionValue<boolean>(TOOL_IDS.MOVE, 'autoSelect') ?? true
    
    canvas.forEachObject((obj) => {
      obj.selectable = autoSelect
      obj.evented = autoSelect
    })
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    canvas.discardActiveObject()
    canvas.renderAll()
  },
  
  onMouseDown: (e: ToolEvent) => {
    const canvas = e.target
    if (!canvas) return
    
    const autoSelect = useToolOptionsStore.getState().getOptionValue<boolean>(TOOL_IDS.MOVE, 'autoSelect') ?? true
    
    if (autoSelect && e.target && typeof e.target === 'object' && 'selectable' in e.target) {
      // Auto-select the clicked object
      canvas.setActiveObject(e.target)
      canvas.renderAll()
    }
  }
} 