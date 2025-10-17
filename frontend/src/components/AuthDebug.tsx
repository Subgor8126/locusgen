"use client";

import { useAuth } from "@/contexts/AuthContext";

export function AuthDebug() {
  const { user, isAuthenticated, isLoading, error } = useAuth();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 bg-gray-800 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div>
        <strong>Environment:</strong>
        <div>User Pool ID: {process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}</div>
        <div>Client ID: {process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID}</div>
        <div>Domain: {process.env.NEXT_PUBLIC_COGNITO_DOMAIN}</div>
        <div>Region: {process.env.NEXT_PUBLIC_COGNITO_REGION}</div>
      </div>
      <div className="mt-2">
        <strong>Auth State:</strong>
        <div>Loading: {isLoading ? "Yes" : "No"}</div>
        <div>Authenticated: {isAuthenticated ? "Yes" : "No"}</div>
        <div>User: {user ? "Present" : "None"}</div>
        <div>Error: {error ? error.message : "None"}</div>
      </div>
    </div>
  );
}
