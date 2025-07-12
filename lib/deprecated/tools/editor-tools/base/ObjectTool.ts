/*
 * DEPRECATED: This file has been moved to deprecated folder during tool system refactor
 * Date: Sat Jul 12 11:22:22 CDT 2025
 * Reason: Complete tool system rebuild with new architecture
 * 
 * This code is preserved for reference but should not be used.
 * See docs/tool-start-fresh.md for new architecture.
 */

// STUB: Object tool disabled during refactor
import { BaseTool } from './BaseTool';

export class ObjectTool extends BaseTool {
  id = 'object-tool-stub';
  
  async onActivate(): Promise<void> {
    console.warn('Object tools disabled during refactor');
  }
  
  async onDeactivate(): Promise<void> {
    console.warn('Object tools disabled during refactor');
  }
}
