# PROPOSAL-001: Object-Aware Pixel Selection System

**Status**: 🟡 Draft  
**Priority**: P1 (Major feature enhancement)  
**Created**: 2024-12-28  
**Author**: AI Assistant  
**Impact**: High - Transforms FotoFun from a drawing app to a proper image editor

## Executive Summary

The current selection system in FotoFun operates on the entire canvas, making it impossible to select and edit specific regions within individual images or layers. This proposal outlines a comprehensive solution to implement object-aware pixel selection, enabling professional image editing capabilities.

## Problem Statement

### Current Limitations

1. **Canvas-Wide Selection Only**
   - Selections apply to the entire flattened canvas
   - Cannot select pixels within a specific image/layer
   - No awareness of object boundaries

2. **Indiscriminate Filter Application**
   - Filters apply to ALL images on canvas
   - Cannot apply effects to selected regions only
   - No per-layer masking capability

3. **Architectural Mismatch**
   - Fabric.js (object-based) vs Selection system (pixel-based)
   - No communication between the two systems
   - Objects and selections exist in separate universes

### User Impact

- Cannot perform basic photo editing tasks (select and edit parts of an image)
- Cannot work with multiple images effectively
- Selection tools are essentially decorative, not functional
- Severely limits the app's usefulness as an image editor

## Proposed Solution

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Canvas Manager                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Fabric Canvas   │  │ Selection Layer │                  │
│  │  (Objects)       │  │   (Per-Object)  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│           │                     │                            │
│           └─────────┬───────────┘                            │
│                     │                                        │
│              ┌──────┴──────┐                                │
│              │   Object     │                                │
│              │   Registry   │                                │
│              └─────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Object Registry System

**Purpose**: Track relationships between canvas pixels and objects

```typescript
interface ObjectRegistry {
  // Map pixel coordinates to object IDs
  pixelToObject: Map<string, string> // "x,y" -> objectId
  
  // Cache object bounds for performance
  objectBounds: Map<string, BoundingBox>
  
  // Track object render order
  renderOrder: string[] // objectIds in z-order
  
  // Methods
  updatePixelMap(): void
  getObjectAtPixel(x: number, y: number): FabricObject | null
  getObjectPixels(objectId: string): ImageData
}
```

#### 2. Layer-Aware Selection Manager

**Purpose**: Manage selections per object/layer instead of globally

```typescript
interface LayerAwareSelectionManager extends SelectionManager {
  // Per-object selection masks
  objectSelections: Map<string, PixelSelection>
  
  // Active object for selection
  activeObjectId: string | null
  
  // Selection mode
  mode: 'global' | 'object' | 'layer'
  
  // Methods
  createObjectSelection(objectId: string, mask: ImageData): void
  getObjectSelection(objectId: string): PixelSelection | null
  applySelectionToObject(objectId: string, operation: SelectionOperation): void
}
```

#### 3. Object Pixel Cache

**Purpose**: Efficiently access pixel data for individual objects

```typescript
interface ObjectPixelCache {
  // Cache rendered object pixels
  cache: Map<string, {
    imageData: ImageData
    bounds: BoundingBox
    timestamp: number
  }>
  
  // Methods
  getObjectPixels(object: FabricObject): ImageData
  invalidateObject(objectId: string): void
  renderObjectToPixels(object: FabricObject): ImageData
}
```

### Implementation Strategy

#### Phase 1: Foundation (Week 1-2)

1. **Create Object Registry**
   ```typescript
   // store/objectRegistryStore.ts
   export const useObjectRegistryStore = create<ObjectRegistryStore>((set, get) => ({
     pixelMap: new Map(),
     objectBounds: new Map(),
     
     updatePixelMap: () => {
       const { fabricCanvas } = useCanvasStore.getState()
       if (!fabricCanvas) return
       
       const newPixelMap = new Map()
       const newBounds = new Map()
       
       // Render each object to determine pixel ownership
       fabricCanvas.getObjects().forEach((obj, index) => {
         const bounds = obj.getBoundingRect()
         newBounds.set(obj.id, bounds)
         
         // Create temporary canvas for object
         const tempCanvas = document.createElement('canvas')
         // ... render object and map pixels
       })
       
       set({ pixelMap: newPixelMap, objectBounds: newBounds })
     }
   }))
   ```

