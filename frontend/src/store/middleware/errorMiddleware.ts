import { Middleware, AnyAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Error middleware for handling and logging errors consistently
export const errorMiddleware: Middleware = (store) => (next) => (action: any) => {
  // Handle rejected async thunk actions
  if (typeof action.type === 'string' && action.type.endsWith('/rejected')) {
    const error = action.payload || (action.error as any)?.message || 'Unknown error occurred';
    
    // Log error for debugging
    console.error(`Redux Error [${action.type}]:`, error);
    
    // Handle specific error types
    if (action.type.includes('auth') && typeof error === 'string' && error.includes('401')) {
      // Handle authentication errors
      console.warn('Authentication error detected, user may need to re-login');
      // Could dispatch logout action here if auth slice existed
    }
    
    if (action.type.includes('network') || (typeof error === 'string' && error.includes('fetch'))) {
      // Handle network errors
      console.warn('Network error detected:', error);
      // Could show network error toast here
    }
    
    // Handle SSE connection errors
    if (action.type.includes('SSE') || action.type.includes('stream')) {
      console.warn('SSE/Streaming error detected:', error);
      // Could trigger reconnection logic here
    }
  }
  
  // Handle successful actions that might need side effects
  if (typeof action.type === 'string' && action.type.endsWith('/fulfilled')) {
    // Log successful operations in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Redux Success [${action.type}]:`, action.payload);
    }
  }
  
  return next(action);
};

// Error boundary helper for React components
export class ReduxErrorBoundary extends Error {
  constructor(
    message: string,
    public readonly action: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ReduxErrorBoundary';
  }
}

// Helper function to create standardized error objects
export const createErrorAction = (type: string, error: unknown) => ({
  type: `${type}/rejected`,
  payload: error instanceof Error ? error.message : String(error),
  error: true,
});

// Helper function to safely dispatch actions with error handling
export const safeDispatch = (dispatch: any, action: any) => {
  try {
    return dispatch(action);
  } catch (error) {
    console.error('Error dispatching action:', error);
    dispatch(createErrorAction(action.type, error));
    throw error;
  }
};