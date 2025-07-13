'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useServiceContainer, useAsyncService } from '@/lib/core/AppInitializer'
import { useStore, BaseStore } from '@/lib/store/base/BaseStore'
import type { EventToolStore } from '@/lib/store/tools/EventToolStore'
import type { ToolRegistry } from '@/lib/editor/tools/base/ToolRegistry'
import type { ToolGroupMetadata } from '@/lib/editor/tools/base/ToolGroup'
import type { Event } from '@/lib/events/core/Event'
import { EventStore } from '@/lib/events/core/EventStore'

// Define the ToolStoreState interface to match EventToolStore
interface ToolStoreState {
  activeToolId: string | null;
  previousToolId: string | null;
  isActivating: boolean;
  toolHistory: string[];
}

// Create a null store class for when the real ToolStore isn't available yet
class NullToolStore extends BaseStore<ToolStoreState> {
  constructor() {
    const nullEventStore = new EventStore({ persistence: false, indexing: false });
    super({ activeToolId: null, previousToolId: null, isActivating: false, toolHistory: [] }, nullEventStore);
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    return new Map();
  }
}

// Helper to render icon with className support
const renderIcon = (IconComponent: React.ComponentType<{ className?: string }>, className?: string) => {
  return React.createElement(IconComponent, { className });
};

interface ToolPaletteProps {
  className?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
}

