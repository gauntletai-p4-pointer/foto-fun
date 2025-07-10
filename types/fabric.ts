import type { FabricObject } from 'fabric'

/**
 * System object types - these are overlays and tools, not user content
 */
export enum SystemObjectType {
  SELECTION_OVERLAY = 'selection_overlay',
  TOOL_FEEDBACK = 'tool_feedback',
  CROP_OVERLAY = 'crop_overlay',
  GUIDE = 'guide',
  GRID = 'grid',
  RULER = 'ruler',
  TEMPORARY = 'temporary'
}

/**
 * Custom properties we add to Fabric objects
 * These extend the base Fabric.Object with our application-specific data
 */
export interface CustomFabricObjectProps {
  // Unique identifier for the object
  id?: string
  
  // Layer association
  layerId?: string
  
  // System object metadata
  isSystemObject?: boolean
  systemObjectType?: SystemObjectType
  
  // AI-related metadata
  aiGenerated?: boolean
  aiPrompt?: string
  aiModel?: string
  aiTimestamp?: number
  
  // Selection metadata (for object-aware selections)
  hasObjectSelection?: boolean
  objectSelectionId?: string
}

/**
 * Type helper for Fabric objects with our custom properties
 */
export type CustomFabricObject = FabricObject & CustomFabricObjectProps 