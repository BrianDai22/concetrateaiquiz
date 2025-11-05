/**
 * Custom test utilities for React component testing
 * Provides render functions with providers and mock factories
 */
import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import type { User } from '@/types/auth';

/**
 * Custom render function with providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuth?: {
    user?: User | null;
    isLoading?: boolean;
  };
}

/**
 * Render component without any providers (for testing UI components in isolation)
 */
export function render(ui: React.ReactElement, options?: RenderOptions) {
  return rtlRender(ui, options);
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
