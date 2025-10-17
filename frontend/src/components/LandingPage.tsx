"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDebug } from "./AuthDebug";
import { UserMenu } from "./UserMenu";
import { useChat } from "@/hooks/useChat";
import {
  createProject,
  createAnonymousProject,
  loadAllAnonymousProjects,
  cleanupExpiredSessions,
  fetchUserProjects,
} from "@/store/slices/projectsSlice";

interface LandingPageProps {}

export default function LandingPage({}: LandingPageProps) {
  const [prompt, setPrompt] = useState("");
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { signIn, signOut, getAccessToken } = useAuth();
  const { isAuthenticated, user, isLoading: authLoading } = useAuthSync();

  // We'll initialize chat dynamically after project creation

  const {
    isLoading: projectsLoading,
    anonymousProjects,
    userProjects,
  } = useAppSelector((state) => state.projects);

  const handleSendMessage = async (projectId: string, content: string) => {
    try {
      // Create a temporary chat instance for this specific project
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/chat/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send initial message");
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending initial message:", error);
      throw error;
    }
  };

  // Load projects based on authentication status
  useEffect(() => {
    if (isAuthenticated && user) {
      // Load user's projects from API
      const accessToken = getAccessToken();
      if (accessToken) {
        dispatch(fetchUserProjects(accessToken));
      }
    } else if (!authLoading && !isAuthenticated) {
      // Load anonymous projects from session storage
      dispatch(cleanupExpiredSessions());
      dispatch(loadAllAnonymousProjects());
    }
  }, [isAuthenticated, user, authLoading, getAccessToken, dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || projectsLoading) return;

    try {
      const projectName = `Scene from "${prompt.slice(0, 30)}${
        prompt.length > 30 ? "..." : ""
      }"`;

      if (isAuthenticated && user) {
        // Authenticated user - create regular project
        const accessToken = getAccessToken();
        if (accessToken) {
          const result = await dispatch(
            createProject({
              name: projectName,
              prompt,
              accessToken,
            })
          ).unwrap();

          // Send the initial message to the newly created project
          await handleSendMessage(result.id, prompt);

          router.push(`/project/${result.id}`);
        }
      } else {
        // Anonymous user - create anonymous project
        const result = await dispatch(
          createAnonymousProject({
            name: projectName,
            prompt,
          })
        ).unwrap();

        // Send the initial message to the newly created anonymous project
        await handleSendMessage(result.id, prompt);

        router.push(`/project/${result.id}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{ backgroundColor: "#111112" }}
    >
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">LocusGen</h1>
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <UserMenu user={user} onSignOut={signOut} />
          ) : (
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Central Prompt Section */}
        <div className="w-full max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl md:text-6xl mb-6 text-white">
            Create 3D Scenes with
            <span className="block text-red-600 mt-2">Natural Language</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Describe your vision and watch as AI transforms your words into
            immersive 3D environments
          </p>

          {/* Prompt Input Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the 3D scene you want to create... (e.g., 'A cozy living room with a fireplace, wooden furniture, and warm lighting')"
                className="w-full h-32 px-6 py-4 text-lg border-2 rounded-3xl 
                         text-white placeholder-gray-400 resize-none
                         focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/40
                         shadow-2xl shadow-red-500/60 focus:shadow-white/80 focus:shadow-2xl
                         transition-all duration-300"
                style={{
                  backgroundColor: "#0a0a0b",
                  borderColor: "#333334",
                }}
                disabled={projectsLoading}
              />
              <button
                type="submit"
                disabled={!prompt.trim() || projectsLoading}
                aria-label={
                  projectsLoading ? "Creating scene..." : "Generate scene"
                }
                className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full
                         hover:bg-gray-100 disabled:bg-gray-400 disabled:cursor-not-allowed
                         transition-all duration-200 flex items-center justify-center
                         shadow-lg hover:shadow-xl"
              >
                {projectsLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-800"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Project Thumbnails */}
        {((isAuthenticated && userProjects.length > 0) ||
          (!isAuthenticated && anonymousProjects.length > 0)) && (
          <div className="w-full max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-white">
              {isAuthenticated ? "Your Projects" : "Recent Sessions"}
            </h3>
            {!isAuthenticated && anonymousProjects.length > 0 && (
              <p className="text-sm text-gray-400 mb-4">
                These sessions are stored locally and will expire after 24
                hours.{" "}
                <button
                  onClick={handleSignIn}
                  className="text-red-400 hover:text-red-300 underline"
                >
                  Sign in to save permanently
                </button>
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {(isAuthenticated ? userProjects : anonymousProjects).map(
                (project) => (
                  <div
                    key={project.id}
                    className="rounded-lg p-4 hover:opacity-80 transition-colors cursor-pointer
                           border hover:border-red-500/50"
                    style={{
                      backgroundColor: "#1a1a1b",
                      borderColor: "#333334",
                    }}
                    onClick={() => router.push(`/project/${project.id}`)}
                  >
                    <div
                      className="aspect-video rounded mb-3 flex items-center justify-center"
                      style={{ backgroundColor: "#0a0a0b" }}
                    >
                      <span className="text-gray-400 text-sm">Preview</span>
                    </div>
                    <h4 className="font-medium text-white truncate">
                      {project.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                      {project.isAnonymous && (
                        <span className="px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
                          Session
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-400 text-sm">
        <p>Powered by AI</p>
      </footer>

      {/* Debug component for development */}
      {/* <AuthDebug /> */}
    </div>
  );
}
