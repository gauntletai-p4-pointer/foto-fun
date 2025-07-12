# Foundational Type & Lint Eradication Plan

**Objective:** To achieve a 100% clean, zero-error codebase by systematically eliminating all remaining TypeScript and ESLint errors. This is the final step to solidify our foundation before full-scale tool and adapter implementation begins.

**Execution Strategy:** This plan is divided into two parallel workstreams for two independent agents. Agent 1 will focus on the core foundational infrastructure (State, Managers, Events), while Agent 2 will tackle the application layer (Tools, AI, UI).

---

## AGENT 1: Core Infrastructure & State Management

**Goal:** Stabilize the absolute heart of the application. Your work will unblock Agent 2.

### Task 1.1: Fix the `EventToolStore`
-   **File:** `lib/store/tools/EventToolStore.ts`
-   **Analysis:** This core store is still using outdated `BaseTool` APIs, calling non-existent methods (`transitionTo`) and incorrect lifecycle method signatures (`onActivate`/`onDeactivate`). It also has several `any` types.
-   **Action Plan:**
    1.  Remove all calls to `tool.transitionTo()`. State is now managed internally by `BaseTool`.
    2.  Correct all calls to `tool.onActivate(this.dependencies.canvasManager)` and `tool.onDeactivate(this.dependencies.canvasManager)`, passing the required `canvasManager` instance.
    3.  Remove all access to protected members like `instanceId`. This information should come from tool events.
    4.  Eliminate all `any` types, providing explicit types for event payloads and tool options.
    5.  Fix the incorrect `ToolFactory` method calls (`canCreateTool`, `getAvailableTools`). This logic must be replaced by querying the `ToolRegistry`.

### Task 1.2: Stabilize the `Selection` & `Canvas` Systems
-   **Files:**
    -   `lib/store/selection/EventSelectionStore.ts`
    -   `lib/store/canvas/TypedCanvasStore.ts`
    -   `lib/editor/selection/SelectionManager.ts`
    -   `lib/editor/canvas/CanvasManager.ts` (and its dependencies `Compositor.ts`, `RenderPipeline.ts`)
    -   `lib/events/canvas/SelectionEvents.ts`
-   **Analysis:** A cascade of errors exists here. `SelectionManager` is calling a non-existent `canvasManager.getViewport()`. The `selection.cleared` event is being emitted with the wrong payload. `TypedCanvasStore` and `EventSelectionStore` have `null`/`undefined` mismatches. `Compositor` and `RenderPipeline` are accessing properties that no longer exist on the migrated `CanvasManager`.
-   **Action Plan:**
    1.  **`SelectionManager`:** Remove the `getViewport` call. The selection logic must be updated to use the new camera/viewport system provided by `CanvasManager`.
    2.  **`SelectionEvents`:** Correct the `selection.cleared` event payload to include all required properties (`canvasId`, `clearedSelection`). Fix the type comparison errors for selection types.
    3.  **Stores:** Resolve the `null`/`undefined` conflicts in `EventSelectionStore` and `TypedCanvasStore`. Ensure strict type safety for the `Selection` state.
    4.  **`CanvasManager` & dependencies:** Remove all access to legacy properties (`contentLayer`, `getNode`, `addObject`). Refactor the render and compositing logic to use the new object management and rendering APIs.

### Task 1.3: Unify the `Filter` System
-   **Files:**
    -   `lib/editor/filters/FilterManager.ts`
    -   `lib/editor/filters/ObjectFilterManager.ts`
    -   `lib/editor/filters/WebGLFilterEngine.ts`
    -   `lib/events/canvas/ObjectEvents.ts`
-   **Analysis:** The `Filter` type is inconsistent across the application, leading to assignment errors. The `filter.applied` event payload in `ObjectEvents` is incorrect.
-   **Action Plan:**
    1.  Create a single, authoritative `Filter` interface in `types/index.ts` and use it everywhere.
    2.  Update `FilterManager`, `ObjectFilterManager`, and `WebGLFilterEngine` to use this unified type.
    3.  Correct the payload for the `filter.applied` and related events in `ObjectEvents.ts`.

### Task 1.4: Fix Miscellaneous Core Services
-   **Files:**
    -   `lib/editor/clipboard/ClipboardManager.ts`
    -   `lib/editor/persistence/ProjectSerializer.ts`
    -   `lib/editor/export/ExportManager.ts`
    -   `lib/editor/fonts/FontManager.ts`
