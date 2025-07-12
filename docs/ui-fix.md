# Tool Palette UI Fix Plan

## Overview
This document outlines the comprehensive plan to fix critical UI issues in the ToolPalette component that prevent proper tool selection and dropdown functionality.

## Issues Identified

### 1. **Menu Stays Open Incorrectly**
- **Problem**: Dropdown menu doesn't close when mouse leaves both the tool button AND the dropdown menu
- **Current Behavior**: Menu stays open indefinitely once opened via hover
- **Root Cause**: `handleGroupLeave` only clears timeout but doesn't close menu; no coordination between button hover and dropdown hover

### 2. **Dropdown is Transparent** 
- **Problem**: Dropdown background is see-through despite styling attempts
- **Root Cause**: CSS variable `--popover` is not defined in `app/globals.css`, causing fallback to transparent

### 3. **HTML Tooltips Still Showing**
- **Problem**: HTML `title` attributes are still present on buttons
- **Current Behavior**: Browser tooltips appear on hover
- **Expected**: No tooltips (clean interface)

### 4. **Tool Selection Not Working**
- **Problem**: Clicking tools doesn't make them the active tool
- **Root Cause**: `selectedGroupTools` state is separate from `activeTool` state and they get out of sync
- **Current Logic Flaw**: Group icon shows `selectedGroupTools[group.id]` but active state checks `activeTool?.id`

### 5. **Group Icon Not Updating**
- **Problem**: When selecting a tool from dropdown, the group's displayed icon doesn't change
- **Expected**: Group should show the icon of the currently active tool within that group

## Root Cause Analysis

### State Management Issues
```typescript
// PROBLEMATIC: Two separate sources of truth
const [selectedGroupTools, setSelectedGroupTools] = useState<Record<string, string>>({})
const activeTool = toolState.activeTool // From store

// These can get out of sync!
const currentSelectedTool = selectedGroupTools[group.id] || group.primaryTool.id
const isActive = group.tools.some(tool => tool.id === activeTool?.id)
```

### Hover Logic Issues
```typescript
// PROBLEMATIC: Only clears timeout, doesn't close menu
const handleGroupLeave = () => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    setHoverTimeout(null)
  }
  // Missing: Close dropdown logic
}

// PROBLEMATIC: No coordination between button and dropdown hover
onMouseLeave={() => {
  setExpandedGroup(null)  // Immediately closes, can't move to dropdown
  setDropdownPosition(null)
}}
```

### CSS Variable Issues
```css
/* MISSING in app/globals.css */
--popover: /* not defined */
--popover-foreground: /* not defined */
```

## Detailed Fix Plan

### Phase 1: CSS Variables (File: `app/globals.css`)

**Add missing popover color definitions:**

```css
/* In light mode section (around line 30) */
--popover: #FFFFFF;
--popover-foreground: #1A1A1A;
--muted: rgb(26 26 26 / 0.5);
--muted-foreground: rgb(26 26 26 / 0.7);

/* In dark mode section (around line 85) */
--popover: #2A2A2A;
--popover-foreground: #FAFAFA;
--muted: rgb(250 250 250 / 0.5);
--muted-foreground: rgb(250 250 250 / 0.7);
```

### Phase 2: State Management Refactor (File: `components/editor/ToolPalette/index.tsx`)

#### 2.1 Remove Redundant State
```typescript
// REMOVE this entire state:
const [selectedGroupTools, setSelectedGroupTools] = useState<Record<string, string>>({})

// REMOVE the initialization useEffect:
useEffect(() => {
  const initialSelected: Record<string, string> = {}
  Object.entries(DEFAULT_TOOLS).forEach(([groupId, toolId]) => {
    initialSelected[groupId] = toolId
  })
  setSelectedGroupTools(initialSelected)
}, [])
```

#### 2.2 Add Single Source of Truth Helper
```typescript
/**
 * Get the current tool for a group based on activeTool or defaults
 */
const getCurrentGroupTool = (group: ToolGroup): Tool => {
  // If activeTool belongs to this group, use it
  if (activeTool && group.tools.some(t => t.id === activeTool.id)) {
    return activeTool
  }
  // Otherwise use default tool for this group
  const defaultToolId = DEFAULT_TOOLS[group.id]
  return group.tools.find(t => t.id === defaultToolId) || group.primaryTool
}
```

### Phase 3: Hover Logic Redesign

#### 3.1 Add Hover Area State
```typescript
const [hoverArea, setHoverArea] = useState<'button' | 'dropdown' | null>(null)
```

