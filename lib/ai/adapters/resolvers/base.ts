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