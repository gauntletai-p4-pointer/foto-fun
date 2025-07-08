import { Move } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Tool } from '@/types'
import type { Canvas } from 'fabric'

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
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    
    // Make all objects selectable
    canvas.forEachObject((obj) => {
      obj.selectable = true
      obj.evented = true
    })
    
    canvas.renderAll()
  },
  
  onDeactivate: (canvas: Canvas) => {
    // Clear any active selection
    canvas.discardActiveObject()
    canvas.renderAll()
  }
} 