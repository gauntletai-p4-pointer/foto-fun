import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CommandManager } from '@/lib/editor/commands/CommandManager';
import type { EventToolStore } from '@/lib/store/tools/EventToolStore';
import type { ResourceManager } from '@/lib/core/ResourceManager';
import type { ServiceCommandFactory } from '@/lib/editor/commands/base/CommandFactory';

/**
 * Dependencies injected into AI adapters
 * Follows senior-level dependency injection patterns
 * Core dependencies are available, others are placeholders during migration
 */
export interface AdapterDependencies {
  // Core services - Available and registered
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  commandFactory: ServiceCommandFactory;
  resourceManager: ResourceManager;
  
  // Basic services - Available and registered
  parameterConverter: unknown; // ParameterConverter type not imported to avoid circular deps
  modelPreferences: unknown; // ModelPreferencesManager type not imported to avoid circular deps
  
  // Services being migrated - Temporarily nullable during foundation cleanup
  toolStore: EventToolStore | null;
  responseFormatter: unknown | null;
  errorHandler: unknown | null;
  performanceMonitor: unknown | null;
  replicateClient: unknown | null;
}

/**
 * Parameter conversion service
 */
export interface ParameterConverter {
  convert<T>(params: unknown, schema: unknown): T;
  validateConstraints(params: unknown, constraints: Record<string, unknown>): boolean;
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
  handleError(error: Error, context: Record<string, unknown>): Promise<void>;
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
  getModelConfig(model: string): ModelConfig;
}

export interface ModelConfig {
  name: string;
  provider: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

/**
 * Replicate client interface
 */
export interface ReplicateClient {
  generate(params: ReplicateGenerateParams): Promise<ReplicateResponse>;
  getModel(modelId: string): Promise<ReplicateModel>;
  runPrediction(prediction: ReplicatePrediction): Promise<ReplicateResponse>;
}

export interface ReplicateGenerateParams {
  model: string;
  input: Record<string, unknown>;
  webhook?: string;
}

export interface ReplicateResponse {
  id: string;
  status: string;
  output?: unknown;
  error?: string;
}

export interface ReplicateModel {
  id: string;
  owner: string;
  name: string;
  description?: string;
  visibility: string;
  latest_version?: Record<string, unknown>;
}

export interface ReplicatePrediction {
  id: string;
  version: string;
  input: Record<string, unknown>;
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