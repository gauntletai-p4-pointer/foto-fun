/**
 * CURRENTLY UNUSED - Kept for potential future implementation
 * 
 * We initially created parameter resolvers to convert natural language to exact parameters
 * (e.g., "crop 50%" → { x: 250, y: 200, width: 500, height: 400 }).
 * 
 * However, we decided to leverage the AI model's capabilities instead by:
 * 1. Providing canvas dimensions in the system prompt
 * 2. Including calculation examples in tool descriptions
 * 3. Letting the AI model handle parameter resolution
 * 
 * This approach aligns better with AI SDK v5's design philosophy and reduces code complexity.
 * These files are kept in case we need more sophisticated parameter preprocessing in the future.
 */

import type { CanvasContext } from '../../tools/canvas-bridge'

/**
 * Base class for parameter resolvers
 * Converts natural language input to structured tool parameters
 */
export abstract class BaseParameterResolver<TInput> {
  /**
   * Resolve natural language input to structured parameters
   * @param naturalInput The user's natural language request
   * @param context Canvas context including dimensions and state
   * @returns Structured parameters for the tool
   */
  abstract resolve(
    naturalInput: string,
    context: CanvasContext
  ): Promise<TInput>
} 