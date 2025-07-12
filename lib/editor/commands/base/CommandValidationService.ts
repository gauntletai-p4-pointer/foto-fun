import { z } from 'zod';
import type { Command } from './Command';
import type { CanvasObject } from '../../objects/types';

/**
 * Validation result for a single command
 */
export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation result for a batch of commands
 */
export interface BatchValidationResult {
  success: boolean;
  results: Map<string, ValidationResult>;
  globalErrors: ValidationError[];
  totalErrors: number;
  totalWarnings: number;
}

/**
 * Validation error with context
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  context?: Record<string, unknown>;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

/**
 * Command validation service interface
 */
export interface CommandValidationService {
  validateCommand(command: Command): ValidationResult;
  validateBatch(commands: Command[]): BatchValidationResult;
  registerSchema(commandType: string, schema: z.ZodType): void;
  getSchema(commandType: string): z.ZodType | null;
}

/**
 * Default implementation of command validation service
 */
export class DefaultCommandValidationService implements CommandValidationService {
  private schemas: Map<string, z.ZodType> = new Map();

  constructor() {
    this.registerBuiltinSchemas();
  }

  /**
   * Validate a single command
   */
  validateCommand(command: Command): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic command structure validation
      this.validateCommandStructure(command, errors);

      // Type-specific validation
      this.validateCommandType(command, errors, warnings);

      // Context validation
      this.validateCommandContext(command, errors, warnings);

      return {
        success: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push({
        field: 'command',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_FAILURE',
        value: command
      });

      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate a batch of commands
   */
  validateBatch(commands: Command[]): BatchValidationResult {
    const results = new Map<string, ValidationResult>();
    const globalErrors: ValidationError[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    // Validate individual commands
    for (const command of commands) {
      const result = this.validateCommand(command);
      const commandId = command.id;
      
      results.set(commandId, result);
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }

    // Validate batch-level constraints
    this.validateBatchConstraints(commands, globalErrors);
    totalErrors += globalErrors.length;

    return {
      success: totalErrors === 0,
      results,
      globalErrors,
      totalErrors,
      totalWarnings
    };
  }

  /**
   * Register a validation schema for a command type
   */
  registerSchema(commandType: string, schema: z.ZodType): void {
    this.schemas.set(commandType, schema);
  }

  /**
   * Get validation schema for a command type
   */
  getSchema(commandType: string): z.ZodType | null {
    return this.schemas.get(commandType) || null;
  }

  /**
   * Validate basic command structure
   */
  private validateCommandStructure(command: Command, errors: ValidationError[]): void {
    // Validate description
    const description = command.description;
    if (!description || description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Command description is required',
        code: 'MISSING_DESCRIPTION',
        value: description
      });
    }

    // Validate metadata
    const metadata = command.metadata;
    if (!command.id) {
      errors.push({
        field: 'metadata.executionId',
        message: 'Execution ID is required',
        code: 'MISSING_EXECUTION_ID'
      });
    }

    if (!command.timestamp || command.timestamp <= 0) {
      errors.push({
        field: 'metadata.timestamp',
        message: 'Valid timestamp is required',
        code: 'INVALID_TIMESTAMP',
        value: command.timestamp
      });
    }

    // Validate context (accessing protected property through type assertion)
    const context = (command as any).context;
    if (!context) {
      errors.push({
        field: 'context',
        message: 'Command context is required',
        code: 'MISSING_CONTEXT'
      });
      return;
    }

    if (!context.eventBus) {
      errors.push({
        field: 'context.eventBus',
        message: 'Event bus is required in context',
        code: 'MISSING_EVENT_BUS'
      });
    }

    if (!context.canvasManager) {
      errors.push({
        field: 'context.canvasManager',
        message: 'Canvas manager is required in context',
        code: 'MISSING_CANVAS_MANAGER'
      });
    }
  }

