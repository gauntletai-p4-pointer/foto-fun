// Re-export EventBasedToolChain from the main events module
// This maintains compatibility for imports from the AI module path
export {
  EventBasedToolChain,
  type ToolChainOptions,
  type ToolExecutionResult
} from '@/lib/events/execution/EventBasedToolChain'