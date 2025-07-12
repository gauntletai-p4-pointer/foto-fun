/*
 * DEPRECATED: This file has been moved to deprecated folder during tool system refactor
 * Date: Sat Jul 12 11:22:22 CDT 2025
 * Reason: Complete tool system rebuild with new architecture
 * 
 * This code is preserved for reference but should not be used.
 * See docs/tool-start-fresh.md for new architecture.
 */

// STUB: Tool factory disabled during refactor
export class ToolFactory {
  constructor(private container: any) {}
  
  async createTool(toolId: string): Promise<any> {
    console.warn('Tool creation disabled during refactor');
    return null;
  }
}
