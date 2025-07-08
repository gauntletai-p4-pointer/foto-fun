import { moveTool } from './transform/moveTool'
import { marqueeRectTool } from './selection/marqueeRectTool'
import { marqueeEllipseTool } from './selection/marqueeEllipseTool'
import { lassoTool } from './selection/lassoTool'
import { magicWandTool } from './selection/magicWandTool'
import { cropTool } from './transform/cropTool'
import { handTool } from './transform/handTool'
import { zoomTool } from './transform/zoomTool'
import { brushTool } from './drawing/brushTool'
import { eraserTool } from './drawing/eraserTool'
import { TOOL_IDS } from '@/constants'
import type { Tool } from '@/types'
import { Type } from 'lucide-react'

// Placeholder tools (not implemented yet)
const textTool: Tool = {
  id: TOOL_IDS.TEXT,
  name: 'Type Tool',
  icon: Type,
  cursor: 'text',
  shortcut: 'T',
  isImplemented: false,
}

// Export all tools
export const tools: Tool[] = [
  moveTool,
  marqueeRectTool,
  marqueeEllipseTool,
  lassoTool,
  magicWandTool,
  cropTool,
  handTool,
  zoomTool,
  brushTool,
  eraserTool,
  textTool,
]

// Export individual tools
export {
  moveTool,
  marqueeRectTool,
  marqueeEllipseTool,
  lassoTool,
  magicWandTool,
  cropTool,
  handTool,
  zoomTool,
  brushTool,
  eraserTool,
  textTool,
} 