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
import type { Tool } from '@/types'
import type { Tool as CanvasTool } from '@/lib/editor/canvas/types'
import { rotateTool } from './transform/rotateTool'
import { flipTool } from './transform/flipTool'
import { resizeTool } from './transform/resizeTool'
import { blurTool } from './filters/blurTool'
import { sharpenTool } from './filters/sharpenTool'
import { grayscaleTool } from './filters/grayscaleTool'
import { invertTool } from './filters/invertTool'
import { vintageEffectsTool } from './filters/vintageEffectsTool'
import { imageGenerationTool } from './ai-native/imageGenerationCanvasTool'
import { EraserTool } from './drawing/eraserTool'
import { GradientTool } from './drawing/gradientTool'

// AI Tools - Temporarily commented out until tool migration is complete
// import { BackgroundRemovalTool } from '@/lib/ai/tools/BackgroundRemovalTool'
// import { FaceEnhancementTool } from '@/lib/ai/tools/FaceEnhancementTool'
// import { InpaintingTool } from '@/lib/ai/tools/InpaintingTool'
// import { OutpaintingTool } from '@/lib/ai/tools/OutpaintingTool'
// import { SemanticSelectionTool } from '@/lib/ai/tools/SemanticSelectionTool'
// import { SmartSelectionTool } from './ai-native/smartSelectionTool'
// import { VariationGridTool } from './ai-native/variationGridTool'
// import { AIPromptBrush } from './ai-native/aiPromptBrush'
// import { StyleTransferBrush } from './ai-native/styleTransferBrush'
// import { MagicEraserTool } from './ai-native/magicEraserTool'
// import { PromptAdjustmentTool } from './ai-native/promptAdjustmentTool'

// Create instances
const eraserTool = new EraserTool()
const gradientTool = new GradientTool()

// Create AI tool instances
// TODO: These will be properly instantiated via ServiceContainer after tool migration
// const backgroundRemovalTool = new BackgroundRemovalTool()
// const faceEnhancementTool = new FaceEnhancementTool()
// const inpaintingTool = new InpaintingTool()
// const outpaintingTool = new OutpaintingTool()
// const semanticSelectionTool = new SemanticSelectionTool()
// const smartSelectionTool = new SmartSelectionTool()
// const variationGridTool = new VariationGridTool()
// const aiPromptBrush = new AIPromptBrush()
// const styleTransferBrush = new StyleTransferBrush()
// const magicEraserTool = new MagicEraserTool()
// const promptAdjustmentTool = new PromptAdjustmentTool()

// Helper function to adapt canvas tools to UI tool interface
function adaptTool(tool: CanvasTool): Tool {
  return {
    id: tool.id,
    name: tool.name,
    icon: tool.icon,
    cursor: tool.cursor,
    shortcut: tool.shortcut,
    isImplemented: true, // All exported tools are implemented
    // Bind methods to preserve 'this' context
    onActivate: tool.onActivate ? tool.onActivate.bind(tool) : (() => {}),
    onDeactivate: tool.onDeactivate ? tool.onDeactivate.bind(tool) : undefined,
    onMouseDown: tool.onMouseDown ? tool.onMouseDown.bind(tool) : undefined,
    onMouseMove: tool.onMouseMove ? tool.onMouseMove.bind(tool) : undefined,
    onMouseUp: tool.onMouseUp ? tool.onMouseUp.bind(tool) : undefined,
  }
}

// Export all tools - organized by category
export const tools: Tool[] = [
  // Selection tools
  adaptTool(marqueeRectTool),
  adaptTool(marqueeEllipseTool),
  adaptTool(lassoTool),
  adaptTool(magicWandTool),
  adaptTool(quickSelectionTool),
  
  // Transform tools
  adaptTool(moveTool),
  adaptTool(cropTool),
  adaptTool(rotateTool),
  adaptTool(flipTool),
  adaptTool(resizeTool),
  
  // Drawing tools
  adaptTool(brushTool),
  adaptTool(eraserTool),
  adaptTool(gradientTool),
  
  // Text tools
  adaptTool(horizontalTypeTool),
  adaptTool(verticalTypeTool),
  adaptTool(typeMaskTool),
  adaptTool(typeOnPathTool),
  
  // Adjustment tools
  adaptTool(brightnessTool),
  adaptTool(contrastTool),
  adaptTool(saturationTool),
  adaptTool(hueTool),
  adaptTool(exposureTool),
  
  // Filter tools
  adaptTool(blurTool),
  adaptTool(sharpenTool),
  adaptTool(grayscaleTool),
  adaptTool(invertTool),
  adaptTool(vintageEffectsTool),
  
  // Navigation tools
  adaptTool(handTool),
  adaptTool(zoomTool),
  adaptTool(eyedropperTool),
  
  // AI Generation tools
  adaptTool(imageGenerationTool),
  // TODO: Re-enable after tool migration
  // adaptTool(variationGridTool),
  // adaptTool(outpaintingTool),
  
  // AI Enhancement tools
  // TODO: Re-enable after tool migration
  // adaptTool(backgroundRemovalTool),
  // adaptTool(faceEnhancementTool),
  // adaptTool(inpaintingTool),
  // adaptTool(magicEraserTool),
  
  // AI Selection tools
  // TODO: Re-enable after tool migration
  // adaptTool(semanticSelectionTool),
  // adaptTool(smartSelectionTool),
  
  // AI Creative tools
  // TODO: Re-enable after tool migration
  // adaptTool(aiPromptBrush),
  // adaptTool(styleTransferBrush),
  // adaptTool(promptAdjustmentTool),
]

// Export individual tools
export {
  // Selection tools
  marqueeRectTool,
  marqueeEllipseTool,
  lassoTool,
  magicWandTool,
  quickSelectionTool,
  
  // Transform tools
  moveTool,
  cropTool,
  rotateTool,
  flipTool,
  resizeTool,
  
  // Drawing tools
  brushTool,
  eraserTool,
  gradientTool,
  
  // Text tools
  horizontalTypeTool,
  verticalTypeTool,
  typeMaskTool,
  typeOnPathTool,
  
  // Adjustment tools
  brightnessTool,
  contrastTool,
  saturationTool,
  hueTool,
  exposureTool,
  
  // Filter tools
  blurTool,
  sharpenTool,
  grayscaleTool,
  invertTool,
  vintageEffectsTool,
  
  // Navigation tools
  handTool,
  zoomTool,
  eyedropperTool,
  
  // AI tools
  imageGenerationTool,
  // TODO: Re-enable after tool migration
  // backgroundRemovalTool,
  // faceEnhancementTool,
  // inpaintingTool,
  // outpaintingTool,
  // semanticSelectionTool,
  // smartSelectionTool,
  // variationGridTool,
  // aiPromptBrush,
  // styleTransferBrush,
  // magicEraserTool,
  // promptAdjustmentTool,
} 