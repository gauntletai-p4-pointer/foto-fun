import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useServiceContainer } from '@/lib/core/AppInitializer';
import type { EventToolStore } from '@/lib/store/tools/EventToolStore';
import type { ToolRegistry } from '@/lib/editor/tools/base/ToolRegistry';
import type { ToolGroupMetadata } from '@/lib/editor/tools/base/ToolGroup';
import { Check, ChevronRight } from 'lucide-react';

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
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serviceContainer = useServiceContainer();
  const toolStoreRef = useRef<EventToolStore | null>(null);
  const toolRegistryRef = useRef<ToolRegistry | null>(null);

  // Initialize services
  useEffect(() => {
    const initServices = async () => {
      try {
        const [toolStore, toolRegistry] = await Promise.all([
          serviceContainer.get<EventToolStore>('ToolStore'),
          serviceContainer.get<ToolRegistry>('ToolRegistry')
        ]);
        
        toolStoreRef.current = toolStore;
        toolRegistryRef.current = toolRegistry;
        
        // Load tool groups
        const groups = toolRegistry.getToolGroups();
        setToolGroups(groups);
        
        // Set initial active tool
        const initialActiveToolId = toolStore.getActiveToolId();
        setActiveToolId(initialActiveToolId);
        
        setMounted(true);
      } catch (error) {
        console.error('Failed to initialize ToolPalette services:', error);
      }
    };

    initServices();
  }, [serviceContainer]);

  // Listen for tool state changes
  useEffect(() => {
    if (!toolStoreRef.current) return;

    const toolStore = toolStoreRef.current;
    
    const handleToolStateChange = () => {
      const newActiveToolId = toolStore.getActiveToolId();
      setActiveToolId(newActiveToolId);
      setIsActivating(toolStore.getState().isActivating);
    };

    // Subscribe to tool store state changes
    const unsubscribe = toolStore.subscribe(handleToolStateChange);
    
    return () => {
      unsubscribe();
    };
  }, [mounted]);

  // Handle group hover for dropdown
  const handleGroupHover = (groupId: string, element: HTMLElement) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const group = toolGroups.find(g => g.id === groupId);
    if (!group || group.tools.length <= 1) return;

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

  // Handle group click (activate default or last used tool)
  const handleGroupClick = async (groupId: string) => {
    if (!toolStoreRef.current || isActivating) return;

    try {
      setIsActivating(true);
      await toolStoreRef.current.activateToolGroup(groupId);
      
      // Close dropdown after activation
      setExpandedGroup(null);
      setDropdownPosition(null);
    } catch (error) {
      console.error('Failed to activate tool group:', error);
    } finally {
      setIsActivating(false);
    }
  };

  // Handle specific tool selection
  const handleToolSelect = async (toolId: string) => {
    if (!toolStoreRef.current || isActivating) return;

    try {
      setIsActivating(true);
      await toolStoreRef.current.activateTool(toolId);
      
      // Close dropdown after activation
      setExpandedGroup(null);
      setDropdownPosition(null);
    } catch (error) {
      console.error('Failed to activate tool:', error);
    } finally {
      setIsActivating(false);
    }
  };

  // Get current tool for a group (active tool if in group, or last used/default)
  const getCurrentGroupTool = (group: ToolGroupMetadata): { id: string; icon: React.ComponentType } => {
    if (!toolStoreRef.current || !toolRegistryRef.current) {
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
    const lastUsed = toolStoreRef.current.getLastUsedToolInGroup(group.id);
    if (lastUsed) {
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
    if (!group || group.tools.length <= 1) return null;

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
        {group.tools.map(toolId => {
          const toolClass = toolRegistryRef.current?.getToolClass(toolId);
          const isActive = toolId === activeToolId;
          const isSelected = toolId === currentTool.id;
          const implemented = isToolImplemented(toolId);
          
          if (!toolClass) return null;
          
          const ToolIcon = toolClass.metadata.icon;
          
          return (
            <button
              key={toolId}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors text-left",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive 
                  ? "bg-muted text-foreground" 
                  : implemented
                    ? "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-muted-foreground cursor-not-allowed opacity-50"
              )}
              onClick={() => implemented && handleToolSelect(toolId)}
              disabled={!implemented}
            >
                             {renderIcon(ToolIcon, "w-4 h-4 flex-shrink-0 stroke-[1.5]")}
              <span className="flex-1">{toolClass.metadata.name}</span>
              {isSelected && (
                <Check className="w-3 h-3 text-primary" />
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
    <div className={cn("flex flex-col gap-1 p-2", className)}>
      {/* Tool groups */}
      {toolGroups.map(group => {
        const currentTool = getCurrentGroupTool(group);
        const isActive = isGroupActive(group);
        const hasMultipleTools = group.tools.length > 1;
        const implemented = isToolImplemented(currentTool.id);
        
        // Determine which icon to show
        const IconToShow = group.showActiveToolIcon ? currentTool.icon : group.icon;
        
        return (
          <div key={group.id} className="relative">
            <button
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-md transition-all relative group",
                isActive 
                  ? "bg-muted text-foreground" 
                  : implemented
                    ? "text-foreground hover:bg-muted"
                    : "text-foreground/50 cursor-not-allowed"
              )}
              onClick={() => handleGroupClick(group.id)}
              onMouseEnter={(e) => handleGroupHover(group.id, e.currentTarget)}
              onMouseLeave={handleGroupLeave}
              disabled={!implemented || isActivating}
            >
                             {renderIcon(IconToShow, "w-5 h-5 stroke-[1.5]")}
              
              {/* Multiple tools indicator */}
              {hasMultipleTools && (
                <ChevronRight className="w-2 h-2 absolute bottom-0.5 right-0.5 opacity-60" />
              )}
              
              {/* Loading indicator */}
              {isActivating && isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-md">
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
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
