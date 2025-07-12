import { BaseTool, ToolDependencies } from './BaseTool';
import type { CanvasObject } from '@/lib/editor/objects/types';
// import type { WebGLFilterEngine } from '@/lib/editor/filters/WebGLFilterEngine';

export abstract class FilterTool extends BaseTool {
  // protected filterEngine: WebGLFilterEngine;
  protected targetObjects: CanvasObject[] = [];
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
    // this.filterEngine = dependencies.filterEngine;
  }
  
  protected abstract initializeFilter(): Promise<void>;
  // protected abstract createFilterShader(): WebGLShader;
  protected abstract showFilterOptions(): void;
} 