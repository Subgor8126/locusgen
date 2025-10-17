import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from 'oidc-client-ts';

// Types
export interface AuthUser {
  id: string;
  username: string;
  cognito_sub: string;
  created_at: string;
}

export interface AuthState {
  user: AuthUser | null;
  oidcUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionMigrationStatus: 'idle' | 'pending' | 'success' | 'failed';
}

// Initial state
const initialState: AuthState = {
  user: null,
  oidcUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionMigrationStatus: 'idle',
};

// Async thunks
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check auth status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (accessToken: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/status/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const migrateAnonymousSession = createAsyncThunk(
  'auth/migrateSession',
  async ({ projectIds, accessToken }: { projectIds: string[]; accessToken: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/migrate-session/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ project_ids: projectIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to migrate session');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setOidcUser: (state, action: PayloadAction<User | null>) => {
      state.oidcUser = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.oidcUser = null;
      state.isAuthenticated = false;
      state.error = null;
      state.sessionMigrationStatus = 'idle';
    },
    resetSessionMigration: (state) => {
      state.sessionMigrationStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.authenticated) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Migrate anonymous session
      .addCase(migrateAnonymousSession.pending, (state) => {
        state.sessionMigrationStatus = 'pending';
      })
      .addCase(migrateAnonymousSession.fulfilled, (state, action) => {
        state.sessionMigrationStatus = 'success';
      })
      .addCase(migrateAnonymousSession.rejected, (state, action) => {
        state.sessionMigrationStatus = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const {
  setOidcUser,
  setAuthLoading,
  setAuthError,
  clearAuth,
  resetSessionMigration,
} = authSlice.actions;

export default authSlice.reducer;