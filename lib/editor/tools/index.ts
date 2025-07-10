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
import { horizontalTypeTool, verticalTypeTool, typeMaskTool, typeOnPathTool } from './text'
import { brightnessTool } from './adjustments/brightnessTool'
import { contrastTool } from './adjustments/contrastTool'
import { saturationTool } from './adjustments/saturationTool'
import { hueTool } from './adjustments/hueTool'
import { exposureTool } from './adjustments/exposureTool'
import { colorTemperatureTool } from './adjustments/colorTemperatureTool'
import type { Tool } from '@/types'
import type { Tool as CanvasTool } from '@/lib/editor/canvas/types'
import { rotateTool } from './transform/rotateTool'
import { flipTool } from './transform/flipTool'
import { resizeTool } from './transform/resizeTool'
import { blurTool } from './filters/blurTool'
import { sharpenTool } from './filters/sharpenTool'
import { grayscaleTool } from './filters/grayscaleTool'
import { sepiaTool } from './filters/sepiaTool'
import { invertTool } from './filters/invertTool'
import { vintageEffectsTool } from './filters/vintageEffectsTool'
import { imageGenerationTool } from './ai-native/imageGenerationCanvasTool'

// Helper function to adapt canvas tools to UI tool interface
function adaptTool(tool: CanvasTool): Tool {
  return {
    id: tool.id,
    name: tool.name,
    icon: tool.icon,
    cursor: tool.cursor,
    shortcut: tool.shortcut,
    isImplemented: true, // All exported tools are implemented
    // Ensure onActivate is defined (required by UI Tool interface)
    onActivate: tool.onActivate || (() => {}),
    onDeactivate: tool.onDeactivate,
    onMouseDown: tool.onMouseDown,
    onMouseMove: tool.onMouseMove,
    onMouseUp: tool.onMouseUp,
  }
}

// Export all tools - use the adapted versions
export const tools: Tool[] = [
  adaptTool(moveTool),
  adaptTool(marqueeRectTool),
  adaptTool(marqueeEllipseTool),
  adaptTool(lassoTool),
  adaptTool(magicWandTool),
  adaptTool(quickSelectionTool),
  adaptTool(cropTool),
  adaptTool(eyedropperTool),
  adaptTool(handTool),
  adaptTool(zoomTool),
  adaptTool(brushTool),
  adaptTool(horizontalTypeTool),
  adaptTool(verticalTypeTool),
  adaptTool(typeMaskTool),
  adaptTool(typeOnPathTool),
  adaptTool(brightnessTool),
  adaptTool(contrastTool),
  adaptTool(saturationTool),
  adaptTool(hueTool),
  adaptTool(exposureTool),
  adaptTool(colorTemperatureTool),
  adaptTool(rotateTool),
  adaptTool(flipTool),
  adaptTool(resizeTool),
  adaptTool(blurTool),
  adaptTool(sharpenTool),
  adaptTool(grayscaleTool),
  adaptTool(sepiaTool),
  adaptTool(invertTool),
  adaptTool(vintageEffectsTool),
  // AI-Native tools
  adaptTool(imageGenerationTool),
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
  typeOnPathTool,
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
  vintageEffectsTool,
  imageGenerationTool,
} 