# Photoshop Layer System Parity

## 80/20 Analysis - What We're Building vs Deferring

### 🎯 **KEEP** - Essential Layer Features (80% of use cases)

These features are used constantly by most users:

| Feature | Why Keep | Status |
|---------|----------|---------|
| **Basic Layers** | Foundation of editing | ✅ Implemented |
| **Layer Opacity** | Essential control | ✅ Implemented |
| **Blend Modes (16 core)** | Cover most needs | ✅ Implemented |
| **Layer Visibility** | Basic requirement | ✅ Implemented |
| **Layer Naming/Reordering** | Organization basics | ✅ Implemented |
| **Layer Groups** | Essential for complex projects | 🚧 In Progress |
| **Clipping Masks** | Very common technique | ❌ **TODO High Priority** |
| **Adjustment Layers** | Non-destructive editing | 🚧 Backend ready, needs UI |
| **Layer Masks** | Selective editing | 🚧 Backend ready, needs UI |
| **Basic Layer Effects** | Drop shadow, stroke, etc. | ✅ Implemented (6 effects) |

### 🚫 **DEFER** - Advanced Features (20% edge cases)

These are powerful but used by a minority of users:

| Feature | Why Defer | Complexity |
|---------|-----------|------------|
| **Smart Objects** | Complex, niche use | Very High |
| **Advanced Blending Options** | Blend If sliders rarely used | High |
| **Layer Comps** | Workflow specific | Medium |
| **Vector Masks** | Path-based masking | High |
| **Advanced Layer Effects** | Satin, pattern overlay | Low value |
| **Fill vs Opacity** | Confusing distinction | Low |
| **Color Tags** | Nice but not essential | Low |

### ✅ **SIMPLIFIED** - Good Enough Features

| Feature | Photoshop | Our Approach |
|---------|-----------|--------------|
| **Lock Options** | 4 types | Single lock (position) |
| **Blend Modes** | 27 modes | 16 most-used modes |
| **Layer Types** | 10+ types | 5 core types |

---

## AI Integration Status

### 🤖 **Layer-Aware AI Operations**

While layers themselves don't have direct AI adapters, all AI operations are layer-aware:

| Operation | Layer Support | How It Works |
|-----------|--------------|--------------|
| **Filter Application** | ✅ | AI applies filters to entire layers |
| **Selection-Based** | ✅ | AI respects layer boundaries in selections |
| **Multi-Layer** | ✅ | AI can target specific layers by content |
| **Non-Destructive** | ✅ | Filters added to layer's filter stack |
| **Adjustment Layers** | 🚧 | Backend ready, AI integration pending UI |

### 📋 **AI Capabilities with Layers**

The AI understands:
1. **Layer Context** - Applies operations to active layer
2. **Content Detection** - Can find which layer contains specific content
3. **Filter Stacking** - Adds filters without destroying existing ones
4. **Smart Targeting** - "Apply blur to background layer" works correctly
5. **Batch Operations** - Can apply same operation across multiple layers

### 🚫 **Current AI Limitations**

- Cannot create new layers (yet)
- Cannot reorder layers
- Cannot modify layer properties (opacity, blend modes)
- Cannot work with layer groups (pending implementation)

---

## Implementation Progress Tracker

### 🎯 High Priority Features (In Progress)

#### 1. Layer Groups 🚧
**Status**: In Progress
**Complexity**: Medium
**Requirements**:
- [x] Create/delete groups
- [x] Drag layers into/out of groups  
- [x] Nested groups support
- [x] Expand/collapse UI
- [ ] Group opacity control (needs rendering)
- [ ] Group blend modes (needs rendering)
- [ ] Group masks (needs implementation)
- [ ] Pass-through mode (needs implementation)

#### 2. Smart Objects ❌
**Status**: Not Started  
**Complexity**: High
**Requirements**:
- [ ] Container layer type
- [ ] Non-destructive transforms
- [ ] Non-destructive filters
- [ ] Double-click to edit contents
- [ ] Linked vs embedded
- [ ] Update all instances
- [ ] Convert to/from smart object

#### 3. Clipping Masks ❌
**Status**: Not Started
**Complexity**: Low
**Requirements**:
- [ ] Clip layer to layer below
- [ ] Multiple layers clip to same base
- [ ] Visual indicator in UI
- [ ] Keyboard shortcut (Alt+Click)
- [ ] Maintain individual blend modes
- [ ] Release clipping mask

#### 4. Adjustment Layer UI ❌
**Status**: Backend Ready, No UI
**Complexity**: Medium
**Requirements**:
- [ ] Create adjustment layer button/menu
- [ ] Adjustment type selector
- [ ] Properties panel for adjustments
- [ ] Double-click to edit
- [ ] Adjustment layer icons
- [ ] Preset adjustments

## Feature Comparison Matrix

### ✅ Implemented Features

| Feature | Photoshop | Our Implementation | Notes |
|---------|-----------|-------------------|-------|
| **Basic Layers** | ✓ | ✓ | Raster layers with objects |
| **Layer Opacity** | 0-100% | 0-100% | Full opacity control |
| **Blend Modes** | 27 modes | 16 modes | Missing: hue, saturation, color, luminosity |
| **Layer Visibility** | ✓ | ✓ | Eye icon toggle |
| **Layer Locking** | 4 types | Basic lock | Only position lock |
| **Layer Naming** | ✓ | ✓ | Editable layer names |
| **Layer Reordering** | ✓ | ✓ | Drag and drop |
| **Active Layer** | ✓ | ✓ | Single active layer |
| **Non-destructive Filters** | ✓ | ✓ | Filter stacks per layer |
| **Layer Masks** | ✓ | Partial | Basic structure, no UI |

