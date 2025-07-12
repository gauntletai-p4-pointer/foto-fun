// STUB: AI client disabled during refactor
export const ClientToolExecutor = {
  execute: (toolName: string, params?: any) => {
    console.warn('AI tools disabled during refactor - execute:', toolName, params);
    return Promise.resolve({
      success: false,
      error: 'AI tools disabled during refactor'
    });
  }
};