#### 3.2 Implement Coordinated Hover Handlers
```typescript
const handleGroupHover = (groupId: string, buttonElement: HTMLButtonElement) => {
  const group = toolGroups.find(g => g.id === groupId)
  if (!group || group.tools.length <= 1) return
  
  setHoverArea('button')
  
  // Clear any existing timeout
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
  }
  
  // Set new timeout for hover
  const timeout = setTimeout(() => {
    // Only open if still hovering the button area
    if (hoverArea === 'button') {
      const rect = buttonElement.getBoundingClientRect()
      setDropdownPosition({
        top: rect.top,
        left: rect.right + 8
      })
      setExpandedGroup(groupId)
    }
  }, 350)
  
  setHoverTimeout(timeout)
}

const handleGroupLeave = () => {
  setHoverArea(null)
  
  // Clear hover timeout
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    setHoverTimeout(null)
  }
  
  // Close dropdown after small delay to allow moving to dropdown
  setTimeout(() => {
    if (hoverArea === null) {
      setExpandedGroup(null)
      setDropdownPosition(null)
    }
  }, 100)
}

const handleDropdownEnter = () => {
  setHoverArea('dropdown')
  // Clear any pending close timeout
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    setHoverTimeout(null)
  }
}

const handleDropdownLeave = () => {
  setHoverArea(null)
  // Immediately close dropdown
  setExpandedGroup(null)
  setDropdownPosition(null)
}
```

### Phase 4: Tool Activation Simplification

#### 4.1 Simplify Tool Click Handler
```typescript
const handleToolClick = async (toolId: string, isImplemented: boolean) => {
  if (!isImplemented) {
    alert('This tool is not implemented yet')
    return
  }
  
  // Simply activate the tool - this will update activeTool in store
  await toolStore.activateTool(toolId)
  
  // Close dropdown immediately after selection
  setExpandedGroup(null)
  setDropdownPosition(null)
  
  // Clear hover state
  setHoverArea(null)
  if (hoverTimeout) {
    clearTimeout(hoverTimeout)
    setHoverTimeout(null)
  }
}

const handleGroupClick = (groupId: string) => {
  const group = toolGroups.find(g => g.id === groupId)
  if (!group) return
  
  const currentTool = getCurrentGroupTool(group)
  handleToolClick(currentTool.id, currentTool.isImplemented)
}
```

### Phase 5: Component Rendering Updates

#### 5.1 Update renderToolGroup
```typescript
const renderToolGroup = (group: ToolGroup) => {
  const currentTool = getCurrentGroupTool(group)
  const isActive = activeTool?.id === currentTool.id
  const hasMultipleTools = group.tools.length > 1
  const isExpanded = expandedGroup === group.id
  const isImplemented = currentTool.isImplemented
  
  // Determine which icon to show
  const IconToShow = group.showActiveIcon ? currentTool.icon : (group.categoryIcon || currentTool.icon)
  
  return (
    <div key={group.id} className="relative">
      <button
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-md transition-all relative",
          isActive 
            ? "bg-tool-active text-tool-active-foreground shadow-sm" 
            : isImplemented
              ? "text-tool-inactive hover:bg-tool-background-hover hover:text-tool-hover"
              : "text-tool-inactive/50 cursor-not-allowed"
        )}
        onClick={() => handleGroupClick(group.id)}
        onMouseEnter={(e) => handleGroupHover(group.id, e.currentTarget)}
        onMouseLeave={handleGroupLeave}
        disabled={!isImplemented}
        // REMOVE: title attribute
      >
        <IconToShow className="w-5 h-5" />
      </button>
    </div>
  )
}
```

#### 5.2 Update renderIndividualTool
```typescript
const renderIndividualTool = (tool: typeof tools[0]) => {
  const Icon = tool.icon
  const isActive = activeTool?.id === tool.id
  const isImplemented = tool.isImplemented
  
  return (
    <div key={tool.id} className="relative">
      <button
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-md transition-all relative",
          isActive 
            ? "bg-tool-active text-tool-active-foreground shadow-sm" 
            : isImplemented
              ? "text-tool-inactive hover:bg-tool-background-hover hover:text-tool-hover"
              : "text-tool-inactive/50 cursor-not-allowed"
        )}
        onClick={() => handleToolClick(tool.id, isImplemented)}
        // REMOVE: title attribute
      >
        <Icon className="w-5 h-5" />
      </button>
    </div>
  )
}
```

#### 5.3 Update renderDropdown
```typescript
const renderDropdown = () => {
  if (!mounted || !expandedGroup || !dropdownPosition) return null
  
  const group = toolGroups.find(g => g.id === expandedGroup)
  if (!group || group.tools.length <= 1) return null
  
  const currentTool = getCurrentGroupTool(group)
  
  return createPortal(
    <div 
      className="fixed bg-popover text-popover-foreground border border-border rounded-lg shadow-xl min-w-[180px] p-1 animate-in slide-in-from-left-1 duration-200"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 50
        // REMOVE: backgroundColor override
      }}
      onMouseEnter={handleDropdownEnter}
      onMouseLeave={handleDropdownLeave}
    >
      {/* Group header */}
      <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-border mb-1">
        {group.name}
      </div>
      
      {/* Tool options */}
      {group.tools.map(tool => {
        const ToolIcon = tool.icon
        const isToolActive = tool.id === activeTool?.id
        const isSelected = tool.id === currentTool.id
        
        return (
          <button
            key={tool.id}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-2 text-sm rounded transition-colors text-left",
              isToolActive 
                ? "bg-tool-active text-tool-active-foreground" 
                : tool.isImplemented
                  ? "text-popover-foreground hover:bg-tool-background-hover"
                  : "text-muted-foreground cursor-not-allowed opacity-50"
            )}
            onClick={() => handleToolClick(tool.id, tool.isImplemented)}
            disabled={!tool.isImplemented}
          >
            <ToolIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{tool.name}</span>
            {isSelected && (
              <Check className="w-3 h-3 text-primary" />
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )
}
```

