import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { apiMiddleware, createApiRequest, handleApiError } from '../apiMiddleware';
import projectsReducer from '../../slices/projectsSlice';
import chatReducer from '../../slices/chatSlice';
import sceneReducer, { setSceneJson } from '../../slices/sceneSlice';
import { SceneJSON } from '../../../types';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

const mockSceneJson: SceneJSON = {
  version: '1.0',
  metadata: {
    name: 'Test Scene',
    description: 'A test scene',
    created_at: '2024-01-01T00:00:00Z',
  },
  scene: {
    background: { type: 'color', value: '#87CEEB' },
    lighting: {
      ambient: { intensity: 0.4, color: '#ffffff' },
    },
    camera: {
      type: 'perspective',
      position: [0, 5, 10],
      target: [0, 0, 0],
      fov: 75,
    },
    objects: [],
  },
};

describe('apiMiddleware', () => {
  let store: any;

  beforeEach(() => {
    vi.clearAllMocks();
    store = configureStore({
      reducer: {
        projects: projectsReducer,
        chat: chatReducer,
        scene: sceneReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiMiddleware),
    });
  });

  it('should trigger SceneJSON persistence for authenticated projects', async () => {
    // Set up store state with authenticated project
    store.dispatch({
      type: 'projects/setCurrentProject',
      payload: {
        id: 'project123',
        name: 'Test Project',
        userId: 'user123',
        isAnonymous: false,
      },
    });

    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    // Dispatch scene update action
    store.dispatch(setSceneJson(mockSceneJson));

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(fetch).toHaveBeenCalledWith('/api/projects/project123/scene/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene_json: mockSceneJson }),
    });
  });

  it('should save to session storage for anonymous projects', () => {
    // Set up store state with anonymous project
    store.dispatch({
      type: 'projects/setCurrentProject',
      payload: {
        id: 'project123',
        name: 'Anonymous Project',
        isAnonymous: true,
      },
    });

    // Dispatch scene update action
    store.dispatch(setSceneJson(mockSceneJson));

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'anonymousProject',
      JSON.stringify({
        id: 'project123',
        name: 'Anonymous Project',
        isAnonymous: true,
        sceneJson: mockSceneJson,
      })
    );
  });

  it('should not trigger persistence when no current project', () => {
    // Dispatch scene update action without current project
    store.dispatch(setSceneJson(mockSceneJson));

    expect(fetch).not.toHaveBeenCalled();
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
  });
});

describe('createApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('should create request with default headers', async () => {
    await createApiRequest('/api/test');

    expect(fetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('should add authorization header when token exists', async () => {
    mockLocalStorage.getItem.mockReturnValue('test-token');

    await createApiRequest('/api/test');

    expect(fetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
    });
  });

  it('should merge custom headers', async () => {
    mockLocalStorage.getItem.mockReturnValue(null); // Ensure no token
    
    await createApiRequest('/api/test', {
      headers: {
        'Custom-Header': 'custom-value',
      },
    });

    expect(fetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
        'Custom-Header': 'custom-value',
      },
    });
  });
});

describe('handleApiError', () => {
  it('should handle Error objects', () => {
    const error = new Error('Test error');
    const result = handleApiError(error);
    expect(result).toBe('Test error');
  });

  it('should handle string errors', () => {
    const error = 'String error';
    const result = handleApiError(error);
    expect(result).toBe('String error');
  });

  it('should handle unknown errors', () => {
    const error = { unknown: 'object' };
    const result = handleApiError(error);
    expect(result).toBe('An unknown error occurred');
  });
});