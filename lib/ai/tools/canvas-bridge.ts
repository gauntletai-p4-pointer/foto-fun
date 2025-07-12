// STUB: Canvas bridge disabled during refactor
export interface CanvasContext {
  canvas: any;
  targetObjects: any[];
  targetingMode?: 'selected' | 'all' | 'visible';
}

export class CanvasToolBridge {
  static createContext(): CanvasContext {
    console.warn('Canvas bridge disabled during refactor');
    return {
      canvas: null,
      targetObjects: [],
      targetingMode: 'selected'
    };
  }

  static getCanvasContext(): CanvasContext {
    console.warn('Canvas bridge disabled during refactor');
    return {
      canvas: null,
      targetObjects: [],
      targetingMode: 'selected'
    };
  }

  static setRequestSelectionSnapshot(snapshot: any): void {
    console.warn('Canvas bridge disabled during refactor - setRequestSelectionSnapshot');
  }

  static clearRequestSelectionSnapshot(): void {
    console.warn('Canvas bridge disabled during refactor - clearRequestSelectionSnapshot');
  }
}
