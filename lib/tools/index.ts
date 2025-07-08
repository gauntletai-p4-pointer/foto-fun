import { moveTool } from './moveTool'
import { marqueeRectTool } from './marqueeRectTool'
import { marqueeEllipseTool } from './marqueeEllipseTool'
import { lassoTool } from './lassoTool'
import { magicWandTool } from './magicWandTool'
import { cropTool } from './cropTool'
import { handTool } from './handTool'
import { zoomTool } from './zoomTool'
import { brushTool } from './brushTool'
import { eraserTool } from './eraserTool'
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