-   **Analysis:** These services have various event payload and method call errors.
-   **Action Plan:**
    1.  **`ClipboardManager`:** Correct the calls to `canvasManager` to use the new object creation methods.
    2.  **`ProjectSerializer`/`ExportManager`:** Fix the event payloads to match the definitions in the `EventRegistry`.
    3.  **`FontManager`:** Add the required `timestamp` property to the `text.font.used` event emission.

---

## AGENT 2: Application Layer, Tools & AI

**Goal:** Eradicate all remaining errors in the concrete implementations and UI layer. You can begin work in parallel with Agent 1.

### Task 2.1: Refactor All Legacy Tools
-   **Files:**
    -   `lib/editor/tools/transform/MoveTool.ts`
    -   `lib/editor/tools/drawing/BrushTool.ts`
    -   `lib/editor/tools/base/NavigationTool.ts`
    -   `lib/editor/tools/base/TransformTool.ts`
-   **Analysis:** These are the biggest offenders. They are still structured like old tools, calling non-existent methods (`canHandleEvents`, `transitionTo`, `getCommandContext`) and using incorrect constructors.
-   **Action Plan:**
    1.  Rewrite each tool to correctly `extend` its proper base class (`BaseTool`, `TransformTool`).
    2.  Implement the required `onActivate` and `onDeactivate` methods.
    3.  Remove all calls to legacy methods.
    4.  Use the correct `super()` constructor signature (`super(id, dependencies)`).
    5.  Fix all React `no-children-prop` errors in `MoveTool` by using JSX composition.

### Task 2.2: Fix the AI System & Adapters
-   **Files:**
    -   `lib/ai/**/*`
    -   `app/api/ai/chat/route.ts`
-   **Analysis:** The AI system is plagued with `any` types, has an inconsistent `CanvasContext` type, and contains a critical import error for the `AdapterRegistry`.
-   **Action Plan:**
    1.  **`AdapterRegistry`:** Fix the import in `alternatives.ts` from `{ adapterRegistry }` to `const { AdapterRegistry } = require(...)` or a proper singleton instance export. *This is a top priority.*
    2.  **`CanvasContext`:** Resolve the type conflict between `lib/ai/tools/canvas-bridge` and `lib/ai/adapters/types`. Create one unified `CanvasContext` and use it consistently.
    3.  **Eliminate `any`:** Go through every file in `lib/ai` and replace all `any` types with strongly-typed interfaces (e.g., for `ParameterConverter`, `AdapterBehavior`, `AdapterDependencies`).
    4.  **`ImageGenerationAdapter`:** Fix the incorrect event name and payload for the generation failed event.

### Task 2.3: Repair UI Panels & Components
-   **Files:**
    -   `components/editor/Panels/ParagraphPanel/**/*`
    -   `components/editor/Canvas/index.tsx`
-   **Analysis:** The `ParagraphPanel` components are calling `getMetadataValue` with an incorrect number of arguments. The `Canvas` component has several unused imports.
-   **Action Plan:**
    1.  **`ParagraphPanel`:** Correct all calls to `getMetadataValue` to pass the expected two arguments.
    2.  **`Canvas/index.tsx`:** Remove all unused imports (`createToolEvent`, `TOOL_IDS`, etc.).

### Task 2.4: Overhaul `EnhancedTextWarp`
-   **File:** `lib/editor/text/effects/EnhancedTextWarp.ts`
-   **Analysis:** This file is fundamentally broken. It attempts to extend a non-existent `Effect` class and calls dozens of methods that do not exist on Konva nodes. It needs a complete rewrite.
-   **Action Plan:**
    1.  Rewrite the class from scratch.
    2.  It should not extend any class unless a new `BaseEffect` class is created.
    3.  All direct property access on the `textNode` must be replaced with the correct Konva `get...()` methods (e.g., `textNode.getAttr('text')` instead of `textNode.text()`).
    4.  Ensure the final returned `TextObject` correctly matches the interface.

### Task 2.5: Final `AppInitializer` Cleanup
-   **File:** `lib/core/AppInitializer.ts`
-   **Analysis:** Contains unused imports and forbidden `require()` statements.
-   **Action Plan:**
    1.  Remove all unused imports (`ProjectSerializer`, `ExportManager`, etc.).
    2.  Replace the `require()` calls with standard ES6 `import` statements. 