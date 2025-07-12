/*
 * DEPRECATED: This file has been moved to deprecated folder during tool system refactor
 * Date: Sat Jul 12 11:22:22 CDT 2025
 * Reason: Complete tool system rebuild with new architecture
 * 
 * This code is preserved for reference but should not be used.
 * See docs/tool-start-fresh.md for new architecture.
 */

// STUB: AI adapter base disabled during refactor
export abstract class UnifiedToolAdapter {
  abstract toolId: string;
  abstract aiName: string;
  abstract description: string;
  
  async execute() {
    console.warn('AI tools disabled during refactor');
    return null;
  }
}
