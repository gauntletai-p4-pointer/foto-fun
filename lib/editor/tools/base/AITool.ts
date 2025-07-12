import { BaseTool, ToolDependencies } from './BaseTool';

interface AIOperationOptions {}

export abstract class AITool extends BaseTool {
  protected isProcessing: boolean = false;
  protected currentRequest: AbortController | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  protected abstract checkAIAvailability(): Promise<boolean>;
  protected abstract initializeAIInterface(): Promise<void>;
  protected abstract cleanupAIInterface(): Promise<void>;
  
  protected async executeAIOperation<T>(
    operation: () => Promise<T>,
    options: AIOperationOptions = {}
  ): Promise<T> {
    // Placeholder implementation
    this.isProcessing = true;
    try {
        return await operation();
    } finally {
        this.isProcessing = false;
    }
  }
} 