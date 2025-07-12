/**
 * Metadata describing adapter capabilities and requirements
 */
export interface AdapterMetadata {
  // Adapter classification
  category: 'canvas-tool' | 'ai-service' | 'filter' | 'utility' | 'unknown';
  worksOn: 'existing' | 'new' | 'both' | 'unknown';
  
  // Execution requirements
  requiresSelection: boolean;
  isReadOnly: boolean;
  supportsBatch: boolean;
  
  // Performance characteristics
  estimatedDuration: number; // milliseconds
  memoryUsage?: 'low' | 'medium' | 'high';
  cpuIntensive?: boolean;
  
  // Compatibility
  supportedFormats?: string[];
  minImageSize?: { width: number; height: number };
  maxImageSize?: { width: number; height: number };
  
  // UI hints
  icon?: string;
  color?: string;
  description?: string;
  
  // Versioning
  version?: string;
  deprecated?: boolean;
  
  // Feature flags
  experimental?: boolean;
  requiresApiKey?: boolean;
} 