### Phase 6: Cleanup and Optimization

#### 6.1 Update Cleanup Effect
```typescript
// Update cleanup timeouts on unmount
useEffect(() => {
  return () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    if (pressTimeout) clearTimeout(pressTimeout)
  }
}, [hoverTimeout, pressTimeout])
```

#### 6.2 Remove Unused Code
- Remove `handleGroupMouseDown` and `handleGroupMouseUp` (long press functionality)
- Remove `pressTimeout` state
- Remove all mouse down/up event handlers from buttons

## Expected Behavior After Fixes

### ✅ Tool Selection
1. **Single Click on Group Tool**: Activates that tool immediately
2. **Single Click on Individual Tool**: Activates that tool immediately  
3. **Click Tool in Dropdown**: Activates that tool, closes dropdown, updates group icon

### ✅ Dropdown Behavior
1. **Hover Button (350ms)**: Opens dropdown for multi-tool groups
2. **Move to Dropdown**: Dropdown stays open
3. **Leave Dropdown**: Dropdown closes immediately
4. **Leave Button (without entering dropdown)**: Dropdown closes after 100ms delay

### ✅ Visual Feedback
1. **Group Icons**: Always show the currently active tool's icon (if active tool is in that group)
2. **Active States**: Only one tool shows as active at a time
3. **Dropdown Background**: Solid, opaque background with proper contrast
4. **No Tooltips**: Clean interface without HTML tooltips

### ✅ State Consistency
1. **Single Source of Truth**: `activeTool` from store determines everything
2. **Group Display**: Derived from `activeTool` + defaults, not separate state
3. **Selection Sync**: Group icons always reflect the actual active tool

## Implementation Order

1. **CSS Variables** - Fix dropdown transparency immediately
2. **State Refactor** - Remove duplicate state, add helper function
3. **Hover Logic** - Implement coordinated hover system
4. **Tool Activation** - Simplify click handlers
5. **Component Updates** - Update all render functions
6. **Cleanup** - Remove unused code and HTML tooltips

## Implementation Progress

### Phase 1: CSS Variables ✅ COMPLETED
- [x] Add --popover and --popover-foreground variables to light mode
- [x] Add --popover and --popover-foreground variables to dark mode  
- [x] Add --muted and --muted-foreground variables

### Phase 2: State Management Refactor ✅ COMPLETED
- [x] Remove selectedGroupTools state
- [x] Remove initialization useEffect
- [x] Add getCurrentGroupTool helper function

### Phase 3: Hover Logic Redesign ✅ COMPLETED
- [x] Add hoverArea state
- [x] Implement handleGroupHover with coordination
- [x] Implement handleGroupLeave with delay
- [x] Implement handleDropdownEnter/Leave

### Phase 4: Tool Activation Simplification ✅ COMPLETED
- [x] Simplify handleToolClick
- [x] Update handleGroupClick

### Phase 5: Component Rendering Updates ✅ COMPLETED
- [x] Update renderToolGroup
- [x] Update renderIndividualTool  
- [x] Update renderDropdown

### Phase 6: Cleanup and Optimization ✅ COMPLETED
- [x] Update cleanup effect
- [x] Remove unused code (pressTimeout, mouse down/up handlers, title attributes)

## 🎉 ALL PHASES COMPLETED - IMPLEMENTATION FINISHED

**Lint Status**: ✅ All ESLint errors resolved
**TypeScript Status**: ✅ No type errors

## Testing Checklist

- [ ] Dropdown has solid background in light/dark mode
- [ ] Single click activates tools (groups and individuals)
- [ ] Group icons update to show active tool
- [ ] Hover opens dropdown after 350ms
- [ ] Moving from button to dropdown keeps it open
- [ ] Leaving dropdown closes it immediately
- [ ] No HTML tooltips appear
- [ ] Only one tool shows active at a time
- [ ] Dropdown selections work and close dropdown
- [ ] No console errors or memory leaks

## Files to Modify

1. `app/globals.css` - Add popover color variables
2. `components/editor/ToolPalette/index.tsx` - Complete refactor as outlined above

## Risk Assessment

**Low Risk**: These are isolated UI fixes that don't affect core tool functionality or data persistence. The changes simplify the state management and make behavior more predictable.

**Rollback Plan**: If issues arise, the current implementation can be easily restored from git history. 