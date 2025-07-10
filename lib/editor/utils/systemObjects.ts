import type { FabricObject, Canvas } from 'fabric'
import type { CustomFabricObject, SystemObjectType } from '@/types/fabric'

/**
 * Mark an object as a system object
 * System objects are UI overlays and tools, not user content
 */
export function markAsSystemObject(
  object: FabricObject,
  type: SystemObjectType
): void {
  const customObject = object as CustomFabricObject
  
  // Mark as system object
  customObject.isSystemObject = true
  customObject.systemObjectType = type
  
  // Also set common properties for system objects
  object.selectable = false
  object.evented = false
  object.excludeFromExport = true
}

/**
 * Check if an object is a system object
 */
export function isSystemObject(object: FabricObject): boolean {
  const customObject = object as CustomFabricObject
  return customObject.isSystemObject === true
}

/**
 * Get the type of system object
 */
export function getSystemObjectType(object: FabricObject): SystemObjectType | undefined {
  const customObject = object as CustomFabricObject
  return customObject.systemObjectType
}

/**
 * Filter out system objects from an array
 */
export function filterOutSystemObjects(objects: FabricObject[]): FabricObject[] {
  return objects.filter(obj => !isSystemObject(obj))
}

/**
 * Check if an object is user content (not a system object)
 */
export function isUserObject(object: FabricObject): boolean {
  return !isSystemObject(object)
}

/**
 * Remove all system objects of a specific type from canvas
 */
export function removeSystemObjectsOfType(
  canvas: Canvas,
  type: SystemObjectType
): void {
  const objectsToRemove: FabricObject[] = []
  
  canvas.forEachObject((obj) => {
    const fabricObj = obj as FabricObject
    if (getSystemObjectType(fabricObj) === type) {
      objectsToRemove.push(fabricObj)
    }
  })
  
  objectsToRemove.forEach(obj => canvas.remove(obj))
}

/**
 * Get all system objects from canvas
 */
export function getSystemObjects(canvas: Canvas): CustomFabricObject[] {
  const systemObjects: CustomFabricObject[] = []
  
  canvas.forEachObject((obj) => {
    const fabricObj = obj as FabricObject
    if (isSystemObject(fabricObj)) {
      systemObjects.push(fabricObj as CustomFabricObject)
    }
  })
  
  return systemObjects
} 