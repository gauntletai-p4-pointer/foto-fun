/**
 * Migration helpers for Canvas Architecture Redesign
 * Temporary helpers to ease the transition from width/height to documentBounds
 */

import type { CanvasState } from './types'
import { getDocumentDimensions } from './helpers'

/**
 * Legacy width getter - use getDocumentDimensions instead
 * @deprecated Will be removed after migration
 */
export function getLegacyWidth(state: CanvasState): number {
  console.warn('getLegacyWidth is deprecated. Use getDocumentDimensions from helpers.ts')
  return getDocumentDimensions(state).width
}

/**
 * Legacy height getter - use getDocumentDimensions instead
 * @deprecated Will be removed after migration
 */
export function getLegacyHeight(state: CanvasState): number {
  console.warn('getLegacyHeight is deprecated. Use getDocumentDimensions from helpers.ts')
  return getDocumentDimensions(state).height
}

/**
 * Temporary type to ease migration
 * Adds width/height properties that delegate to documentBounds
 */
export type LegacyCanvasState = CanvasState & {
  width: number
  height: number
}

/**
 * Convert CanvasState to LegacyCanvasState for backwards compatibility
 * @deprecated Will be removed after migration
 */
export function toLegacyCanvasState(state: CanvasState): LegacyCanvasState {
  const { width, height } = getDocumentDimensions(state)
  return {
    ...state,
    width,
    height
  }
} 