import React from 'react';
import { BaseTool, type ToolDependencies } from './BaseTool';
import { ToolGroupRegistry, type ToolGroupMetadata as ToolGroupMeta } from './ToolGroup';

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  groupId: string; // Which UI group this tool belongs to
  icon: React.ComponentType;
  cursor: string;
  shortcut?: string;
  priority?: number;
}

// ToolGroupMetadata is imported from ToolGroup.ts as ToolGroupMeta

export interface ToolClassMetadata {
  id: string;
  ToolClass: new (id: string, deps: ToolDependencies) => BaseTool;
  metadata: ToolMetadata;
}

/**
 * Simple tool registry that acts as a catalog of available tool classes.
 * Does NOT manage active tools - that's EventToolStore's job.
 */
export class ToolRegistry {
  private readonly toolClasses = new Map<string, ToolClassMetadata>();
  private readonly toolGroupRegistry = new ToolGroupRegistry();

  /**
   * Register a tool class with metadata
   */
  registerToolClass(
    id: string,
    ToolClass: new (id: string, deps: ToolDependencies) => BaseTool,
    metadata: ToolMetadata
  ): void {
    if (this.toolClasses.has(id)) {
      console.warn(`Tool ${id} already registered, overwriting`);
    }
    
    this.validateToolClass(id, ToolClass);
    this.validateMetadata(id, metadata);
    
    this.toolClasses.set(id, {
      id,
      ToolClass,
      metadata
    });
    
    console.log(`✅ Registered tool: ${id} (${metadata.category})`);
  }

  /**
   * Register a tool group for UI organization
   */
  registerToolGroup(group: ToolGroupMeta): void {
    this.toolGroupRegistry.registerToolGroup(group);
  }

  /**
   * Get all tool groups sorted by priority
   */
  getToolGroups(): ToolGroupMeta[] {
    return this.toolGroupRegistry.getToolGroups();
  }

  /**
   * Get a specific tool group by ID
   */
  getToolGroup(groupId: string): ToolGroupMeta | null {
    return this.toolGroupRegistry.getToolGroup(groupId);
  }

  /**
   * Get all tools in a specific group
   */
  getToolsInGroup(groupId: string): ToolClassMetadata[] {
    const toolIds = this.toolGroupRegistry.getToolsInGroup(groupId);
    return toolIds
      .map(toolId => this.toolClasses.get(toolId))
      .filter((tool): tool is ToolClassMetadata => tool !== undefined);
  }

  /**
   * Get tool class metadata by ID
   */
  getToolClass(id: string): ToolClassMetadata | null {
    return this.toolClasses.get(id) || null;
  }

  /**
   * Check if tool class is registered
   */
  hasToolClass(id: string): boolean {
    return this.toolClasses.has(id);
  }

  /**
   * Get all registered tool classes
   */
  getAllToolClasses(): ToolClassMetadata[] {
    return Array.from(this.toolClasses.values());
  }

  /**
   * Get tool metadata without creating instance
   */
  getToolMetadata(toolId: string): ToolMetadata | null {
    const toolClass = this.toolClasses.get(toolId);
    return toolClass?.metadata || null;
  }

  /**
   * Get all tool metadata for UI display
   */
  getAllToolMetadata(): ToolMetadata[] {
    return Array.from(this.toolClasses.values()).map(tc => tc.metadata);
  }

  /**
   * Get tools by category with metadata
   */
  getToolsByCategory(category: string): ToolMetadata[] {
    return this.getAllToolMetadata().filter(tool => tool.category === category);
  }

  /**
   * Get tools in group with metadata
   */
  getToolsInGroupWithMetadata(groupId: string): ToolMetadata[] {
    const toolIds = this.toolGroupRegistry.getToolsInGroup(groupId);
    return toolIds
      .map(toolId => this.getToolMetadata(toolId))
      .filter((metadata): metadata is ToolMetadata => metadata !== null);
  }

  /**
   * Validate all registered tools
   */
  validateAllTools(): void {
    const errors: string[] = [];
    
    for (const [id, toolClass] of this.toolClasses) {
      try {
        this.validateToolClass(id, toolClass.ToolClass);
             } catch (error) {
         const errorMessage = error instanceof Error ? error.message : String(error);
         errors.push(`${id}: ${errorMessage}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Tool validation failed:\n${errors.join('\n')}`);
    }
  }

  private validateToolClass(id: string, ToolClass: new (id: string, deps: ToolDependencies) => BaseTool): void {
    if (typeof ToolClass !== 'function') {
      throw new Error(`Tool ${id} must be a constructor function`);
    }

    const requiredMethods = ['onActivate', 'onDeactivate'];
    for (const method of requiredMethods) {
      if (typeof ToolClass.prototype[method] !== 'function') {
        throw new Error(`Tool ${id} must implement the abstract method: ${method}`);
      }
    }
  }

  private validateMetadata(id: string, metadata: ToolMetadata): void {
    if (!metadata.name || !metadata.category) {
      throw new Error(`Tool ${id} missing required metadata (name, category)`);
    }
    
    if (!metadata.description) {
      throw new Error(`Tool ${id} missing description`);
    }
  }
} 