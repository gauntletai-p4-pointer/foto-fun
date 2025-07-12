import type { CanvasContext } from './CanvasContext';

/**
 * Behavior interface for adapter composition
 * Allows adding cross-cutting concerns to adapters
 */
export interface AdapterBehavior {
  // Behavior identification
  name: string;
  description?: string;
  
  // Lifecycle hooks
  preExecution?: (params: any, context: CanvasContext) => Promise<void>;
  postExecution?: (result: any, context: CanvasContext) => Promise<void>;
  onError?: (error: Error, context: CanvasContext) => Promise<void>;
  
  // Behavior configuration
  enabled?: boolean;
  priority?: number;
  
  // Conditional execution
  shouldExecute?: (params: any, context: CanvasContext) => boolean;
}

/**
 * Common behavior implementations
 */
export interface ValidationBehavior extends AdapterBehavior {
  name: 'validation';
  validationRules: ValidationRule[];
}

export interface PerformanceBehavior extends AdapterBehavior {
  name: 'performance';
  thresholds: PerformanceThresholds;
}

export interface ErrorRecoveryBehavior extends AdapterBehavior {
  name: 'error-recovery';
  recoveryStrategies: RecoveryStrategy[];
}

export interface CachingBehavior extends AdapterBehavior {
  name: 'caching';
  cacheConfig: CacheConfig;
}

/**
 * Supporting interfaces
 */
export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  message: string;
}

export interface PerformanceThresholds {
  maxDuration: number;
  maxMemory: number;
  warningThreshold: number;
}

export interface RecoveryStrategy {
  errorType: string;
  action: 'retry' | 'fallback' | 'skip';
  maxRetries?: number;
  fallbackValue?: any;
}

export interface CacheConfig {
  ttl: number; // time to live in ms
  maxSize: number;
  keyGenerator?: (params: any) => string;
} 