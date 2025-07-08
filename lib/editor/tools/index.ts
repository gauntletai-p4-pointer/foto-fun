import { moveTool } from './transform/moveTool'
import { marqueeRectTool } from './selection/marqueeRectTool'
import { marqueeEllipseTool } from './selection/marqueeEllipseTool'
import { lassoTool } from './selection/lassoTool'
import { magicWandTool } from './selection/magicWandTool'
import { quickSelectionTool } from './selection/quickSelectionTool'
import { cropTool } from './transform/cropTool'
import { eyedropperTool } from './eyedropperTool'
import { handTool } from './transform/handTool'
import { zoomTool } from './transform/zoomTool'
import { brushTool } from './drawing/brushTool'
import { eraserTool } from './drawing/eraserTool'
import { horizontalTypeTool, verticalTypeTool, typeMaskTool } from './text'
import { brightnessTool } from './adjustments/brightnessTool'
import { contrastTool } from './adjustments/contrastTool'
import { saturationTool } from './adjustments/saturationTool'
import { hueTool } from './adjustments/hueTool'
import { exposureTool } from './adjustments/exposureTool'
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
  quickSelectionTool,
  cropTool,
  eyedropperTool,
  handTool,
  zoomTool,
  brushTool,
  eraserTool,
  horizontalTypeTool,
  verticalTypeTool,
  typeMaskTool,
  brightnessTool,
  contrastTool,
  saturationTool,
  hueTool,
  exposureTool,
  textTool,
]

// Export individual tools
export {
  moveTool,
  marqueeRectTool,
  marqueeEllipseTool,
  lassoTool,
  magicWandTool,
  quickSelectionTool,
  cropTool,
  eyedropperTool,
  handTool,
  zoomTool,
  brushTool,
  eraserTool,
  horizontalTypeTool,
  verticalTypeTool,
  typeMaskTool,
  brightnessTool,
  contrastTool,
  saturationTool,
  hueTool,
  exposureTool,
  textTool,
} 