2. **Extend Selection Manager**
   ```typescript
   // lib/editor/selection/LayerAwareSelectionManager.ts
   export class LayerAwareSelectionManager extends SelectionManager {
     private objectSelections = new Map<string, PixelSelection>()
     private activeObjectId: string | null = null
     
     setActiveObject(objectId: string | null) {
       this.activeObjectId = objectId
     }
     
     createSelection(x: number, y: number, width: number, height: number, mode: SelectionMode) {
       if (this.activeObjectId) {
         // Create selection within object bounds
         const objectBounds = this.getObjectBounds(this.activeObjectId)
         // Clip selection to object
       } else {
         // Fall back to canvas-wide selection
         super.createSelection(x, y, width, height, mode)
       }
     }
   }
   ```

#### Phase 2: Tool Integration (Week 3-4)

1. **Update Selection Tools**
   ```typescript
   // lib/editor/tools/base/SelectionTool.ts
   protected handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
     const pointer = this.canvas!.getPointer(e.e)
     
     // Determine which object was clicked
     const objectRegistry = useObjectRegistryStore.getState()
     const targetObject = objectRegistry.getObjectAtPixel(pointer.x, pointer.y)
     
     if (targetObject) {
       // Set active object for selection
       this.selectionManager.setActiveObject(targetObject.id)
       
       // Show visual indicator
       this.showObjectSelectionMode(targetObject)
     }
     
     // Continue with selection creation
     super.handleMouseDown(e)
   }
   ```

2. **Add Selection Mode Toggle**
   ```typescript
   // New tool option for selection tools
   {
     id: 'selectionTarget',
     type: 'select',
     label: 'Selection Target',
     value: 'auto',
     props: {
       options: [
         { value: 'auto', label: 'Auto (Smart)' },
         { value: 'canvas', label: 'Entire Canvas' },
         { value: 'object', label: 'Current Object' },
         { value: 'layer', label: 'Active Layer' }
       ]
     }
   }
   ```

#### Phase 3: Filter Integration (Week 5-6)

1. **Update Filter Application**
   ```typescript
   // lib/editor/tools/filters/FilterBase.ts
   protected applyFilter(filter: fabric.IBaseFilter) {
     const { selectionManager } = useCanvasStore.getState()
     const activeObjectId = selectionManager.getActiveObjectId()
     
     if (activeObjectId && selectionManager.hasObjectSelection(activeObjectId)) {
       // Apply filter only to selected pixels within object
       this.applyFilterToSelection(activeObjectId, filter)
     } else if (selectionManager.hasGlobalSelection()) {
       // Apply to global selection
       this.applyFilterToGlobalSelection(filter)
     } else {
       // Apply to all relevant objects
       this.applyFilterToAllObjects(filter)
     }
   }
   ```

2. **Implement Masked Filter Application**
   ```typescript
   private applyFilterToSelection(objectId: string, filter: fabric.IBaseFilter) {
     const object = this.canvas.getObjectById(objectId)
     if (!object || !(object instanceof FabricImage)) return
     
     const selection = this.selectionManager.getObjectSelection(objectId)
     if (!selection) return
     
     // Create custom filter that respects selection mask
     const maskedFilter = new MaskedFilter(filter, selection.mask)
     
     // Apply to object
     object.filters = [...(object.filters || []), maskedFilter]
     object.applyFilters()
   }
   ```

#### Phase 4: UI/UX Enhancements (Week 7-8)

1. **Visual Indicators**
   - Highlight active object/layer when in object selection mode
   - Show selection bounds relative to object
   - Display selection mode in status bar

