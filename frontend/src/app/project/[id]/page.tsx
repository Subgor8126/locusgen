"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { useAppDispatch, useAppSelector } from "@/store";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadAnonymousProjectById,
  fetchProject,
  validateAnonymousProjectSession,
  clearCurrentProject,
  clearError,
} from "@/store/slices/projectsSlice";

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthSync();
  const { getAccessToken } = useAuth();

  const {
    current: project,
    isLoading: loading,
    sessionValid,
    error,
  } = useAppSelector((state) => state.projects);

  useEffect(() => {
    const projectId = params.id as string;

    // Wait for authentication to resolve before attempting to load project
    if (authLoading) {
      return;
    }

    // Only fetch if we don't have the project or have a different project
    if (!project || project.id !== projectId) {
      // Clear any previous errors before starting new fetch
      dispatch(clearError());

      if (isAuthenticated && user) {
        // Authenticated user - fetch project from API
        const accessToken = getAccessToken();
        if (accessToken) {
          dispatch(fetchProject({ projectId, accessToken }));
        }
      } else {
        // Anonymous user - check session storage first
        dispatch(validateAnonymousProjectSession(projectId))
          .unwrap()
          .then(() => {
            // Valid anonymous session, load the project
            dispatch(loadAnonymousProjectById(projectId));
          })
          .catch(() => {
            // Not an anonymous session, try to fetch as regular project
            dispatch(fetchProject({ projectId }));
          });
      }
    }
  }, [
    params.id,
    dispatch,
    isAuthenticated,
    user,
    getAccessToken,
    project,
    authLoading,
  ]);

  // Clear current project when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearCurrentProject());
    };
  }, [dispatch]);

  if (loading || authLoading) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center"
        style={{ backgroundColor: "#111112" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">
            {authLoading ? "Authenticating..." : "Loading project..."}
          </p>
        </div>
      </div>
    );
  }

  // Only show error state if we have an error AND we're not loading AND auth is resolved
  if (!project && error && !loading && !authLoading) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center"
        style={{ backgroundColor: "#111112" }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {!sessionValid ? "Session Expired" : "Project Not Found"}
          </h1>
          <p className="text-gray-300 mb-6">
            {!sessionValid
              ? "Your anonymous session has expired. Anonymous projects are only available for 24 hours."
              : "The project you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            href="/"
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // If we don't have a project but no error, show loading
  if (!project) {
    return (
      <div
        className="min-h-screen text-white flex items-center justify-center"
        style={{ backgroundColor: "#111112" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#111112" }}
    >
      {/* Header */}
      <header
        className="border-b p-4"
        style={{ backgroundColor: "#1a1a1b", borderColor: "#333334" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.isAnonymous && (
              <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
                Anonymous
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Workspace Layout */}
      <div className="h-[calc(100vh-73px)]">
        <ProjectWorkspace project={project} />
      </div>
    </div>
  );
}
