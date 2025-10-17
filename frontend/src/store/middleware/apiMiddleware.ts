import { Middleware, AnyAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { updateSceneJson } from '../slices/sceneSlice';

// API middleware for handling side effects and API calls
export const apiMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);
  
  // Handle automatic SceneJSON persistence after Redux updates
  if (typeof action.type === 'string' && action.type.startsWith('scene/') && 
      (action.type.includes('setSceneJson') || 
       action.type.includes('updateSceneJsonLocal') ||
       action.type.includes('addSceneObject') ||
       action.type.includes('updateSceneObject') ||
       action.type.includes('removeSceneObject') ||
       action.type.includes('updateSceneBackground') ||
       action.type.includes('updateSceneLighting') ||
       action.type.includes('updateSceneCamera') ||
       action.type.includes('handleStreamedSceneJson'))) {
    
    const state = store.getState();
    const { sceneJson } = state.scene;
    const { current: currentProject } = state.projects;
    
    // Auto-persist SceneJSON if we have both a scene and a current project
    if (sceneJson && currentProject && !currentProject.isAnonymous) {
      // Debounce the API call to avoid too many requests
      setTimeout(() => {
        store.dispatch(updateSceneJson({
          projectId: currentProject.id,
          sceneJson,
        }) as any);
      }, 500);
    }
    
    // For anonymous projects, store in session storage
    if (sceneJson && currentProject?.isAnonymous) {
      try {
        const updatedProject = { ...currentProject, sceneJson };
        sessionStorage.setItem('anonymousProject', JSON.stringify(updatedProject));
      } catch (error) {
        console.error('Failed to save anonymous project to session storage:', error);
      }
    }
  }
  
  return result;
};

// Helper function to create API request with proper headers
export const createApiRequest = (url: string, options: RequestInit = {}) => {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authentication headers if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

// Helper function to handle API errors consistently
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};