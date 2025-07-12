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

  static getCanvasContext(): CanvasContext {
    console.warn('Canvas bridge disabled during refactor');
    return {
      canvas: null,
      targetObjects: []
    };
  }

  static setRequestSelectionSnapshot(snapshot: any): void {
    console.warn('Canvas bridge disabled during refactor - setRequestSelectionSnapshot');
  }

  static clearRequestSelectionSnapshot(): void {
    console.warn('Canvas bridge disabled during refactor - clearRequestSelectionSnapshot');
  }
}
