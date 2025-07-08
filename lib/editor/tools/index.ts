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
import { horizontalTypeTool, verticalTypeTool, typeMaskTool } from './text'
import { brightnessTool } from './adjustments/brightnessTool'
import { contrastTool } from './adjustments/contrastTool'
import { saturationTool } from './adjustments/saturationTool'
import { hueTool } from './adjustments/hueTool'
import { exposureTool } from './adjustments/exposureTool'
import { colorTemperatureTool } from './adjustments/colorTemperatureTool'
import type { Tool } from '@/types'
import { rotateTool } from './transform/rotateTool'
import { flipTool } from './transform/flipTool'
import { resizeTool } from './transform/resizeTool'
import { blurTool } from './filters/blurTool'
import { sharpenTool } from './filters/sharpenTool'
import { grayscaleTool } from './filters/grayscaleTool'
import { sepiaTool } from './filters/sepiaTool'
import { invertTool } from './filters/invertTool'

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
  horizontalTypeTool,
  verticalTypeTool,
  typeMaskTool,
  brightnessTool,
  contrastTool,
  saturationTool,
  hueTool,
  exposureTool,
  colorTemperatureTool,
  rotateTool,
  flipTool,
  resizeTool,
  blurTool,
  sharpenTool,
  grayscaleTool,
  sepiaTool,
  invertTool,
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
  horizontalTypeTool,
  verticalTypeTool,
  typeMaskTool,
  brightnessTool,
  contrastTool,
  saturationTool,
  hueTool,
  exposureTool,
  colorTemperatureTool,
  rotateTool,
  flipTool,
  resizeTool,
  blurTool,
  sharpenTool,
  grayscaleTool,
  sepiaTool,
  invertTool,
} 