/**
 * Model Registry
 * Central registry of all AI models and their quality tiers
 */

import type { ModelConfig, ModelTier } from '@/lib/plugins/types'

/**
 * Image Generation Models
 */
export const imageGenerationModels: ModelConfig = {
  defaultTier: 'balanced',
  tiers: {
    best: {
      id: 'best',
      name: 'FLUX 1.1 Pro',
      modelId: 'black-forest-labs/flux-1.1-pro',
      cost: 0.05,
      speed: 'slow',
      quality: 'exceptional',
      description: 'Photorealistic, exceptional detail'
    },
    balanced: {
      id: 'balanced',
      name: 'FLUX Schnell',
      modelId: 'black-forest-labs/flux-schnell',
      cost: 0.003,
      speed: 'fast',
      quality: 'very-good',
      description: 'Very good quality, fast iteration'
    },
    fast: {
      id: 'fast',
      name: 'SDXL Lightning',
      modelId: 'bytedance/sdxl-lightning-4step',
      cost: 0.0003,
      speed: 'very-fast',
      quality: 'good',
      description: 'Good for drafts and quick iterations'
    }
  }
}

/**
 * Inpainting Models
 */
export const inpaintingModels: ModelConfig = {
  defaultTier: 'balanced',
  tiers: {
    best: {
      id: 'best',
      name: 'FLUX Fill Pro',
      modelId: 'black-forest-labs/flux-fill-pro',
      cost: 0.05,
      speed: 'slow',
      quality: 'exceptional',
      description: 'Seamless, context-aware inpainting'
    },
    balanced: {
      id: 'balanced',
      name: 'SDXL Inpainting',
      modelId: 'stability-ai/stable-diffusion-xl-inpainting',
      cost: 0.002,
      speed: 'medium',
      quality: 'very-good',
      description: 'Very good for most use cases'
    }
  }
}

/**
 * Background Removal Models
 */
export const backgroundRemovalModels: ModelConfig = {
  defaultTier: 'balanced',
  tiers: {
    best: {
      id: 'best',
      name: 'SAM 2 + RemBG',
      modelId: 'meta/sam-2-large',
      cost: 0.003,
      speed: 'medium',
      quality: 'exceptional',
      description: 'Perfect edges, handles hair and complex objects'
    },
    fast: {
      id: 'fast',
      name: 'RemBG',
      modelId: 'cjwbw/rembg',
      cost: 0.0005,
      speed: 'fast',
      quality: 'good',
      description: 'Good for clean backgrounds'
    }
  }
}

/**
 * Face Enhancement Models
 */
export const faceEnhancementModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'GFPGAN',
      modelId: 'tencentarc/gfpgan',
      cost: 0.0006,
      speed: 'fast',
      quality: 'exceptional',
      description: 'Excellent face restoration and enhancement'
    }
  }
}

/**
 * Upscaling Models
 */
export const upscalingModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'Real-ESRGAN',
      modelId: 'nightmareai/real-esrgan',
      cost: 0.002,
      speed: 'medium',
      quality: 'exceptional',
      description: '4x upscaling with detail generation'
    },
    fast: {
      id: 'fast',
      name: 'GFPGAN 2x',
      modelId: 'tencentarc/gfpgan',
      cost: 0.0006,
      speed: 'fast',
      quality: 'very-good',
      description: '2x upscaling with face enhancement'
    }
  }
}

/**
 * Object Removal Models
 */
export const objectRemovalModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'LaMa',
      modelId: 'chenxwh/lama',
      cost: 0.0005,
      speed: 'fast',
      quality: 'very-good',
      description: 'Excellent for most object removal tasks'
    },
    alternative: {
      id: 'alternative',
      name: 'SDXL Inpainting',
      modelId: 'stability-ai/stable-diffusion-xl-inpainting',
      cost: 0.002,
      speed: 'medium',
      quality: 'very-good',
      description: 'Better for complex fills with AI generation'
    }
  }
}

/**
 * Semantic Selection Models
 */
export const semanticSelectionModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'GroundingDINO + SAM',
      modelId: 'roboflow/grounding-dino',
      cost: 0.003,
      speed: 'medium',
      quality: 'exceptional',
      description: 'Understands natural language queries'
    }
  }
}

/**
 * Style Transfer Models
 */
