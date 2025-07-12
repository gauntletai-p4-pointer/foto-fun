import { BaseTool, ToolDependencies } from '../base/BaseTool';
import type { SelectionMask } from '../../selection/SelectionMask';
import type { Point, Rect, SelectionMode } from '@/types';

export abstract class SelectionTool extends BaseTool {
  protected selectionMask: SelectionMask | null = null;
  protected selectionMode: SelectionMode = 'replace';
  protected isSelecting: boolean = false;
  protected selectionStart: Point | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  // Abstract methods for selection creation
  protected abstract updateSelectionPreview(current: Point): void;
  
  protected applySelection(): void {
    if (!this.selectionMask) return;

    // NOTE TO EXECUTOR: A 'createApplySelectionCommand' method will need to be added to the CommandFactory.
    const command = this.dependencies.commandFactory.createApplySelectionCommand(
      this.selectionMask,
      this.selectionMode
    );
    
    this.dependencies.commandManager.executeCommand(command);
  }
} 