-include grouping tool (group command, group tool adapter)

Current State
No Group Tool: There's no dedicated grouping tool in the codebase
No Group Command: No command exists to group/ungroup objects
No AI Adapter: No AI adapter for grouping functionality
What Exists
Fabric.js has a Group class (imported in SelectionRenderer.ts)
The canvas selection manager can select multiple objects
Composite commands exist for multi-step operations
What Would Be Needed
To enable AI grouping, we would need:
Create a Group Command:

Create a Group Tool Adapter:

