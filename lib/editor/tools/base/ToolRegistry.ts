import React from 'react';
import { BaseTool, type ToolDependencies } from './BaseTool';

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

export interface ToolGroupMetadata {
  id: string;
  name: string;
  icon: React.ComponentType;
  tools: string[];
  defaultTool: string;
  showActiveToolIcon: boolean;
  priority: number;
}

export interface ToolClassMetadata {
  id: string;
  ToolClass: new (deps: ToolDependencies) => BaseTool;
  metadata: ToolMetadata;
}

/**
 * Simple tool registry that acts as a catalog of available tool classes.
 * Does NOT manage active tools - that's EventToolStore's job.
 */
export class ToolRegistry {
  private readonly toolClasses = new Map<string, ToolClassMetadata>();
  private readonly toolGroups = new Map<string, ToolGroupMetadata>();

  /**
   * Register a tool class with metadata
   */
  registerToolClass(
    id: string,
    ToolClass: new (deps: ToolDependencies) => BaseTool,
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
  registerToolGroup(group: ToolGroupMetadata): void {
    this.toolGroups.set(group.id, group);
    console.log(`✅ Registered tool group: ${group.id}`);
  }

  /**
   * Get all tool groups sorted by priority
   */
  getToolGroups(): ToolGroupMetadata[] {
    return Array.from(this.toolGroups.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a specific tool group by ID
   */
  getToolGroup(groupId: string): ToolGroupMetadata | null {
    return this.toolGroups.get(groupId) || null;
  }

  /**
   * Get all tools in a specific group
   */
  getToolsInGroup(groupId: string): ToolClassMetadata[] {
    const group = this.toolGroups.get(groupId);
    if (!group) return [];
    
    return group.tools
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
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolClassMetadata[] {
    return this.getAllToolClasses().filter(tool => tool.metadata.category === category);
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

  private validateToolClass(id: string, ToolClass: any): void {
    if (typeof ToolClass !== 'function') {
      throw new Error(`Tool ${id} must be a constructor function`);
    }

    const requiredMethods = ['onActivate', 'onDeactivate', 'handleMouseMove', 'handleMouseDown', 'handleMouseUp'];
    for (const method of requiredMethods) {
      if (!ToolClass.prototype[method]) {
        throw new Error(`Tool ${id} must implement ${method} method`);
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