export const styleTransferModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'SDXL Image-to-Image',
      modelId: 'stability-ai/stable-diffusion-xl-img2img',
      cost: 0.002,
      speed: 'medium',
      quality: 'very-good',
      description: 'Flexible style control with prompts'
    },
    artistic: {
      id: 'artistic',
      name: 'Material Diffusion',
      modelId: 'tommoore515/material_stable_diffusion',
      cost: 0.001,
      speed: 'fast',
      quality: 'good',
      description: 'Specific artistic styles'
    }
  }
}

/**
 * Variation Generation Models
 */
export const variationModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'SDXL Image-to-Image',
      modelId: 'stability-ai/stable-diffusion-xl-img2img',
      cost: 0.002,
      speed: 'medium',
      quality: 'very-good',
      description: 'Maintains structure while creating variations'
    }
  }
}

/**
 * Outpainting Models
 */
export const outpaintingModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'SDXL Inpainting',
      modelId: 'stability-ai/stable-diffusion-xl-inpainting',
      cost: 0.002,
      speed: 'medium',
      quality: 'very-good',
      description: 'Seamless canvas expansion'
    }
  }
}

/**
 * Relighting Models
 */
export const relightingModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'IC-Light',
      modelId: 'tencentarc/ic-light',
      cost: 0.002,
      speed: 'medium',
      quality: 'exceptional',
      description: 'Realistic lighting changes'
    }
  }
}

/**
 * Prompt Enhancement Models
 */
export const promptEnhancementModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'Llama 3.2 Vision',
      modelId: 'meta-llama/llama-3.2-11b-vision-instruct',
      cost: 0.0001,
      speed: 'fast',
      quality: 'very-good',
      description: 'Understands and improves prompts'
    }
  }
}

/**
 * Smart Selection Models
 */
export const smartSelectionModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'SAM 2',
      modelId: 'meta/sam-2-large',
      cost: 0.002,
      speed: 'medium',
      quality: 'exceptional',
      description: 'Point/box to selection'
    }
  }
}

/**
 * Depth Estimation Models
 */
export const depthEstimationModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'Depth2Img',
      modelId: 'stability-ai/stable-diffusion-depth2img',
      cost: 0.001,
      speed: 'fast',
      quality: 'very-good',
      description: 'Accurate depth map generation'
    }
  }
}

/**
 * Instruction-Based Editing Models
 */
export const instructionEditingModels: ModelConfig = {
  defaultTier: 'best',
  tiers: {
    best: {
      id: 'best',
      name: 'InstructPix2Pix',
      modelId: 'timothybrooks/instruct-pix2pix',
      cost: 0.0006,
      speed: 'fast',
      quality: 'very-good',
      description: 'Follows text instructions for edits'
    }
  }
}

/**
 * Model Registry
 */
export class ModelRegistry {
  private static models: Map<string, ModelConfig> = new Map([
    ['image-generation', imageGenerationModels],
    ['inpainting', inpaintingModels],
    ['background-removal', backgroundRemovalModels],
    ['face-enhancement', faceEnhancementModels],
    ['upscaling', upscalingModels],
    ['object-removal', objectRemovalModels],
    ['semantic-selection', semanticSelectionModels],
    ['style-transfer', styleTransferModels],
    ['variation', variationModels],
    ['outpainting', outpaintingModels],
    ['relighting', relightingModels],
    ['prompt-enhancement', promptEnhancementModels],
    ['smart-selection', smartSelectionModels],
    ['depth-estimation', depthEstimationModels],
    ['instruction-editing', instructionEditingModels]
  ])
  
  /**
   * Get model configuration for a tool
   */
  static getModelConfig(toolId: string): ModelConfig | undefined {
    return this.models.get(toolId)
  }
  
  /**
   * Get specific model tier
   */
  static getModelTier(toolId: string, tierId: string): ModelTier | undefined {
    const config = this.getModelConfig(toolId)
    return config?.tiers[tierId]
  }
  
  /**
   * Register a custom model configuration
   */
  static registerModel(toolId: string, config: ModelConfig): void {
    this.models.set(toolId, config)
  }
  
  /**
   * Get all registered models
   */
  static getAllModels(): Map<string, ModelConfig> {
    return new Map(this.models)
  }
  
  /**
   * Estimate cost for a model
   */
  static estimateCost(
    toolId: string,
    tierId: string,
    params?: { num_outputs?: number }
  ): number {
    const tier = this.getModelTier(toolId, tierId)
    if (!tier) return 0
    
    let cost = tier.cost
    
    // Adjust for multiple outputs
    if (params?.num_outputs) {
      cost *= params.num_outputs
    }
    
    return cost
  }
} 