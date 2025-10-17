import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import projectsReducer, {
  setCurrentProject,
  clearCurrentProject,
  updateCurrentProject,
  addProject,
  removeProject,
  clearError,
  setAnonymousProject,
  loadAnonymousProjectFromSession,
  clearAnonymousProject,
  cleanupExpiredSessions,
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  createAnonymousProject,
  loadAnonymousProjectById,
  loadAllAnonymousProjects,
  validateAnonymousProjectSession,
} from '../projectsSlice';
import { Project } from '../../../types';

// Mock the sessionStorage utilities
vi.mock('../../../utils/sessionStorage', () => ({
  storeAnonymousProject: vi.fn(),
  loadAnonymousProject: vi.fn(),
  updateAnonymousProject: vi.fn(),
  removeAnonymousProject: vi.fn(),
  getAllAnonymousProjects: vi.fn(),
  cleanupExpiredProjects: vi.fn(),
  validateAnonymousSession: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock project data
const mockProject: Project = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Project',
  userId: 'user123',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  sceneJson: undefined,
  isAnonymous: false,
  prompt: 'Create a forest scene',
};

const mockAnonymousProject: Project = {
  ...mockProject,
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Anonymous Project',
  userId: undefined,
  isAnonymous: true,
};

describe('projectsSlice', () => {
  const initialState = {
    current: null,
    list: [],
    anonymousProjects: [],
    isLoading: false,
    error: null,
    sessionValid: true,
  };

  beforeEach(() => {
    // Clear session storage before each test
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('reducers', () => {
    it('should handle setCurrentProject', () => {
      const action = setCurrentProject(mockProject);
      const state = projectsReducer(initialState, action);
      
      expect(state.current).toEqual(mockProject);
    });

    it('should handle clearCurrentProject', () => {
      const stateWithProject = {
        ...initialState,
        current: mockProject,
      };
      
      const action = clearCurrentProject();
      const state = projectsReducer(stateWithProject, action);
      
      expect(state.current).toBeNull();
    });

    it('should handle updateCurrentProject', () => {
      const stateWithProject = {
        ...initialState,
        current: mockProject,
      };
      
      const updates = { name: 'Updated Project Name' };
      const action = updateCurrentProject(updates);
      const state = projectsReducer(stateWithProject, action);
      
      expect(state.current?.name).toBe('Updated Project Name');
      expect(state.current?.id).toBe(mockProject.id);
    });

    it('should handle addProject', () => {
      const action = addProject(mockProject);
      const state = projectsReducer(initialState, action);
      
      expect(state.list).toHaveLength(1);
      expect(state.list[0]).toEqual(mockProject);
    });

    it('should handle removeProject', () => {
      const stateWithProjects = {
        ...initialState,
        list: [mockProject],
      };
      
      const action = removeProject(mockProject.id);
      const state = projectsReducer(stateWithProjects, action);
      
      expect(state.list).toHaveLength(0);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error',
      };
      
      const action = clearError();
      const state = projectsReducer(stateWithError, action);
      
      expect(state.error).toBeNull();
    });

    it('should handle setAnonymousProject', () => {
      const action = setAnonymousProject(mockAnonymousProject);
      const state = projectsReducer(initialState, action);
      
      expect(state.current).toEqual({
        ...mockAnonymousProject,
        isAnonymous: true,
      });
    });

    it('should handle loadAnonymousProjectFromSession', () => {
      // Mock the loadAnonymousProject function to return valid session data
      vi.doMock('../../../utils/sessionStorage', () => ({
        loadAnonymousProject: vi.fn().mockReturnValue({
          project: mockAnonymousProject,
          messages: [],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      }));

      const action = loadAnonymousProjectFromSession(mockAnonymousProject.id);
      const state = projectsReducer(initialState, action);
      
      expect(state.current).toEqual(mockAnonymousProject);
      expect(state.sessionValid).toBe(true);
    });

    it('should handle clearAnonymousProject', () => {
      const stateWithAnonymousProject = {
        ...initialState,
        current: mockAnonymousProject,
        anonymousProjects: [mockAnonymousProject],
      };

      const action = clearAnonymousProject(mockAnonymousProject.id);
      const state = projectsReducer(stateWithAnonymousProject, action);
      
      expect(state.current).toBeNull();
      expect(state.anonymousProjects).toHaveLength(0);
    });

    it('should handle cleanupExpiredSessions', () => {
      // Mock the session storage utilities
      vi.doMock('../../../utils/sessionStorage', () => ({
        cleanupExpiredProjects: vi.fn().mockReturnValue(2),
        getAllAnonymousProjects: vi.fn().mockReturnValue([mockAnonymousProject]),
      }));

      const action = cleanupExpiredSessions();
      const state = projectsReducer(initialState, action);
      
      expect(state.anonymousProjects).toEqual([mockAnonymousProject]);
    });
  });

  describe('async thunks', () => {
    it('should handle fetchProjects.pending', () => {
      const action = { type: fetchProjects.pending.type };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchProjects.fulfilled', () => {
      const projects = [mockProject];
      const action = { 
        type: fetchProjects.fulfilled.type, 
        payload: projects 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.list).toEqual(projects);
    });

    it('should handle fetchProjects.rejected', () => {
      const error = 'Failed to fetch projects';
      const action = { 
        type: fetchProjects.rejected.type, 
        payload: error 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should handle fetchProject.fulfilled', () => {
      const action = { 
        type: fetchProject.fulfilled.type, 
        payload: mockProject 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.current).toEqual(mockProject);
    });

    it('should handle createProject.fulfilled', () => {
      const action = { 
        type: createProject.fulfilled.type, 
        payload: mockProject 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.current).toEqual(mockProject);
      expect(state.list).toContain(mockProject);
    });

    it('should handle updateProject.fulfilled', () => {
      const updatedProject = { ...mockProject, name: 'Updated Name' };
      const stateWithProject = {
        ...initialState,
        current: mockProject,
        list: [mockProject],
      };
      
      const action = { 
        type: updateProject.fulfilled.type, 
        payload: updatedProject 
      };
      const state = projectsReducer(stateWithProject, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.current?.name).toBe('Updated Name');
      expect(state.list[0].name).toBe('Updated Name');
    });

    it('should handle createAnonymousProject.fulfilled', () => {
      const action = { 
        type: createAnonymousProject.fulfilled.type, 
        payload: mockAnonymousProject 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.current).toEqual({
        ...mockAnonymousProject,
        isAnonymous: true,
      });
      expect(state.anonymousProjects).toHaveLength(1);
      expect(state.anonymousProjects[0]).toEqual({
        ...mockAnonymousProject,
        isAnonymous: true,
      });
    });

    it('should handle loadAnonymousProjectById.fulfilled', () => {
      const action = { 
        type: loadAnonymousProjectById.fulfilled.type, 
        payload: mockAnonymousProject 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.current).toEqual(mockAnonymousProject);
      expect(state.sessionValid).toBe(true);
    });

    it('should handle loadAnonymousProjectById.rejected', () => {
      const error = 'Project not found';
      const action = { 
        type: loadAnonymousProjectById.rejected.type, 
        payload: error 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(error);
      expect(state.sessionValid).toBe(false);
    });

    it('should handle loadAllAnonymousProjects.fulfilled', () => {
      const projects = [mockAnonymousProject];
      const action = { 
        type: loadAllAnonymousProjects.fulfilled.type, 
        payload: projects 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.anonymousProjects).toEqual(projects);
    });

    it('should handle validateAnonymousProjectSession.fulfilled', () => {
      const action = { 
        type: validateAnonymousProjectSession.fulfilled.type, 
        payload: { projectId: 'test-id', isValid: true }
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.sessionValid).toBe(true);
    });

    it('should handle validateAnonymousProjectSession.rejected', () => {
      const action = { 
        type: validateAnonymousProjectSession.rejected.type 
      };
      const state = projectsReducer(initialState, action);
      
      expect(state.sessionValid).toBe(false);
    });
  });
});