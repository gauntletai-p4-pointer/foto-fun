/*
 * DEPRECATED: This file has been moved to deprecated folder during tool system refactor
 * Date: Sat Jul 12 11:22:22 CDT 2025
 * Reason: Complete tool system rebuild with new architecture
 * 
 * This code is preserved for reference but should not be used.
 * See docs/tool-start-fresh.md for new architecture.
 */

// STUB: Base tool disabled during refactor
export enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING'
}

export interface ToolDependencies {
  eventBus: any;
  canvasManager: any;
  commandManager: any;
}

export interface ToolOptions {
  [key: string]: any;
}

export abstract class BaseTool {
  abstract id: string;
  
  constructor(protected dependencies: ToolDependencies) {}
  
  async onActivate(): Promise<void> {
    console.warn('Tools disabled during refactor');
  }
  
  async onDeactivate(): Promise<void> {
    console.warn('Tools disabled during refactor');
  }
  
  getState(): ToolState {
    return ToolState.INACTIVE;
  }
}

export interface ToolWithState {
  getState(): ToolState;
}