2. **Layer Panel Integration**
   - Click layer to set as selection target
   - Show selection indicator on layers with active selections
   - Context menu for selection operations per layer

3. **Keyboard Shortcuts**
   - Ctrl+Click: Toggle between object/canvas selection
   - Shift+Click: Add object to selection targets
   - Alt+Click: Sample object for selection

### Technical Considerations

#### Performance Optimization

1. **Pixel Map Caching**
   - Update pixel map only when objects change
   - Use spatial indexing (quadtree) for large canvases
   - Defer updates during continuous operations

2. **Lazy Evaluation**
   - Don't compute full pixel maps until needed
   - Use bounding box tests first
   - Cache frequently accessed object pixels

3. **Memory Management**
   - Limit cache size based on available memory
   - Implement LRU eviction for pixel caches
   - Clear caches on object deletion

#### Backward Compatibility

1. **Graceful Degradation**
   - Maintain existing global selection behavior
   - Add object-aware features as enhancement
   - Provide migration path for saved projects

2. **API Compatibility**
   - Extend existing interfaces rather than replace
   - Keep current method signatures
   - Add new methods for object-aware operations

### Benefits

1. **Professional Editing Capabilities**
   - Select and edit portions of images
   - Work with multiple images/layers effectively
   - Apply effects to specific regions

2. **Improved User Experience**
   - Intuitive selection behavior
   - Visual feedback for selection context
   - Flexible selection modes

3. **Foundation for Advanced Features**
   - Layer masks
   - Adjustment layers
   - Non-destructive editing
   - Smart selections

### Risks and Mitigation

1. **Performance Impact**
   - Risk: Pixel mapping could be slow for complex scenes
   - Mitigation: Implement efficient caching and spatial indexing

2. **Memory Usage**
   - Risk: Storing per-object selections increases memory
   - Mitigation: Implement memory limits and cleanup strategies

3. **Complexity Increase**
   - Risk: More complex codebase and interactions
   - Mitigation: Comprehensive testing and documentation

### Alternative Approaches Considered

1. **Full Pixel-Based Canvas**
   - Pros: True pixel-level control
   - Cons: Lose Fabric.js benefits, complete rewrite

2. **Hybrid Canvas Approach**
   - Pros: Best of both worlds
   - Cons: Complex synchronization, double memory usage

3. **SVG Masking**
   - Pros: Vector-based, efficient
   - Cons: Limited pixel-level control, browser compatibility

### Success Metrics

1. **Functional**
   - [ ] Can select pixels within specific image
   - [ ] Filters apply only to selected regions
   - [ ] Selection tools respect object boundaries
   - [ ] Multiple selection modes work correctly

2. **Performance**
   - [ ] Selection creation < 50ms for typical images
   - [ ] No noticeable lag when switching modes
   - [ ] Memory usage increases < 20% on average

3. **User Experience**
   - [ ] Intuitive selection behavior
   - [ ] Clear visual feedback
   - [ ] Smooth workflow integration

### Implementation Timeline

- **Week 1-2**: Foundation - Object Registry
- **Week 3-4**: Tool Integration
- **Week 5-6**: Filter Integration  
- **Week 7-8**: UI/UX Polish
- **Week 9-10**: Testing and Optimization
- **Week 11-12**: Documentation and Release

Total estimated effort: 3 months

### Next Steps

1. **Technical Review**: Gather feedback on proposed architecture
2. **Prototype**: Build proof-of-concept for core components
3. **User Testing**: Validate UX approach with target users
4. **Resource Planning**: Allocate development resources
5. **Implementation**: Begin phased development

## Conclusion

Implementing object-aware pixel selection would transform FotoFun from a basic drawing application into a capable image editor. While this is a significant undertaking, the modular approach allows for incremental development and testing. The benefits far outweigh the complexity, providing users with professional image editing capabilities while maintaining the simplicity of Fabric.js for object manipulation.

This enhancement would position FotoFun as a serious alternative to traditional image editors, combining the best of vector and raster editing in a modern web application. 