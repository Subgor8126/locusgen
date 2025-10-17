import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Project, ChatMessage } from "../../types";
import {
  storeAnonymousProject,
  loadAnonymousProject,
  updateAnonymousProject,
  getAllAnonymousProjects,
  cleanupExpiredProjects,
  validateAnonymousSession,
  removeAnonymousProject,
} from "../../utils/sessionStorage";

interface ProjectsState {
  current: Project | null;
  list: Project[];
  userProjects: Project[];
  anonymousProjects: Project[];
  isLoading: boolean;
  error: string | null;
  sessionValid: boolean;
}

const initialState: ProjectsState = {
  current: null,
  list: [],
  userProjects: [],
  anonymousProjects: [],
  isLoading: false,
  error: null,
  sessionValid: true,
};

// Async thunks for API calls
export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/`);
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const fetchProject = createAsyncThunk(
  "projects/fetchProject",
  async (
    { projectId, accessToken }: { projectId: string; accessToken?: string },
    { rejectWithValue }
  ) => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/`, {
        method: "GET",
        headers,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const fetchUserProjects = createAsyncThunk(
  "projects/fetchUserProjects",
  async (accessToken: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user projects");
      }
      const data = await response.json();
      return data.results || data; // Handle paginated response
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const createProject = createAsyncThunk(
  "projects/createProject",
  async (
    projectData: { name: string; prompt?: string; accessToken: string },
    { rejectWithValue }
  ) => {
    try {
      const { accessToken, ...data } = projectData;
      console.log(`what a token ${accessToken}`)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create project");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async (
    { id, updates }: { id: string; updates: Partial<Project> },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update project");
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// Anonymous project async thunks
export const createAnonymousProject = createAsyncThunk(
  "projects/createAnonymousProject",
  async (
    projectData: { name: string; prompt?: string },
    { rejectWithValue }
  ) => {
    try {
      // Create project in backend for persistence
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error("Failed to create anonymous project");
      }

      const project = await response.json();

      // Store in session storage for anonymous access
      storeAnonymousProject(project);

      return project;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const loadAnonymousProjectById = createAsyncThunk(
  "projects/loadAnonymousProjectById",
  async (projectId: string, { rejectWithValue }) => {
    try {
      // First try to load from session storage
      const sessionData = loadAnonymousProject(projectId);
      if (sessionData) {
        return sessionData.project;
      }

      // If not in session, try to fetch from backend (in case of page refresh)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/`);
      if (!response.ok) {
        throw new Error("Project not found");
      }

      const project = await response.json();

      // Store in session for future access
      storeAnonymousProject(project);

      return project;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const updateAnonymousProjectThunk = createAsyncThunk(
  "projects/updateAnonymousProject",
  async (
    { id, updates }: { id: string; updates: Partial<Project> },
    { rejectWithValue }
  ) => {
    try {
      // Update in backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update anonymous project");
      }

      const updatedProject = await response.json();

      // Update in session storage
      updateAnonymousProject(id, updates);

      return updatedProject;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const loadAllAnonymousProjects = createAsyncThunk(
  "projects/loadAllAnonymousProjects",
  async (_, { rejectWithValue }) => {
    try {
      // Clean up expired projects first
      cleanupExpiredProjects();

      // Load all valid anonymous projects from session storage
      const projects = getAllAnonymousProjects();

      return projects;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const validateAnonymousProjectSession = createAsyncThunk(
  "projects/validateAnonymousProjectSession",
  async (projectId: string, { rejectWithValue }) => {
    try {
      const isValid = validateAnonymousSession(projectId);

      if (!isValid) {
        throw new Error("Anonymous session expired or invalid");
      }

      return { projectId, isValid };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setCurrentProject: (state, action: PayloadAction<Project>) => {
      state.current = action.payload;
    },
    clearCurrentProject: (state) => {
      state.current = null;
    },
    updateCurrentProject: (state, action: PayloadAction<Partial<Project>>) => {
      if (state.current) {
        state.current = { ...state.current, ...action.payload };
      }
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.list.push(action.payload);
    },
    removeProject: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter(
        (project) => project.id !== action.payload
      );
    },
    clearError: (state) => {
      state.error = null;
    },
    // Anonymous project session management
    setAnonymousProject: (state, action: PayloadAction<Project>) => {
      const project = { ...action.payload, isAnonymous: true };
      state.current = project;
      storeAnonymousProject(project);
    },
    loadAnonymousProjectFromSession: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      const sessionData = loadAnonymousProject(projectId);
      if (sessionData) {
        state.current = sessionData.project;
        state.sessionValid = true;
      } else {
        state.sessionValid = false;
      }
    },
    clearAnonymousProject: (state, action: PayloadAction<string>) => {
      const projectId = action.payload;
      removeAnonymousProject(projectId);
      if (state.current?.id === projectId) {
        state.current = null;
      }
      state.anonymousProjects = state.anonymousProjects.filter(
        (p) => p.id !== projectId
      );
    },
    cleanupExpiredSessions: (state) => {
      const cleanedCount = cleanupExpiredProjects();
      if (cleanedCount > 0) {
        // Reload anonymous projects after cleanup
        state.anonymousProjects = getAllAnonymousProjects();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch projects
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch user projects
      .addCase(fetchUserProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProjects = action.payload;
      })
      .addCase(fetchUserProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch single project
      .addCase(fetchProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.current = action.payload;
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create project
      .addCase(createProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.current = action.payload;
        state.userProjects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update project
      .addCase(updateProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedProject = action.payload;

        // Update current project if it matches
        if (state.current && state.current.id === updatedProject.id) {
          state.current = updatedProject;
        }

        // Update in list
        const index = state.list.findIndex((p) => p.id === updatedProject.id);
        if (index !== -1) {
          state.list[index] = updatedProject;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create anonymous project
      .addCase(createAnonymousProject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAnonymousProject.fulfilled, (state, action) => {
        state.isLoading = false;
        const project = { ...action.payload, isAnonymous: true };
        state.current = project;
        state.anonymousProjects.push(project);
      })
      .addCase(createAnonymousProject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Load anonymous project by ID
      .addCase(loadAnonymousProjectById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadAnonymousProjectById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.current = action.payload;
        state.sessionValid = true;
      })
      .addCase(loadAnonymousProjectById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.sessionValid = false;
      })
      // Update anonymous project
      .addCase(updateAnonymousProjectThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAnonymousProjectThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedProject = action.payload;

        // Update current project if it matches
        if (state.current && state.current.id === updatedProject.id) {
          state.current = updatedProject;
        }

        // Update in anonymous projects list
        const index = state.anonymousProjects.findIndex(
          (p) => p.id === updatedProject.id
        );
        if (index !== -1) {
          state.anonymousProjects[index] = updatedProject;
        }
      })
      .addCase(updateAnonymousProjectThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Load all anonymous projects
      .addCase(loadAllAnonymousProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadAllAnonymousProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.anonymousProjects = action.payload;
      })
      .addCase(loadAllAnonymousProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Validate anonymous session
      .addCase(validateAnonymousProjectSession.fulfilled, (state, action) => {
        state.sessionValid = action.payload.isValid;
      })
      .addCase(validateAnonymousProjectSession.rejected, (state) => {
        state.sessionValid = false;
      });
  },
});

export const {
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
} = projectsSlice.actions;

export default projectsSlice.reducer;
