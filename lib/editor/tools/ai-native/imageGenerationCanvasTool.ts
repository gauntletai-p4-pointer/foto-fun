import { ImageIcon } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ImageGenerationTool } from '@/lib/ai/tools/ImageGenerationTool'
import { createAIToolWrapper } from './AIToolWrapper'

// Create the AI-Native tool instance
const imageGenerationTool = new ImageGenerationTool()

// Create and export the Canvas Tool wrapper
export const imageGenerationCanvasTool = createAIToolWrapper(
  TOOL_IDS.AI_IMAGE_GENERATION,
  imageGenerationTool,
  ImageIcon,
  undefined // No keyboard shortcut
) 