export function ToolPalette({ className }: ToolPaletteProps) {
  const [mounted, setMounted] = useState(false);
  const [toolGroups, setToolGroups] = useState<ToolGroupMetadata[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serviceContainer = useServiceContainer();
  const toolRegistryRef = useRef<ToolRegistry | null>(null);
  
  // Use proper async service loading and store subscription
  const { service: toolStore } = useAsyncService<EventToolStore>('ToolStore');
  
  // Create a stable null store instance
  const nullStore = useMemo(() => new NullToolStore(), []);
  
  // Always call useStore with a valid store (either real or null store)
  const toolState = useStore(toolStore || nullStore);
  
  // Get active tool ID from store state (with fallbacks)
  const activeToolId = toolStore ? toolState?.activeToolId || null : null;
  const isActivating = toolStore ? toolState?.isActivating || false : false;

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        const toolRegistry = await serviceContainer.get<ToolRegistry>('ToolRegistry');
        toolRegistryRef.current = toolRegistry;
        
        // Load tool groups
        const groups = toolRegistry.getToolGroups();
        setToolGroups(groups);
        
        setMounted(true);
      } catch (error) {
        console.error('Failed to initialize ToolPalette services:', error);
      }
    };

    initServices();
  }, [serviceContainer]);

  // Handle group hover for dropdown
  const handleGroupHover = (groupId: string, element: HTMLElement) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const group = toolGroups.find(g => g.id === groupId);
    if (!group) return;
    
    // Get implemented tools in this group
    const implementedTools = group.tools.filter(toolId => 
      toolRegistryRef.current?.hasToolClass(toolId)
    );
    
    // Only show dropdown if there are multiple implemented tools
    if (implementedTools.length <= 1) return;

    hoverTimeoutRef.current = setTimeout(() => {
      const rect = element.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top,
        left: rect.right + 8
      });
      setExpandedGroup(groupId);
    }, 500); // 500ms delay for hover
  };

  const handleGroupLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Set timeout to close dropdown if mouse doesn't enter dropdown
    hoverTimeoutRef.current = setTimeout(() => {
      setExpandedGroup(null);
      setDropdownPosition(null);
    }, 100); // Small delay to allow mouse to move to dropdown
  };

  const handleDropdownEnter = () => {
    // Keep dropdown open when mouse enters
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleDropdownLeave = () => {
    // Close dropdown when mouse leaves
    setExpandedGroup(null);
    setDropdownPosition(null);
  };

  // Handle group click
  const handleGroupClick = async (groupId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!toolStore || isActivating) return;

    const group = toolGroups.find(g => g.id === groupId);
    if (!group) return;
    
    // Get implemented tools in this group
    const implementedTools = group.tools.filter(toolId => 
      toolRegistryRef.current?.hasToolClass(toolId)
    );
    
    // If multiple tools, show dropdown instead of activating
    if (implementedTools.length > 1) {
      const rect = event.currentTarget.getBoundingClientRect();
      const position = {
        top: rect.top,
        left: rect.right + 8
      };
      setDropdownPosition(position);
      setExpandedGroup(groupId);
      return;
    }

    // If only one tool, activate it directly
    if (implementedTools.length === 1) {
      try {
        await toolStore.activateTool(implementedTools[0]);
        
        // Close dropdown after activation
        setExpandedGroup(null);
        setDropdownPosition(null);
      } catch (error) {
        console.error('[ToolPalette] Failed to activate tool:', error);
      } finally {
      }
    } else {
      // No implemented tools in group - try default tool anyway
      try {
        await toolStore.activateTool(group.defaultTool);
        
        // Close dropdown after activation
        setExpandedGroup(null);
        setDropdownPosition(null);
      } catch (error) {
        console.error('[ToolPalette] Failed to activate default tool:', error);
      } finally {
      }
    }
  };

  // Handle specific tool selection
  const handleToolSelect = async (toolId: string) => {
    if (!toolStore || isActivating) return;

    try {
      await toolStore.activateTool(toolId);
      
      // Close dropdown after activation
      setExpandedGroup(null);
      setDropdownPosition(null);
    } catch (error) {
      console.error('[ToolPalette] Failed to activate tool:', toolId, error);
    } finally {
    }
  };

  // Get current tool for a group (active tool if in group, or last used/default)
  const getCurrentGroupTool = (group: ToolGroupMetadata): { id: string; icon: React.ComponentType } => {
    if (!toolStore || !toolRegistryRef.current) {
      return {
        id: group.defaultTool,
        icon: group.icon
      };
    }

    // If active tool is in this group, use it
    if (activeToolId && group.tools.includes(activeToolId)) {
      const toolClass = toolRegistryRef.current.getToolClass(activeToolId);
      return {
        id: activeToolId,
        icon: toolClass?.metadata.icon || group.icon
      };
    }

    // Otherwise use last used tool in group or default
    const lastUsed = toolStore.getLastUsedToolInGroup(group.id);
    if (lastUsed && toolRegistryRef.current.hasToolClass(lastUsed)) {
      const toolClass = toolRegistryRef.current.getToolClass(lastUsed);
      return {
        id: lastUsed,
        icon: toolClass?.metadata.icon || group.icon
      };
    }

    return {
      id: group.defaultTool,
      icon: group.icon
    };
  };

  // Check if group is active
  const isGroupActive = (group: ToolGroupMetadata): boolean => {
    return activeToolId ? group.tools.includes(activeToolId) : false;
  };

  // Check if tool is implemented (for now, assume all are implemented)
  const isToolImplemented = (toolId: string): boolean => {
    return toolRegistryRef.current?.hasToolClass(toolId) || false;
  };

  // Render dropdown menu
  const renderDropdown = () => {
    if (!mounted || !expandedGroup || !dropdownPosition) return null;
    
    const group = toolGroups.find(g => g.id === expandedGroup);
    if (!group) return null;
    
    // Only show implemented tools in dropdown
    const implementedTools = group.tools.filter(toolId => 
      toolRegistryRef.current?.hasToolClass(toolId)
    );
    
    if (implementedTools.length <= 1) return null;

    const currentTool = getCurrentGroupTool(group);

    return createPortal(
      <div 
        className="fixed bg-popover text-popover-foreground border border-border rounded-lg shadow-xl min-w-[180px] p-1 animate-in slide-in-from-left-1 duration-200 z-50"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
        }}
        onMouseEnter={handleDropdownEnter}
        onMouseLeave={handleDropdownLeave}
      >
        {/* Group header */}
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-border mb-1">
          {group.name}
        </div>
        
        {/* Tool options */}
        {implementedTools.map(toolId => {
          const toolClass = toolRegistryRef.current?.getToolClass(toolId);
          const isActive = toolId === activeToolId;
          const isSelected = toolId === currentTool.id;
          const implemented = isToolImplemented(toolId);
          
          if (!toolClass || !implemented) return null;
          
          const ToolIcon = toolClass.metadata.icon;
          
          return (
            <button
              key={toolId}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive 
                  ? "bg-tool-active text-tool-active-foreground" 
                  : implemented
                    ? "text-popover-foreground hover:bg-foreground/10 hover:text-foreground"
                    : "text-muted-foreground cursor-not-allowed opacity-50"
              )}
              onClick={() => implemented && handleToolSelect(toolId)}
              disabled={!implemented}
            >
                             {renderIcon(ToolIcon, "w-4 h-4 flex-shrink-0 stroke-[1.5]")}
              <span className="flex-1">{toolClass.metadata.name}</span>
              {isSelected && (
                <Check className="w-3 h-3 text-inherit" />
              )}
            </button>
          );
        })}
      </div>,
      document.body
    );
  };

  if (!mounted) {
    return (
      <div className={cn("flex flex-col gap-1 p-2", className)}>
        <div className="text-xs text-muted-foreground">Loading tools...</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1 py-2", className)}>
      {/* Tool groups */}
      {toolGroups.map(group => {
        const currentTool = getCurrentGroupTool(group);
        const isActive = isGroupActive(group);
        
        const implemented = isToolImplemented(currentTool.id);
        
        // Determine which icon to show
        const IconToShow = group.showActiveToolIcon ? currentTool.icon : group.icon;
          
        return (
          <div key={group.id} className="relative">
            <button
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-md transition-all relative group",
                isActive 
                  ? "bg-tool-active text-tool-active-foreground" 
                  : implemented
                    ? "text-foreground hover:bg-foreground/10"
                    : "text-foreground/30 cursor-not-allowed"
              )}
              onClick={(e) => handleGroupClick(group.id, e)}
              onMouseEnter={(e) => {
                // Clear any pending close timeout
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                handleGroupHover(group.id, e.currentTarget);
              }}
              onMouseLeave={handleGroupLeave}
              disabled={!implemented || isActivating}
            >
              {renderIcon(IconToShow, "w-5 h-5 stroke-[1.5]")}
              
              {/* Loading indicator */}
              {isActivating && isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-md">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          </div>
        );
      })}
      
      {/* Render dropdown portal */}
      {renderDropdown()}
    </div>
  );
}
