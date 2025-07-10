import { Wand2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ImageTransformationTool } from '@/lib/ai/tools/ImageTransformationTool'
import { createAIToolWrapper } from './AIToolWrapper'

// Create the AI-Native tool instance
const imageTransformationTool = new ImageTransformationTool()

// Create and export the Canvas Tool wrapper
export const imageTransformationCanvasTool = createAIToolWrapper(
  TOOL_IDS.AI_IMAGE_TRANSFORMATION,
  imageTransformationTool,
  Wand2,
  undefined // No keyboard shortcut
) 