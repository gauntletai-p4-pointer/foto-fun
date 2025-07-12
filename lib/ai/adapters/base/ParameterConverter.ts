/**
 * Parameter definition for type-safe conversion
 */
export interface ParameterDefinition<T = any> {
  type: 'number' | 'string' | 'boolean' | 'color' | 'enum' | 'object';
  required?: boolean;
  default?: T;
  min?: number;
  max?: number;
  enum?: T[];
  validator?: (value: T) => boolean;
  converter?: (value: any) => T;
  description?: string;
}

/**
 * Parameter schema for adapter inputs
 */
export interface ParameterSchema {
  [key: string]: ParameterDefinition;
}

/**
 * Type-safe parameter conversion service
 * Handles intelligent conversion from AI inputs to tool parameters
 */
export class ParameterConverter {
  /**
   * Convert input parameters using schema
   */
  convert<T extends Record<string, any>>(
    input: any,
    schema: ParameterSchema
  ): T {
    const result = {} as T;
    
    for (const [key, definition] of Object.entries(schema)) {
      const value = this.convertParameter(input[key], definition);
      if (value !== undefined) {
        result[key as keyof T] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Validate parameter constraints
   */
  validateConstraints(params: unknown, constraints: any): boolean {
    try {
      // Basic validation - can be extended
      return typeof params === 'object' && params !== null;
    } catch {
      return false;
    }
  }
  
  /**
   * Convert a single parameter value
   */
  private convertParameter(value: any, definition: ParameterDefinition): any {
    // Handle undefined/null values
    if (value === undefined || value === null) {
      if (definition.required) {
        throw new Error(`Required parameter missing`);
      }
      return definition.default;
    }
    
    // Use custom converter if provided
    if (definition.converter) {
      return definition.converter(value);
    }
    
    // Standard type conversion
    switch (definition.type) {
      case 'number':
        return this.convertNumber(value, definition);
        
      case 'string':
        return String(value);
        
      case 'boolean':
        return this.convertBoolean(value);
        
      case 'color':
        return this.convertColor(value);
        
      case 'enum':
        return this.convertEnum(value, definition);
        
      case 'object':
        return value; // Pass through objects as-is
        
      default:
        return value;
    }
  }
  
  /**
   * Convert to number with validation
   */
  private convertNumber(value: any, definition: ParameterDefinition): number {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }
    
    if (definition.min !== undefined && num < definition.min) {
      throw new Error(`Value ${num} below minimum ${definition.min}`);
    }
    
    if (definition.max !== undefined && num > definition.max) {
      throw new Error(`Value ${num} above maximum ${definition.max}`);
    }
    
    return num;
  }
  
  /**
   * Convert to boolean
   */
  private convertBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  }
  
  /**
   * Convert color value
   */
  private convertColor(value: any): string {
    if (typeof value === 'string') {
      // Basic color validation - can be enhanced
      if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
        return value;
      }
      // Handle named colors
      const namedColors: Record<string, string> = {
        red: '#ff0000',
        green: '#00ff00',
        blue: '#0000ff',
        black: '#000000',
        white: '#ffffff'
      };
      return namedColors[value.toLowerCase()] || value;
    }
    throw new Error(`Invalid color format: ${value}`);
  }
  
  /**
   * Convert enum value
   */
  private convertEnum(value: any, definition: ParameterDefinition): any {
    if (!definition.enum?.includes(value)) {
      throw new Error(`Invalid enum value: ${value}. Expected: ${definition.enum?.join(', ')}`);
    }
    return value;
  }
} 