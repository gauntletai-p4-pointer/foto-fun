/*
 * DEPRECATED: This file has been moved to deprecated folder during tool system refactor
 * Date: Sat Jul 12 11:22:22 CDT 2025
 * Reason: Complete tool system rebuild with new architecture
 * 
 * This code is preserved for reference but should not be used.
 * See docs/tool-start-fresh.md for new architecture.
 */

// STUB: Canvas bridge disabled during refactor
export interface CanvasContext {
  canvas: any;
  targetObjects: any[];
}

export class CanvasToolBridge {
  static createContext(): CanvasContext {
    console.warn('Canvas bridge disabled during refactor');
    return {
      canvas: null,
      targetObjects: []
    };
  }
}