### 🚧 Partially Implemented

| Feature | Photoshop | Our Implementation | Missing |
|---------|-----------|-------------------|---------|
| **Adjustment Layers** | Full suite | Basic structure | No UI, limited types |
| **Layer Effects** | 10+ effects | 6 effects | Satin, Color/Gradient/Pattern Overlay |
| **Text Layers** | Editable | Objects in layers | Not true text layers |
| **Filter Masks** | ✓ | Backend only | No UI for mask editing |

### ❌ Not Implemented

| Feature | Photoshop | Priority | Complexity |
|---------|-----------|----------|------------|
| **Layer Groups** | Nested folders | High | Medium |
| **Smart Objects** | Non-destructive containers | High | High |
| **Clipping Masks** | Layer-to-layer masking | High | Low |
| **Fill Layers** | Solid/Gradient/Pattern | Medium | Low |
| **Shape Layers** | Vector shapes | Medium | Medium |
| **Layer Comps** | State snapshots | Low | Medium |
| **Opacity vs Fill** | Separate controls | Low | Low |
| **Advanced Blending** | Blend If sliders | Low | High |
| **Color Tags** | Organizational | Low | Low |
| **Vector Masks** | Path-based masks | Medium | High |
| **Lock Types** | Transparent/Image/Position/All | Low | Low |
| **Quick Mask Mode** | Visual mask editing | Medium | Medium |

## Implementation Details

### Current Layer Structure
```typescript
interface Layer {
  id: string
  name: string
  type: 'raster' | 'vector' | 'adjustment' | 'text' | 'group'
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  konvaLayer: Konva.Layer
  objects: CanvasObject[]
  parentId?: string // For groups
  mask?: LayerMask
  filterStack?: FilterStack
}
```

### Layer Effects Implementation
```typescript
// Currently implemented
- Drop Shadow ✅
- Inner Shadow ✅
- Outer Glow ✅
- Inner Glow ✅
- Bevel & Emboss ✅
- Stroke ✅

// Missing
- Satin
- Color Overlay
- Gradient Overlay
- Pattern Overlay
- Contour (for bevel/glow)
- Texture (for bevel)
```

### Blend Modes Status
```typescript
// Implemented (16)
✅ normal, multiply, screen, overlay
✅ darken, lighten, color-dodge, color-burn
✅ hard-light, soft-light, difference, exclusion

// Missing (11) - Browser limitations
❌ hue, saturation, color, luminosity
❌ dissolve, linear-dodge, linear-burn
❌ vivid-light, linear-light, pin-light, hard-mix
```

## Technical Architecture

### Event System Integration
- Layer events use TypedEventBus
- All changes emit events for history
- Filter stack changes tracked
- Mask updates tracked

### Performance Considerations
- Konva.Layer for each layer
- Filter results cached
- Blend modes use globalCompositeOperation
- Layer clipping for canvas bounds

## Implementation Roadmap

### Phase 1: Layer Groups (Current Focus)
1. Add group type to Layer interface ✅
2. Implement parent/child relationships
3. Update UI for tree structure
4. Add expand/collapse state
5. Implement group rendering
6. Add group blend modes
7. Test nested groups

### Phase 2: Smart Objects
1. Design SmartObject layer type
2. Implement container system
3. Add transform preservation
4. Create edit mode UI
5. Handle filter preservation
6. Implement instance updates

### Phase 3: Clipping Masks
1. Add clipping property to layers
2. Implement clipping render logic
3. Update UI indicators
4. Add keyboard shortcuts
5. Handle clipping chains

### Phase 4: Adjustment Layer UI
1. Create adjustment layer menu
2. Build properties panels
3. Add adjustment presets
4. Implement live preview
5. Add adjustment icons

## UI/UX Requirements

### Layer Panel Enhancements
- Tree view for groups
- Clipping mask indicators
- Smart object badges
- Adjustment layer icons
- Multi-select support
- Context menus

### New UI Components
- New Layer menu (types)
- Adjustment properties panel
- Smart object edit mode
- Group management tools

## Testing Requirements

### Layer Groups
- Nested group rendering
- Blend mode inheritance
- Opacity calculations
- Performance with deep nesting

### Smart Objects
- Transform quality preservation
- Filter stack preservation
- Memory usage optimization
- Edit mode transitions

### Clipping Masks
- Multiple clip layers
- Blend mode interactions
- Performance impact
- UI clarity

## Next Steps

1. **Start with Layer Groups** (lowest complexity, highest impact)
2. **Then Clipping Masks** (builds on groups)
3. **Then Adjustment UI** (backend exists)
4. **Finally Smart Objects** (most complex)

## Progress Log

### 2024-01-XX
- Created parity tracking documents (filters_ps_parity.md, layer_ps_parity.md)
- Analyzed current implementation
- Prioritized feature roadmap
- Layer Groups implementation:
  - ✅ Added group type to Layer interface
  - ✅ Created LayerTree component with nested rendering
  - ✅ Added expand/collapse functionality
  - ✅ Implemented drag & drop into groups
  - ✅ Added layer parent/child relationships
  - ✅ Created group creation UI
  - ✅ Added TypedEventBus events for groups
  - ⏳ Still need: group rendering, opacity/blend inheritance, masks, pass-through mode

### What's Complete
- Basic layer group structure and UI
- Tree view with expand/collapse
- Drag layers into/out of groups
- Nested groups support
- Event system integration

### What's Remaining
- Group rendering (currently groups don't affect child rendering)
- Group opacity/blend mode inheritance
- Group masks
- Pass-through blend mode
- Performance optimization for deep nesting 