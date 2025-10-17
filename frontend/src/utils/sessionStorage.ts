/**
 * Utility functions for managing anonymous project sessions in browser storage.
 * Uses localStorage for cross-tab persistence of anonymous project data.
 * Handles persistence, validation, and cleanup of anonymous project data.
 */

import { Project, ChatMessage } from '@/types';

const ANONYMOUS_PROJECT_PREFIX = 'anonymous_project_';
const ANONYMOUS_MESSAGES_PREFIX = 'anonymous_messages_';
const SESSION_EXPIRY_HOURS = 24; // Anonymous projects expire after 24 hours

export interface AnonymousProjectSession {
  project: Project;
  messages: ChatMessage[];
  expiresAt: string;
}

/**
 * Store an anonymous project in session storage with expiration
 */
export function storeAnonymousProject(project: Project, messages: ChatMessage[] = []): void {
  if (typeof window === 'undefined') return;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

  const sessionData: AnonymousProjectSession = {
    project: { ...project, isAnonymous: true },
    messages,
    expiresAt: expiresAt.toISOString(),
  };

  try {
    localStorage.setItem(
      `${ANONYMOUS_PROJECT_PREFIX}${project.id}`,
      JSON.stringify(sessionData)
    );
  } catch (error) {
    console.error('Failed to store anonymous project:', error);
    // If storage is full, try to clean up expired projects and retry
    cleanupExpiredProjects();
    try {
      localStorage.setItem(
        `${ANONYMOUS_PROJECT_PREFIX}${project.id}`,
        JSON.stringify(sessionData)
      );
    } catch (retryError) {
      console.error('Failed to store anonymous project after cleanup:', retryError);
    }
  }
}

/**
 * Load an anonymous project from session storage
 */
export function loadAnonymousProject(projectId: string): AnonymousProjectSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(`${ANONYMOUS_PROJECT_PREFIX}${projectId}`);
    if (!stored) return null;

    const sessionData: AnonymousProjectSession = JSON.parse(stored);
    
    // Check if session has expired
    if (new Date() > new Date(sessionData.expiresAt)) {
      removeAnonymousProject(projectId);
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('Failed to load anonymous project:', error);
    // Remove corrupted data
    removeAnonymousProject(projectId);
    return null;
  }
}

/**
 * Update an existing anonymous project in session storage
 */
export function updateAnonymousProject(
  projectId: string, 
  updates: Partial<Project>
): boolean {
  const existing = loadAnonymousProject(projectId);
  if (!existing) return false;

  const updatedProject = {
    ...existing.project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  storeAnonymousProject(updatedProject, existing.messages);
  return true;
}

/**
 * Add a message to an anonymous project
 */
export function addAnonymousMessage(projectId: string, message: ChatMessage): boolean {
  const existing = loadAnonymousProject(projectId);
  if (!existing) return false;

  const updatedMessages = [...existing.messages, message];
  storeAnonymousProject(existing.project, updatedMessages);
  return true;
}

/**
 * Remove an anonymous project from session storage
 */
export function removeAnonymousProject(projectId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${ANONYMOUS_PROJECT_PREFIX}${projectId}`);
  } catch (error) {
    console.error('Failed to remove anonymous project:', error);
  }
}

/**
 * Get all anonymous projects from session storage
 */
export function getAllAnonymousProjects(): Project[] {
  if (typeof window === 'undefined') return [];

  const projects: Project[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ANONYMOUS_PROJECT_PREFIX)) {
        const sessionData = loadAnonymousProject(
          key.replace(ANONYMOUS_PROJECT_PREFIX, '')
        );
        if (sessionData) {
          projects.push(sessionData.project);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load anonymous projects:', error);
  }

  return projects.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt).getTime() - 
    new Date(a.updatedAt || a.createdAt).getTime()
  );
}

/**
 * Clean up expired anonymous projects from session storage
 */
export function cleanupExpiredProjects(): number {
  if (typeof window === 'undefined') return 0;

  let cleanedCount = 0;
  const now = new Date();

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ANONYMOUS_PROJECT_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const sessionData: AnonymousProjectSession = JSON.parse(stored);
            if (now > new Date(sessionData.expiresAt)) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // Remove corrupted entries
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      cleanedCount++;
    });
  } catch (error) {
    console.error('Failed to cleanup expired projects:', error);
  }

  return cleanedCount;
}

/**
 * Validate if a project ID corresponds to a valid anonymous session
 */
export function validateAnonymousSession(projectId: string): boolean {
  const sessionData = loadAnonymousProject(projectId);
  return sessionData !== null;
}

/**
 * Get storage usage information for anonymous projects
 */
export function getStorageInfo(): {
  projectCount: number;
  estimatedSize: number;
  isNearLimit: boolean;
} {
  if (typeof window === 'undefined') {
    return { projectCount: 0, estimatedSize: 0, isNearLimit: false };
  }

  let projectCount = 0;
  let estimatedSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ANONYMOUS_PROJECT_PREFIX)) {
        projectCount++;
        const value = localStorage.getItem(key);
        if (value) {
          estimatedSize += key.length + value.length;
        }
      }
    }

    // Rough estimate: localStorage limit is usually 5-10MB
    // Consider "near limit" if we're using more than 4MB for anonymous projects
    const isNearLimit = estimatedSize > 4 * 1024 * 1024;

    return { projectCount, estimatedSize, isNearLimit };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return { projectCount: 0, estimatedSize: 0, isNearLimit: false };
  }
}

/**
 * Migrate anonymous project data when user authenticates
 * Returns the project data that should be sent to the backend
 */
export function prepareAnonymousProjectForMigration(projectId: string): {
  project: Omit<Project, 'id' | 'userId'>;
  messages: Omit<ChatMessage, 'id' | 'projectId'>[];
} | null {
  const sessionData = loadAnonymousProject(projectId);
  if (!sessionData) return null;

  const { project, messages } = sessionData;

  // Prepare project data for backend (remove client-side fields)
  const projectData: Omit<Project, 'id' | 'userId'> = {
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    sceneJson: project.sceneJson,
  };

  // Prepare messages data for backend (remove client-side fields)
  const messagesData: Omit<ChatMessage, 'id' | 'projectId'>[] = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    metadata: msg.metadata,
  }));

  return { project: projectData, messages: messagesData };
}

/**
 * Get all anonymous project IDs for session migration
 */
export function getSessionProjects(): string[] {
  if (typeof window === 'undefined') return [];

  const projectIds: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ANONYMOUS_PROJECT_PREFIX)) {
        const projectId = key.replace(ANONYMOUS_PROJECT_PREFIX, '');
        const sessionData = loadAnonymousProject(projectId);
        if (sessionData) {
          projectIds.push(projectId);
        }
      }
    }
  } catch (error) {
    console.error('Failed to get session projects:', error);
  }

  return projectIds;
}

/**
 * Clear all anonymous projects from session storage (used after successful migration)
 */
export function clearAllAnonymousProjects(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(ANONYMOUS_PROJECT_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear anonymous projects:', error);
  }
}