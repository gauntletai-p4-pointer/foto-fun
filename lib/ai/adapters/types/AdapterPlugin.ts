import type { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';

/**
 * Plugin interface for extending adapter functionality
 * Follows plugin architecture patterns for extensibility
 */
export interface AdapterPlugin {
  // Plugin identification
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // Plugin lifecycle
  apply(adapter: UnifiedToolAdapter): void;
  unapply?(adapter: UnifiedToolAdapter): void;
  
  // Compatibility checking
  isCompatible(adapter: UnifiedToolAdapter): boolean;
  
  // Plugin configuration
  config?: PluginConfig;
  dependencies?: string[];
  
  // Plugin metadata
  author?: string;
  license?: string;
  homepage?: string;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  priority: number;
}

/**
 * Common plugin implementations
 */
export interface RetryPlugin extends AdapterPlugin {
  id: 'retry';
  retryConfig: RetryConfig;
}

export interface CachingPlugin extends AdapterPlugin {
  id: 'caching';
  cacheConfig: CacheConfig;
}

export interface LoggingPlugin extends AdapterPlugin {
  id: 'logging';
  logConfig: LogConfig;
}

export interface MetricsPlugin extends AdapterPlugin {
  id: 'metrics';
  metricsConfig: MetricsConfig;
}

/**
 * Supporting interfaces
 */
export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  storage: 'memory' | 'localStorage' | 'indexedDB';
  keyPrefix?: string;
}

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  destination: 'console' | 'file' | 'remote';
  format: 'json' | 'text';
}

export interface MetricsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
} 