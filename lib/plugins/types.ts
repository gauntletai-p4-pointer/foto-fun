/**
 * Plugin System Types
 * Defines interfaces for extending the editor with custom tools
 */

import type { LucideIcon } from 'lucide-react'
import type { z } from 'zod'

/**
 * Base plugin interface
 */
export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author?: string
  homepage?: string
  category: PluginCategory
  enabled: boolean
}

/**
 * Plugin categories
 */
export type PluginCategory = 
  | 'generation'    // Image generation tools
  | 'enhancement'   // Image enhancement (upscale, denoise, etc)
  | 'selection'     // Smart selection tools
  | 'style'         // Style transfer, filters
  | 'filter'        // WebGL filters
  | 'transform'     // Transform tools
  | 'custom'        // User-defined category

/**
 * Model tier for quality/cost tradeoffs
 */
export interface ModelTier {
  id: string
  name: string
  modelId: string           // Replicate model ID
  version?: string          // Specific model version
  cost: number              // Estimated cost per operation
  speed: 'very-fast' | 'fast' | 'medium' | 'slow'
  quality: 'draft' | 'good' | 'very-good' | 'exceptional'
  description?: string
}

/**
 * Model configuration for tools with multiple model options
 */
export interface ModelConfig {
  defaultTier: string
  tiers: Record<string, ModelTier>
}

/**
 * Replicate-based tool plugin
 */
export interface ReplicateToolPlugin extends Plugin {
  category: PluginCategory
  
  // Model configuration
  models: ModelConfig
  
  // UI configuration
  ui: {
    icon: LucideIcon | string    // Lucide icon or emoji
    shortcut?: string            // Keyboard shortcut
    toolbar?: 'main' | 'ai' | 'plugins'
    color?: string               // Accent color
  }
  
  // Parameter configuration
  parameters: ParameterConfig
  
  // Optional processing hooks
  hooks?: {
    preProcess?: (inputs: any, context: PluginContext) => Promise<any>
    postProcess?: (output: any, context: PluginContext) => Promise<any>
    validate?: (inputs: any) => Promise<boolean>
  }
  
  // Tool behavior
  behavior?: {
    autoApply?: boolean          // Apply immediately or preview first
    createNewObject?: boolean    // Create new object or modify existing
    preserveSelection?: boolean  // Keep selection after operation
  }
}

/**
 * WebGL filter plugin
 */
export interface WebGLFilterPlugin extends Plugin {
  category: 'filter'
  
  // Shader configuration
  shader: {
    vertex?: string              // Custom vertex shader
    fragment: string             // Fragment shader (required)
    uniforms?: Record<string, UniformConfig>
  }
  
  // UI configuration
  ui: {
    icon: LucideIcon | string
    presets?: FilterPreset[]
  }
  
  // Parameter configuration
  parameters: ParameterConfig
}

/**
 * Parameter configuration
 */
export interface ParameterConfig {
  schema: z.ZodObject<any>      // Zod schema for validation
  ui: Record<string, ParameterUI>  // UI configuration per parameter
}

/**
 * Parameter UI configuration
 */
export interface ParameterUI {
  type: 'text' | 'number' | 'slider' | 'select' | 'color' | 'file' | 'boolean'
  label: string
  description?: string
  placeholder?: string
  
  // Type-specific options
  min?: number                   // For number/slider
  max?: number                   // For number/slider
  step?: number                  // For number/slider
  options?: Array<{              // For select
    value: string
    label: string
  }>
  accept?: string                // For file input
  
  // Conditional visibility
  showWhen?: (values: any) => boolean
}

/**
 * Shader uniform configuration
 */
export interface UniformConfig {
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D'
  default: any
  ui?: ParameterUI
}

/**
 * Filter preset
 */
export interface FilterPreset {
  name: string
  values: Record<string, any>
  thumbnail?: string
}

/**
 * Plugin execution context
 */
export interface PluginContext {
  // Canvas access
  canvas: {
    getSelectedObjects: () => any[]
    addObject: (object: any) => Promise<string>
    updateObject: (id: string, updates: any) => Promise<void>
    getImageData: (objectId: string) => Promise<ImageData>
  }
  
  // UI helpers
  ui: {
    showProgress: (message: string, progress?: number) => void
    showError: (message: string) => void
    showSuccess: (message: string) => void
  }
  
  // User preferences
  preferences: {
    modelTier: string
    quality: 'best' | 'balanced' | 'fast'
  }
  
  // Environment info
  environment: {
    isCloud: boolean
    userId?: string
    apiKeys?: {
      replicate?: string
      openai?: string
    }
  }
}

/**
 * Plugin manifest for distribution
 */
export interface PluginManifest {
  id: string
  name: string
  description: string
  version: string
  author: string
  repository?: string
  homepage?: string
  license?: string
  
  // Plugin files
  main: string                   // Entry point
  icon?: string                  // Icon file
  readme?: string                // Documentation
  
  // Requirements
  requirements?: {
    editorVersion?: string       // Minimum editor version
    dependencies?: string[]      // Other plugin dependencies
  }
  
  // Permissions needed
  permissions?: Array<
    | 'canvas:read'
    | 'canvas:write'
    | 'file:read'
    | 'file:write'
    | 'network'
    | 'clipboard'
  >
} 