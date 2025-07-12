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
