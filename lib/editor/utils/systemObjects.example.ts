/**
 * Example: How to use the system object utilities
 * 
 * System objects are UI overlays and tools that should not be treated as user content.
 * They cannot be selected, exported, or manipulated by users.
 */

import type { Canvas, FabricObject } from 'fabric'
import { Rect, Path, Group, ActiveSelection } from 'fabric'
import { markAsSystemObject, isSystemObject, filterOutSystemObjects } from './systemObjects'
import { SystemObjectType } from '@/types/fabric'

// Example 1: Creating a selection overlay
function createSelectionOverlay(canvas: Canvas) {
  const selectionRect = new Rect({
    left: 50,
    top: 50,
    width: 200,
    height: 100,
    fill: 'transparent',
    stroke: '#0066ff',
    strokeWidth: 1,
    strokeDashArray: [5, 5]
  })
  
  // Mark as system object - this automatically sets:
  // - selectable: false
  // - evented: false  
  // - excludeFromExport: true
  // - isSystemObject: true
  // - systemObjectType: 'selection_overlay'
  markAsSystemObject(selectionRect, SystemObjectType.SELECTION_OVERLAY)
  
  canvas.add(selectionRect)
}

// Example 2: Creating tool feedback (e.g., for crop tool)
function createCropOverlay(canvas: Canvas) {
  const cropRect = new Rect({
    left: 0,
    top: 0,
    width: canvas.width,
    height: canvas.height,
    fill: 'rgba(0, 0, 0, 0.5)',
    stroke: 'white',
    strokeWidth: 2,
    strokeDashArray: [10, 5]
  })
  
  markAsSystemObject(cropRect, SystemObjectType.CROP_OVERLAY)
  canvas.add(cropRect)
}

// Example 3: Creating temporary tool feedback
function createToolFeedback(canvas: Canvas) {
  const feedback = new Path('M 10 10 L 100 100 L 200 50 Z', {
    fill: 'rgba(0, 120, 255, 0.3)',
    stroke: '#007AFF',
    strokeWidth: 2
  })
  
  markAsSystemObject(feedback, SystemObjectType.TOOL_FEEDBACK)
  canvas.add(feedback)
}

// Example 4: Filtering out system objects from selections
function handleAreaSelection(canvas: Canvas, selectedObjects: FabricObject[]) {
  // Filter out any system objects from the selection
  const userObjects = filterOutSystemObjects(selectedObjects)
  
  if (userObjects.length === 0) {
    // All selected objects were system objects
    canvas.discardActiveObject()
  } else if (userObjects.length === 1) {
    // Single user object
    canvas.setActiveObject(userObjects[0])
  } else {
    // Multiple user objects - create a group
    const activeSelection = new ActiveSelection(userObjects, { canvas })
    canvas.setActiveObject(activeSelection)
  }
}

// Example 5: Checking if an object is a system object
function handleObjectClick(object: FabricObject) {
  if (isSystemObject(object)) {
    console.log('Clicked on a system object - ignoring')
    return
  }
  
  console.log('Clicked on a user object - processing')
  // Handle user object click...
}

// Example 6: Clean up all system objects of a specific type
function clearAllSelectionOverlays(canvas: Canvas) {
  // This is done automatically by the removeSystemObjectsOfType utility
  // removeSystemObjectsOfType(canvas, SystemObjectType.SELECTION_OVERLAY)
  
  // Or manually:
  const objectsToRemove: FabricObject[] = []
  
  canvas.forEachObject((obj) => {
    const fabricObj = obj as FabricObject
    if (isSystemObject(fabricObj) && 
        (fabricObj as any).systemObjectType === SystemObjectType.SELECTION_OVERLAY) {
      objectsToRemove.push(fabricObj)
    }
  })
  
  objectsToRemove.forEach(obj => canvas.remove(obj))
}

// Example 7: Creating a complex system object (group)
function createMarchingAnts(canvas: Canvas) {
  const path = 'M 0 0 L 100 0 L 100 100 L 0 100 Z'
  
  const whiteBg = new Path(path, {
    fill: '',
    stroke: 'white',
    strokeWidth: 3
  })
  
  const blackDashed = new Path(path, {
    fill: '',
    stroke: 'black',
    strokeWidth: 1,
    strokeDashArray: [5, 5]
  })
  
  const group = new Group([whiteBg, blackDashed])
  
  // Mark the entire group as a system object
  markAsSystemObject(group, SystemObjectType.SELECTION_OVERLAY)
  
  canvas.add(group)
  
  // Animate the marching ants
  let offset = 0
  const animate = () => {
    offset = (offset + 1) % 10
    blackDashed.set('strokeDashOffset', -offset)
    canvas.requestRenderAll()
    requestAnimationFrame(animate)
  }
  animate()
} 