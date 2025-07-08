import { moveTool } from './moveTool'
import { marqueeRectTool } from './marqueeRectTool'
import { handTool } from './handTool'
import { TOOL_IDS } from '@/constants'
import type { Tool } from '@/types'
import { Circle, Crop, ZoomIn } from 'lucide-react'

// Placeholder tools (not implemented yet)
const marqueeEllipseTool: Tool = {
  id: TOOL_IDS.MARQUEE_ELLIPSE,
  name: 'Elliptical Marquee Tool',
  icon: Circle,
  cursor: 'crosshair',
  shortcut: 'M',
  isImplemented: false,
}

const cropTool: Tool = {
  id: TOOL_IDS.CROP,
  name: 'Crop Tool',
  icon: Crop,
  cursor: 'crosshair',
  shortcut: 'C',
  isImplemented: false,
}

const zoomTool: Tool = {
  id: TOOL_IDS.ZOOM,
  name: 'Zoom Tool',
  icon: ZoomIn,
  cursor: 'zoom-in',
  shortcut: 'Z',
  isImplemented: false,
}

// Export all tools
export const tools: Tool[] = [
  moveTool,
  marqueeRectTool,
  marqueeEllipseTool,
  cropTool,
  handTool,
  zoomTool,
]

// Export individual tools
export {
  moveTool,
  marqueeRectTool,
  marqueeEllipseTool,
  cropTool,
  handTool,
  zoomTool,
} 