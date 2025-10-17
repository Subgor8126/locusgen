import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, beforeEach, vi } from "vitest";
import authReducer, {
  setOidcUser,
  setAuthLoading,
  setAuthError,
  clearAuth,
  resetSessionMigration,
  checkAuthStatus,
  fetchUserProfile,
  migrateAnonymousSession,
  AuthState,
} from "../authSlice";
import { User } from "oidc-client-ts";

// Mock fetch
global.fetch = vi.fn();

describe("authSlice", () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = store.getState().auth;
      expect(state).toEqual({
        user: null,
        oidcUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionMigrationStatus: "idle",
      });
    });
  });

  describe("synchronous actions", () => {
    it("should handle setOidcUser", () => {
      const mockUser = { access_token: "token123" } as User;

      store.dispatch(setOidcUser(mockUser));

      const state = store.getState().auth;
      expect(state.oidcUser).toBe(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should handle setOidcUser with null", () => {
      store.dispatch(setOidcUser(null));

      const state = store.getState().auth;
      expect(state.oidcUser).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });

    it("should handle setAuthLoading", () => {
      store.dispatch(setAuthLoading(true));

      const state = store.getState().auth;
      expect(state.isLoading).toBe(true);
    });

    it("should handle setAuthError", () => {
      const errorMessage = "Authentication failed";

      store.dispatch(setAuthError(errorMessage));

      const state = store.getState().auth;
      expect(state.error).toBe(errorMessage);
    });

    it("should handle clearAuth", () => {
      // Set some state first
      store.dispatch(setOidcUser({ access_token: "token" } as User));
      store.dispatch(setAuthError("Some error"));

      store.dispatch(clearAuth());

      const state = store.getState().auth;
      expect(state.user).toBe(null);
      expect(state.oidcUser).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(null);
      expect(state.sessionMigrationStatus).toBe("idle");
    });

    it("should handle resetSessionMigration", () => {
      // Set migration status first
      const initialState: AuthState = {
        user: null,
        oidcUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionMigrationStatus: "success",
      };

      const action = resetSessionMigration();
      const newState = authReducer(initialState, action);

      expect(newState.sessionMigrationStatus).toBe("idle");
    });
  });

  describe("async thunks", () => {
    describe("checkAuthStatus", () => {
      it("should handle successful auth check", async () => {
        const mockResponse = {
          authenticated: true,
          user: {
            id: "1",
            username: "testuser",
            cognito_sub: "sub123",
            created_at: "2023-01-01T00:00:00Z",
          },
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        await store.dispatch(checkAuthStatus());

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toEqual(mockResponse.user);
        expect(state.isAuthenticated).toBe(true);
        expect(state.error).toBe(null);
      });

      it("should handle unauthenticated status", async () => {
        const mockResponse = {
          authenticated: false,
          user: null,
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        await store.dispatch(checkAuthStatus());

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toBe(null);
        expect(state.isAuthenticated).toBe(false);
      });

      it("should handle auth check failure", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
        } as Response);

        await store.dispatch(checkAuthStatus());

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe("Failed to check auth status");
        expect(state.isAuthenticated).toBe(false);
      });
    });

    describe("fetchUserProfile", () => {
      it("should handle successful profile fetch", async () => {
        const mockUser = {
          id: "1",
          username: "testuser",
          cognito_sub: "sub123",
          created_at: "2023-01-01T00:00:00Z",
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ user: mockUser }),
        } as Response);

        await store.dispatch(fetchUserProfile("token123"));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
      });

      it("should handle profile fetch failure", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
        } as Response);

        await store.dispatch(fetchUserProfile("token123"));

        const state = store.getState().auth;
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe("Failed to fetch user profile");
      });
    });

    describe("migrateAnonymousSession", () => {
      it("should handle successful session migration", async () => {
        const mockResponse = {
          migrated_count: 2,
          total_requested: 2,
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        await store.dispatch(
          migrateAnonymousSession({
            projectIds: ["proj1", "proj2"],
            accessToken: "token123",
          })
        );

        const state = store.getState().auth;
        expect(state.sessionMigrationStatus).toBe("success");
      });

      it("should handle session migration failure", async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
        } as Response);

        await store.dispatch(
          migrateAnonymousSession({
            projectIds: ["proj1"],
            accessToken: "token123",
          })
        );

        const state = store.getState().auth;
        expect(state.sessionMigrationStatus).toBe("failed");
        expect(state.error).toBe("Failed to migrate session");
      });
    });
  });

  describe("loading states", () => {
    it("should set loading to true during async operations", () => {
      vi.mocked(fetch).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      store.dispatch(checkAuthStatus());

      const state = store.getState().auth;
      expect(state.isLoading).toBe(true);
    });
  });
});
