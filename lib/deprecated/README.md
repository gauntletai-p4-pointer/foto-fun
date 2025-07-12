# Deprecated Tool System

This directory contains the old tool system that was deprecated during the complete tool system refactor.

## What's Here

- `tools/editor-tools/` - Original editor tools
- `ai/tools/` - Original AI tools  
- `ai/adapters/` - Original AI adapters
- Other tool-related files

## Why Deprecated

The entire tool system was rebuilt from scratch with:
- Proper state machine implementation
- Race condition prevention
- Memory leak protection
- Command-first architecture
- Event-driven communication
- Dependency injection

## Reference Only

These files are preserved for reference but should NOT be used. 
See `docs/tool-start-fresh.md` for the new architecture.

## Deprecation Date

$(date)
