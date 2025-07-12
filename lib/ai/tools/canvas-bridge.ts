// STUB: Canvas bridge disabled during refactor
import type { CanvasContext as AdapterCanvasContext } from '@/lib/ai/adapters/types/CanvasContext';

export type CanvasContext = AdapterCanvasContext;

export class CanvasToolBridge {
  static createContext(): CanvasContext {
    console.warn('Canvas bridge disabled during refactor');
    return {
      canvas: null as any,
      targetObjects: [],
      targetingMode: 'selected',
      dimensions: { width: 0, height: 0 },
      hasContent: false,
      objectCount: 0
    };
  }

  static getCanvasContext(): CanvasContext {
    console.warn('Canvas bridge disabled during refactor');
    return {
      canvas: null as any,
      targetObjects: [],
      targetingMode: 'selected',
      dimensions: { width: 0, height: 0 },
      hasContent: false,
      objectCount: 0
    };
  }

  static setRequestSelectionSnapshot(_snapshot: unknown): void {
    console.warn('Canvas bridge disabled during refactor - setRequestSelectionSnapshot');
  }

  static clearRequestSelectionSnapshot(): void {
    console.warn('Canvas bridge disabled during refactor - clearRequestSelectionSnapshot');
  }
}
