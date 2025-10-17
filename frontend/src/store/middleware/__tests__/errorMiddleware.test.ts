import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { errorMiddleware, ReduxErrorBoundary, createErrorAction, safeDispatch } from '../errorMiddleware';
import projectsReducer from '../../slices/projectsSlice';

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};
global.console = mockConsole as any;

describe('errorMiddleware', () => {
  let store: any;

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: {
        projects: projectsReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(errorMiddleware),
    });
  });

  it('should log errors for rejected actions', () => {
    const rejectedAction = {
      type: 'projects/fetchProjects/rejected',
      payload: 'Failed to fetch projects',
    };

    store.dispatch(rejectedAction);

    expect(mockConsole.error).toHaveBeenCalledWith(
      'Redux Error [projects/fetchProjects/rejected]:',
      'Failed to fetch projects'
    );
  });

  it('should handle authentication errors', () => {
    const authRejectedAction = {
      type: 'auth/login/rejected',
      payload: 'Authentication failed: 401',
    };

    store.dispatch(authRejectedAction);

    expect(mockConsole.error).toHaveBeenCalledWith(
      'Redux Error [auth/login/rejected]:',
      'Authentication failed: 401'
    );
    expect(mockConsole.warn).toHaveBeenCalledWith(
      'Authentication error detected, user may need to re-login'
    );
  });

  it('should handle network errors', () => {
    const networkRejectedAction = {
      type: 'projects/fetchProjects/rejected',
      payload: 'Network fetch failed',
    };

    store.dispatch(networkRejectedAction);

    expect(mockConsole.warn).toHaveBeenCalledWith(
      'Network error detected:',
      'Network fetch failed'
    );
  });

  it('should handle SSE errors', () => {
    const sseRejectedAction = {
      type: 'chat/handleSSE/rejected',
      payload: 'SSE connection lost',
    };

    store.dispatch(sseRejectedAction);

    expect(mockConsole.warn).toHaveBeenCalledWith(
      'SSE/Streaming error detected:',
      'SSE connection lost'
    );
  });

  it('should log successful actions in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const fulfilledAction = {
      type: 'projects/fetchProjects/fulfilled',
      payload: [],
    };

    store.dispatch(fulfilledAction);

    expect(mockConsole.log).toHaveBeenCalledWith(
      'Redux Success [projects/fetchProjects/fulfilled]:',
      []
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle actions with error objects', () => {
    const rejectedAction = {
      type: 'projects/fetchProjects/rejected',
      error: { message: 'Error object message' },
    };

    store.dispatch(rejectedAction);

    expect(mockConsole.error).toHaveBeenCalledWith(
      'Redux Error [projects/fetchProjects/rejected]:',
      'Error object message'
    );
  });
});

describe('ReduxErrorBoundary', () => {
  it('should create error with correct properties', () => {
    const error = new ReduxErrorBoundary(
      'Test error message',
      'test/action',
      new Error('Original error')
    );

    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('ReduxErrorBoundary');
    expect(error.action).toBe('test/action');
    expect(error.originalError).toBeInstanceOf(Error);
  });
});

describe('createErrorAction', () => {
  it('should create error action from Error object', () => {
    const error = new Error('Test error');
    const action = createErrorAction('test/action', error);

    expect(action).toEqual({
      type: 'test/action/rejected',
      payload: 'Test error',
      error: true,
    });
  });

  it('should create error action from string', () => {
    const error = 'String error';
    const action = createErrorAction('test/action', error);

    expect(action).toEqual({
      type: 'test/action/rejected',
      payload: 'String error',
      error: true,
    });
  });

  it('should create error action from unknown type', () => {
    const error = { unknown: 'object' };
    const action = createErrorAction('test/action', error);

    expect(action).toEqual({
      type: 'test/action/rejected',
      payload: '[object Object]',
      error: true,
    });
  });
});

describe('safeDispatch', () => {
  let mockDispatch: any;

  beforeEach(() => {
    mockDispatch = vi.fn();
  });

  it('should dispatch action successfully', () => {
    const action = { type: 'test/action', payload: 'test' };
    const result = safeDispatch(mockDispatch, action);

    expect(mockDispatch).toHaveBeenCalledWith(action);
    expect(result).toBe(undefined); // Return value of mockDispatch
  });

  it('should handle dispatch errors', () => {
    const action = { type: 'test/action', payload: 'test' };
    const error = new Error('Dispatch failed');
    
    mockDispatch.mockImplementationOnce(() => {
      throw error;
    });

    expect(() => safeDispatch(mockDispatch, action)).toThrow('Dispatch failed');
    expect(mockDispatch).toHaveBeenCalledTimes(2); // Original call + error action
    expect(mockConsole.error).toHaveBeenCalledWith('Error dispatching action:', error);
  });
});