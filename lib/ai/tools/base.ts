// STUB: AI tools base disabled during refactor
export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIQuotaExceededError';
  }
}

export class AIServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceUnavailableError';
  }
}

export abstract class BaseAITool {
  abstract id: string;
  
  async execute(): Promise<any> {
    console.warn('AI tools disabled during refactor');
    return null;
  }
} 