  /**
   * Validate command type-specific constraints
   */
  private validateCommandType(command: Command, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const commandType = command.constructor.name;
    const schema = this.getSchema(commandType);

    if (!schema) {
      warnings.push({
        field: 'schema',
        message: `No validation schema registered for command type: ${commandType}`,
        code: 'MISSING_SCHEMA',
        suggestion: `Register a schema using registerSchema('${commandType}', schema)`
      });
      return;
    }

    try {
      // Extract command-specific data for validation
      const commandData = this.extractCommandData(command);
      const result = schema.safeParse(commandData);

             if (!result.success) {
         for (const issue of result.error.issues) {
           errors.push({
             field: issue.path.join('.'),
             message: issue.message,
             code: issue.code,
             value: (issue as any).received,
             context: { expected: (issue as any).expected }
           });
         }
       }
    } catch (error) {
      errors.push({
        field: 'typeValidation',
        message: `Type validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'TYPE_VALIDATION_FAILURE'
      });
    }
  }

  /**
   * Validate command context constraints
   */
  private validateCommandContext(command: Command, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const context = (command as any).context;
    if (!context) return;

    // Validate execution ID uniqueness (basic check)
    const executionId = command.id;
    if (executionId && executionId.length < 8) {
      warnings.push({
        field: 'context.executionId',
        message: 'Execution ID should be at least 8 characters for uniqueness',
        code: 'WEAK_EXECUTION_ID',
        suggestion: 'Use a UUID or similar unique identifier'
      });
    }

    // Validate timestamp is recent (within last hour)
    const timestamp = command.timestamp;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (timestamp > now + oneHour) {
      warnings.push({
        field: 'context.timestamp',
        message: 'Command timestamp is in the future',
        code: 'FUTURE_TIMESTAMP',
        suggestion: 'Ensure system clock is correct'
      });
    }

    if (timestamp < now - oneHour) {
      warnings.push({
        field: 'context.timestamp',
        message: 'Command timestamp is more than 1 hour old',
        code: 'OLD_TIMESTAMP',
        suggestion: 'Commands should be executed promptly after creation'
      });
    }
  }

  /**
   * Validate batch-level constraints
   */
  private validateBatchConstraints(commands: Command[], errors: ValidationError[]): void {
    // Check for duplicate execution IDs
    const executionIds = new Set<string>();
    const duplicates = new Set<string>();

    for (const command of commands) {
      const executionId = command.id;
      if (executionIds.has(executionId)) {
        duplicates.add(executionId);
      } else {
        executionIds.add(executionId);
      }
    }

    for (const duplicateId of duplicates) {
      errors.push({
        field: 'batch.executionIds',
        message: `Duplicate execution ID found: ${duplicateId}`,
        code: 'DUPLICATE_EXECUTION_ID',
        value: duplicateId
      });
    }

    // Check batch size limits
    if (commands.length > 100) {
      errors.push({
        field: 'batch.size',
        message: 'Batch size exceeds maximum limit of 100 commands',
        code: 'BATCH_SIZE_LIMIT',
        value: commands.length
      });
    }

    // Check for conflicting commands (e.g., create and delete same object)
    this.validateCommandConflicts(commands, errors);
  }

  /**
   * Check for conflicting commands in a batch
   */
  private validateCommandConflicts(commands: Command[], errors: ValidationError[]): void {
    const objectOperations = new Map<string, string[]>();

    for (const command of commands) {
      const commandType = command.constructor.name;
      const affectedObjects = this.getAffectedObjects(command);

      for (const objectId of affectedObjects) {
        if (!objectOperations.has(objectId)) {
          objectOperations.set(objectId, []);
        }
        objectOperations.get(objectId)!.push(commandType);
      }
    }

    // Check for create/delete conflicts
    for (const [objectId, operations] of objectOperations) {
      const hasCreate = operations.some(op => op.includes('Add') || op.includes('Create'));
      const hasDelete = operations.some(op => op.includes('Remove') || op.includes('Delete'));

      if (hasCreate && hasDelete) {
        errors.push({
          field: 'batch.conflicts',
          message: `Object ${objectId} has both create and delete operations in the same batch`,
          code: 'CREATE_DELETE_CONFLICT',
          value: objectId,
          context: { operations }
        });
      }
    }
  }

  /**
   * Extract command-specific data for validation
   */
  private extractCommandData(command: Command): Record<string, unknown> {
    // This is a simplified extraction - in practice, each command type
    // would need its own extraction logic
    return {
      description: command.description,
      metadata: command.metadata,
      context: (command as any).context
    };
  }

  /**
   * Get objects affected by a command
   */
  private getAffectedObjects(command: Command): string[] {
    // This is a simplified implementation - in practice, each command type
    // would need its own logic to determine affected objects
    const commandType = command.constructor.name;
    
    if (commandType.includes('Object')) {
      // Try to extract object ID from metadata or other properties
      const metadata = command.metadata;
      if ((metadata as any).objectId) {
        return [(metadata as any).objectId as string];
      }
    }

    return [];
  }

  /**
   * Register built-in validation schemas
   */
  private registerBuiltinSchemas(): void {
    // Base command schema
    const baseCommandSchema = z.object({
      description: z.string().min(1, 'Description is required'),
      metadata: z.object({
        executionId: z.string().min(8, 'Execution ID must be at least 8 characters'),
        timestamp: z.number().positive('Timestamp must be positive')
      }),
      context: z.object({
        eventBus: z.any(),
        canvasManager: z.any(),
        selectionManager: z.any(),
        executionId: z.string(),
        timestamp: z.number()
      })
    });

    // Object command schemas
    const objectCommandSchema = baseCommandSchema.extend({
      objectData: z.object({
        id: z.string().optional(),
        type: z.enum(['image', 'text', 'shape', 'group', 'frame']),
        x: z.number(),
        y: z.number(),
        width: z.number().positive(),
        height: z.number().positive()
      })
    });

    // Register schemas
    this.registerSchema('Command', baseCommandSchema);
    this.registerSchema('AddObjectCommand', objectCommandSchema);
    this.registerSchema('UpdateObjectCommand', objectCommandSchema);
    this.registerSchema('RemoveObjectCommand', baseCommandSchema.extend({
      objectId: z.string().min(1, 'Object ID is required')
    }));

    // Selection command schemas
    this.registerSchema('CreateSelectionCommand', baseCommandSchema.extend({
      selection: z.object({
        objectId: z.string(),
        mask: z.any(), // ImageData
        bounds: z.object({
          x: z.number(),
          y: z.number(),
          width: z.number().positive(),
          height: z.number().positive()
        })
      }),
      mode: z.enum(['add', 'subtract', 'intersect', 'replace'])
    }));

    // Transform command schemas
    this.registerSchema('TransformCommand', baseCommandSchema.extend({
      objectId: z.string().min(1, 'Object ID is required'),
      transform: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        rotation: z.number().optional(),
        scaleX: z.number().positive().optional(),
        scaleY: z.number().positive().optional()
      })
    }));
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Create a validation error
   */
  static createError(field: string, message: string, code: string, value?: unknown): ValidationError {
    return { field, message, code, value };
  }

  /**
   * Create a validation warning
   */
  static createWarning(field: string, message: string, code: string, suggestion?: string): ValidationWarning {
    return { field, message, code, suggestion };
  }

  /**
   * Check if validation result has errors
   */
  static hasErrors(result: ValidationResult): boolean {
    return result.errors.length > 0;
  }

  /**
   * Check if validation result has warnings
   */
  static hasWarnings(result: ValidationResult): boolean {
    return result.warnings.length > 0;
  }

  /**
   * Format validation errors for display
   */
  static formatErrors(errors: ValidationError[]): string {
    return errors.map(error => `${error.field}: ${error.message}`).join('\n');
  }

  /**
   * Format validation warnings for display
   */
  static formatWarnings(warnings: ValidationWarning[]): string {
    return warnings.map(warning => 
      `${warning.field}: ${warning.message}${warning.suggestion ? ` (${warning.suggestion})` : ''}`
    ).join('\n');
  }
} 