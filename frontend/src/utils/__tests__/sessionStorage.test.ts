/**
 * Tests for anonymous project session storage utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Project, ChatMessage } from '@/types';
import {
  storeAnonymousProject,
  loadAnonymousProject,
  updateAnonymousProject,
  addAnonymousMessage,
  removeAnonymousProject,
  getAllAnonymousProjects,
  cleanupExpiredProjects,
  validateAnonymousSession,
  getStorageInfo,
  prepareAnonymousProjectForMigration,
} from '../sessionStorage';

// Mock sessionStorage
const mockSessionStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockSessionStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockSessionStorage.store.delete(key);
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store.clear();
  }),
  key: vi.fn((index: number) => {
    const keys = Array.from(mockSessionStorage.store.keys());
    return keys[index] || null;
  }),
  get length() {
    return mockSessionStorage.store.size;
  },
};

// Mock window.sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('sessionStorage utilities', () => {
  const mockProject: Project = {
    id: 'test-project-id',
    name: 'Test Project',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    isAnonymous: true,
  };

  const mockMessage: ChatMessage = {
    id: 'test-message-id',
    projectId: 'test-project-id',
    role: 'user',
    content: 'Test message',
    timestamp: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockSessionStorage.store.clear();
    vi.clearAllMocks();
    // Mock Date.now to return a consistent time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('storeAnonymousProject', () => {
    it('should store a project with expiration', () => {
      storeAnonymousProject(mockProject);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'anonymous_project_test-project-id',
        expect.stringContaining('"project"')
      );

      const stored = mockSessionStorage.getItem('anonymous_project_test-project-id');
      const parsed = JSON.parse(stored!);
      
      expect(parsed.project.id).toBe(mockProject.id);
      expect(parsed.project.isAnonymous).toBe(true);
      expect(parsed.messages).toEqual([]);
      expect(new Date(parsed.expiresAt)).toBeInstanceOf(Date);
    });

    it('should store project with messages', () => {
      storeAnonymousProject(mockProject, [mockMessage]);

      const stored = mockSessionStorage.getItem('anonymous_project_test-project-id');
      const parsed = JSON.parse(stored!);
      
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.messages[0].id).toBe(mockMessage.id);
    });

    it('should handle storage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => storeAnonymousProject(mockProject)).not.toThrow();
    });
  });

  describe('loadAnonymousProject', () => {
    it('should load a valid project', () => {
      storeAnonymousProject(mockProject);
      
      const loaded = loadAnonymousProject('test-project-id');
      
      expect(loaded).not.toBeNull();
      expect(loaded!.project.id).toBe(mockProject.id);
      expect(loaded!.messages).toEqual([]);
    });

    it('should return null for non-existent project', () => {
      const loaded = loadAnonymousProject('non-existent');
      
      expect(loaded).toBeNull();
    });

    it('should return null for expired project', () => {
      storeAnonymousProject(mockProject);
      
      // Move time forward by 25 hours
      vi.setSystemTime(new Date('2023-01-02T13:00:00Z'));
      
      const loaded = loadAnonymousProject('test-project-id');
      
      expect(loaded).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'anonymous_project_test-project-id'
      );
    });

    it('should handle corrupted data gracefully', () => {
      mockSessionStorage.setItem('anonymous_project_test-project-id', 'invalid-json');
      
      const loaded = loadAnonymousProject('test-project-id');
      
      expect(loaded).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'anonymous_project_test-project-id'
      );
    });
  });

  describe('updateAnonymousProject', () => {
    it('should update an existing project', () => {
      storeAnonymousProject(mockProject);
      
      const updates = { name: 'Updated Project Name' };
      const result = updateAnonymousProject('test-project-id', updates);
      
      expect(result).toBe(true);
      
      const loaded = loadAnonymousProject('test-project-id');
      expect(loaded!.project.name).toBe('Updated Project Name');
      expect(loaded!.project.updatedAt).not.toBe(mockProject.updatedAt);
    });

    it('should return false for non-existent project', () => {
      const result = updateAnonymousProject('non-existent', { name: 'New Name' });
      
      expect(result).toBe(false);
    });
  });

  describe('addAnonymousMessage', () => {
    it('should add a message to existing project', () => {
      storeAnonymousProject(mockProject);
      
      const result = addAnonymousMessage('test-project-id', mockMessage);
      
      expect(result).toBe(true);
      
      const loaded = loadAnonymousProject('test-project-id');
      expect(loaded!.messages).toHaveLength(1);
      expect(loaded!.messages[0].id).toBe(mockMessage.id);
    });

    it('should return false for non-existent project', () => {
      const result = addAnonymousMessage('non-existent', mockMessage);
      
      expect(result).toBe(false);
    });
  });

  describe('removeAnonymousProject', () => {
    it('should remove a project', () => {
      storeAnonymousProject(mockProject);
      
      removeAnonymousProject('test-project-id');
      
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'anonymous_project_test-project-id'
      );
    });
  });

  describe('getAllAnonymousProjects', () => {
    it('should return all valid projects sorted by update time', () => {
      const project1 = { ...mockProject, id: 'project-1', updatedAt: '2023-01-01T10:00:00Z' };
      const project2 = { ...mockProject, id: 'project-2', updatedAt: '2023-01-01T11:00:00Z' };
      
      storeAnonymousProject(project1);
      storeAnonymousProject(project2);
      
      const projects = getAllAnonymousProjects();
      
      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe('project-2'); // More recent first
      expect(projects[1].id).toBe('project-1');
    });

    it('should exclude expired projects', () => {
      storeAnonymousProject(mockProject);
      
      // Move time forward to expire the project
      vi.setSystemTime(new Date('2023-01-02T13:00:00Z'));
      
      const projects = getAllAnonymousProjects();
      
      expect(projects).toHaveLength(0);
    });
  });

  describe('cleanupExpiredProjects', () => {
    it('should remove expired projects and return count', () => {
      const project1 = { ...mockProject, id: 'project-1' };
      const project2 = { ...mockProject, id: 'project-2' };
      
      storeAnonymousProject(project1);
      storeAnonymousProject(project2);
      
      // Move time forward to expire projects
      vi.setSystemTime(new Date('2023-01-02T13:00:00Z'));
      
      const cleanedCount = cleanupExpiredProjects();
      
      expect(cleanedCount).toBe(2);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledTimes(2);
    });

    it('should handle corrupted entries', () => {
      mockSessionStorage.setItem('anonymous_project_corrupted', 'invalid-json');
      
      const cleanedCount = cleanupExpiredProjects();
      
      expect(cleanedCount).toBe(1);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'anonymous_project_corrupted'
      );
    });
  });

  describe('validateAnonymousSession', () => {
    it('should return true for valid session', () => {
      storeAnonymousProject(mockProject);
      
      const isValid = validateAnonymousSession('test-project-id');
      
      expect(isValid).toBe(true);
    });

    it('should return false for expired session', () => {
      storeAnonymousProject(mockProject);
      
      // Move time forward to expire the project
      vi.setSystemTime(new Date('2023-01-02T13:00:00Z'));
      
      const isValid = validateAnonymousSession('test-project-id');
      
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const isValid = validateAnonymousSession('non-existent');
      
      expect(isValid).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', () => {
      storeAnonymousProject(mockProject);
      
      const info = getStorageInfo();
      
      expect(info.projectCount).toBe(1);
      expect(info.estimatedSize).toBeGreaterThan(0);
      expect(typeof info.isNearLimit).toBe('boolean');
    });

    it('should detect near limit condition', () => {
      // Clear existing data first
      mockSessionStorage.store.clear();
      
      // Mock a large storage size
      mockSessionStorage.setItem('anonymous_project_large', 'x'.repeat(5 * 1024 * 1024)); // 5MB
      
      const info = getStorageInfo();
      
      expect(info.isNearLimit).toBe(true);
      
      // Clean up after test
      mockSessionStorage.store.clear();
    });
  });

  describe('prepareAnonymousProjectForMigration', () => {
    it('should prepare project data for migration', () => {
      // Clear any existing data first
      mockSessionStorage.store.clear();
      
      storeAnonymousProject(mockProject, [mockMessage]);
      
      const migrationData = prepareAnonymousProjectForMigration('test-project-id');
      
      expect(migrationData).not.toBeNull();
      expect(migrationData!.project.name).toBe(mockProject.name);
      expect(migrationData!.project).not.toHaveProperty('id');
      expect(migrationData!.project).not.toHaveProperty('userId');
      expect(migrationData!.messages).toHaveLength(1);
      expect(migrationData!.messages[0]).not.toHaveProperty('id');
      expect(migrationData!.messages[0]).not.toHaveProperty('projectId');
    });

    it('should return null for non-existent project', () => {
      const migrationData = prepareAnonymousProjectForMigration('non-existent');
      
      expect(migrationData).toBeNull();
    });
  });
});