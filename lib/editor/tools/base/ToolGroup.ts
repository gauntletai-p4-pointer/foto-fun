import type React from 'react';

/**
 * Tool group metadata for UI organization
 */
export interface ToolGroupMetadata {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tools: string[];              // Tool IDs that belong to this group
  defaultTool: string;          // Default tool to activate when group is selected
  showActiveToolIcon: boolean;  // Whether to show active tool icon in UI
  priority: number;             // Sort order in UI (lower = higher priority)
  shortcut?: string;            // Keyboard shortcut for group
  category: 'core' | 'creative' | 'utility' | 'ai'; // Group category
}

/**
 * Tool group registry for managing UI groups
 */
export class ToolGroupRegistry {
  private toolGroups = new Map<string, ToolGroupMetadata>();
  
  /**
   * Register a tool group
   */
  registerToolGroup(group: ToolGroupMetadata): void {
    // Validate group
    if (!group.id || !group.name || !group.defaultTool) {
      throw new Error(`Invalid tool group: ${group.id}`);
    }
    
    if (!group.tools.includes(group.defaultTool)) {
      throw new Error(`Default tool ${group.defaultTool} not in group tools for ${group.id}`);
    }
    
    if (this.toolGroups.has(group.id)) {
      console.warn(`Tool group ${group.id} already registered, overwriting`);
    }
    
    this.toolGroups.set(group.id, group);
    console.log(`✅ Registered tool group: ${group.id} (${group.tools.length} tools)`);
  }
  
  /**
   * Get tool group by ID
   */
  getToolGroup(groupId: string): ToolGroupMetadata | null {
    return this.toolGroups.get(groupId) || null;
  }
  
  /**
   * Get all tool groups sorted by priority
   */
  getToolGroups(): ToolGroupMetadata[] {
    return Array.from(this.toolGroups.values())
      .sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Get tool groups by category
   */
  getToolGroupsByCategory(category: ToolGroupMetadata['category']): ToolGroupMetadata[] {
    return this.getToolGroups().filter(group => group.category === category);
  }
  
  /**
   * Find which group a tool belongs to
   */
  findGroupForTool(toolId: string): ToolGroupMetadata | null {
    for (const group of this.toolGroups.values()) {
      if (group.tools.includes(toolId)) {
        return group;
      }
    }
    return null;
  }
  
  /**
   * Check if a tool group exists
   */
  hasToolGroup(groupId: string): boolean {
    return this.toolGroups.has(groupId);
  }
  
  /**
   * Get all tools in a group
   */
  getToolsInGroup(groupId: string): string[] {
    const group = this.toolGroups.get(groupId);
    return group ? group.tools : [];
  }
  
  /**
   * Validate all tool groups
   */
  validateToolGroups(): void {
    const errors: string[] = [];
    
    for (const [groupId, group] of this.toolGroups) {
      // Check for empty tools array
      if (group.tools.length === 0) {
        errors.push(`Group ${groupId} has no tools`);
      }
      
      // Check default tool exists in tools array
      if (!group.tools.includes(group.defaultTool)) {
        errors.push(`Group ${groupId} default tool ${group.defaultTool} not in tools array`);
      }
      
      // Check for duplicate tools across groups
      for (const [otherGroupId, otherGroup] of this.toolGroups) {
        if (groupId !== otherGroupId) {
          const duplicateTools = group.tools.filter(toolId => 
            otherGroup.tools.includes(toolId)
          );
          if (duplicateTools.length > 0) {
            errors.push(`Groups ${groupId} and ${otherGroupId} share tools: ${duplicateTools.join(', ')}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Tool group validation failed:\n${errors.join('\n')}`);
    }
  }
} 