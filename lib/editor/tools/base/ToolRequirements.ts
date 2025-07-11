/**
 * Tool Requirements System
 * Defines what conditions must be met for a tool to be activated
 */

import type { CanvasManager } from '@/lib/editor/canvas/types'

/**
 * Requirements that a tool may have
 */
export interface ToolRequirements {
  /** Tool requires a document to exist */
  needsDocument: boolean
  
  /** Tool requires an active selection */
  needsSelection?: boolean
  
  /** Tool requires at least one layer */
  needsLayers?: boolean
  
  /** Tool can create a document if none exists (e.g., AI tools) */
  canCreateDocument?: boolean
  
  /** Tool requires specific features to be enabled */
  needsFeatures?: string[]
  
  /** Custom validation function for complex requirements */
  customValidator?: (canvas: CanvasManager) => boolean | { valid: boolean; message?: string }
}

/**
 * Default requirements - most tools need a document
 */
export const DEFAULT_TOOL_REQUIREMENTS: ToolRequirements = {
  needsDocument: true,
  needsSelection: false,
  needsLayers: true,
  canCreateDocument: false
}

/**
 * Requirements for navigation tools that work without a document
 */
export const NAVIGATION_TOOL_REQUIREMENTS: ToolRequirements = {
  needsDocument: false,
  needsSelection: false,
  needsLayers: false,
  canCreateDocument: false
}

/**
 * Check if tool requirements are met
 */
export function checkToolRequirements(
  requirements: ToolRequirements,
  canvas: CanvasManager
): { canActivate: boolean; reason?: string } {
  // Check document requirement
  if (requirements.needsDocument && !canvas.hasDocument?.()) {
    return {
      canActivate: false,
      reason: 'This tool requires a document. Create a new document or open an image to continue.'
    }
  }
  
  // Check selection requirement
  if (requirements.needsSelection && !canvas.state.selection) {
    return {
      canActivate: false,
      reason: 'This tool requires an active selection.'
    }
  }
  
  // Check layers requirement
  if (requirements.needsLayers && canvas.state.layers.length === 0) {
    return {
      canActivate: false,
      reason: 'This tool requires at least one layer.'
    }
  }
  
  // Check custom validator
  if (requirements.customValidator) {
    const result = requirements.customValidator(canvas)
    if (typeof result === 'boolean') {
      return {
        canActivate: result,
        reason: result ? undefined : 'Tool requirements not met.'
      }
    }
    return {
      canActivate: result.valid,
      reason: result.message
    }
  }
  
  return { canActivate: true }
} 