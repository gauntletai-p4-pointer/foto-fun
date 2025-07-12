import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CommandManager } from '@/lib/editor/commands/CommandManager';
import type { EventToolStore } from '@/lib/store/tools/EventToolStore';
import type { ResourceManager } from '@/lib/core/ResourceManager';
import type { ServiceCommandFactory } from '@/lib/editor/commands/base/CommandFactory';

/**
 * Dependencies injected into AI adapters
 * Follows senior-level dependency injection patterns
 * All core dependencies are mandatory to ensure consistent behavior
 */
export interface AdapterDependencies {
  // Core services - ALL MANDATORY
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  commandFactory: ServiceCommandFactory;
  toolStore: EventToolStore;
  resourceManager: ResourceManager;
  
  // Adapter-specific services - MANDATORY
  parameterConverter: ParameterConverter;
  responseFormatter: ResponseFormatter;
  errorHandler: ErrorHandler;
  performanceMonitor: PerformanceMonitor;
  
  // AI-specific services - MANDATORY
  modelPreferences: ModelPreferencesManager;
  replicateClient: ReplicateClient;
}

/**
 * Parameter conversion service
 */
export interface ParameterConverter {
  convert<T>(params: unknown, schema: any): T;
  validateConstraints(params: unknown, constraints: any): boolean;
}

/**
 * Response formatting service
 */
export interface ResponseFormatter {
  formatSuccess<T>(data: T): FormattedResponse<T>;
  formatError(error: Error): FormattedResponse<never>;
}

/**
 * Error handling service
 */
export interface ErrorHandler {
  handleError(error: Error, context: any): Promise<void>;
  shouldRetry(error: Error): boolean;
  getErrorStrategy(error: Error): ErrorStrategy;
}

/**
 * Performance monitoring service
 */
export interface PerformanceMonitor {
  startTracking(operation: string): void;
  endTracking(operation: string): void;
  recordMetric(name: string, value: number): void;
}

/**
 * Model preferences manager
 */
export interface ModelPreferencesManager {
  getToolModelTier(toolId: string): string;
  setToolModelTier(toolId: string, tier: string): void;
  getModelConfig(model: string): any;
}

/**
 * Replicate client interface
 */
export interface ReplicateClient {
  generate(params: any): Promise<any>;
  getModel(modelId: string): Promise<any>;
  runPrediction(prediction: any): Promise<any>;
}

/**
 * Formatted response structure
 */
export interface FormattedResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Error handling strategy
 */
export type ErrorStrategy = 'retry' | 'fallback' | 'fail' | 'ignore'; 