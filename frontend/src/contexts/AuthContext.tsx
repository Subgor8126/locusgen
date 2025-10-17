"use client";

import React, { createContext, useContext, useEffect } from "react";
import { AuthProvider, useAuth as useOidcAuth } from "react-oidc-context";
import { User } from "oidc-client-ts";

// OIDC Configuration for AWS Cognito
const oidcConfig = {
  authority: `https://cognito-idp.${process.env.NEXT_PUBLIC_COGNITO_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}`,
  client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
  redirect_uri:
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "",
  post_logout_redirect_uri:
    typeof window !== "undefined" ? window.location.origin : "",
  response_type: "code",
  scope: "openid email profile",
  automaticSilentRenew: false,
  loadUserInfo: false,
};

// Extended auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider wrapper component
function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  const auth = useOidcAuth();

  const authContextValue: AuthContextType = {
    user: auth.user || null,
    isAuthenticated: !!auth.user && !auth.isLoading,
    isLoading: auth.isLoading,
    error: auth.error || null,
    signIn: async () => {
      try {
        await auth.signinRedirect();
      } catch (error) {
        console.error("Sign in error:", error);
        throw error;
      }
    },
    signOut: async () => {
      try {
        await auth.signoutRedirect();
      } catch (error) {
        console.error("Sign out error:", error);
        throw error;
      }
    },
    getAccessToken: () => {
      const token = auth.user?.access_token || null;
      if (token) {
        console.log("🔑 Access token length:", token.length);
        console.log("🔑 Token preview:", token.substring(0, 50) + "...");
        
        // Decode JWT header to check format
        try {
          const header = JSON.parse(atob(token.split('.')[0]));
          console.log("🔑 Token header:", header);
        } catch (e) {
          console.error("❌ Invalid JWT format:", e);
        }
      }
      return token;
    },
  };

  // Handle authentication events
  useEffect(() => {
    if (auth.error) {
      console.error("OIDC Auth Error:", auth.error);
    }
  }, [auth.error]);

  // Handle successful authentication
  useEffect(() => {
    if (auth.user && !auth.isLoading) {
      console.log("User authenticated:", auth.user.profile);
    }
  }, [auth.user, auth.isLoading]);

  // Debug OIDC state
  useEffect(() => {
    console.log("OIDC State:", {
      isLoading: auth.isLoading,
      isAuthenticated: !!auth.user,
      error: auth.error?.message,
      user: auth.user?.profile?.sub,
    });
  }, [auth.isLoading, auth.user, auth.error]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Main auth provider component
export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider {...oidcConfig}>
      <AuthProviderWrapper>{children}</AuthProviderWrapper>
    </AuthProvider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
}

// Hook for getting auth headers for API calls
export function useAuthHeaders() {
  const { getAccessToken } = useAuth();

  return () => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
}
