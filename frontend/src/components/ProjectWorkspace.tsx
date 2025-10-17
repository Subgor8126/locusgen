"use client";

import { useState, useEffect } from "react";
import { ChatPanel } from "./ChatPanel";
import { Canvas3D } from "./Canvas3D";
import { Project, SceneObject } from "@/types";
import { useChat } from "@/hooks/useChat";
import { useAppSelector, useAppDispatch } from "@/store";
import { clearMessages } from "@/store/slices/chatSlice";

interface ProjectWorkspaceProps {
  project: Project;
}

export function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const dispatch = useAppDispatch();
  const { sceneJson } = useAppSelector((state) => state.scene);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  // const [initialPromptProcessed, setInitialPromptProcessed] = useState(false);

  // Initialize chat
  const { messages, isLoading, error, sendMessage, loadMessages } = useChat({
    projectId: project.id,
  });

  // Reset state when project changes
  useEffect(() => {
    dispatch(clearMessages());
    setMessagesLoaded(false);
    // setInitialPromptProcessed(false);
  }, [project.id, dispatch]);

  // Load existing messages from the backend
  useEffect(() => {
    if (!messagesLoaded) {
      loadMessages().finally(() => setMessagesLoaded(true));
    }
  }, [project.id, messagesLoaded, loadMessages]);

  // Handle initial prompt from URL if project is anonymous and has no messages
  // useEffect(() => {
  //   const handleInitialPrompt = async () => {
  //     if (
  //       messagesLoaded &&
  //       !initialPromptProcessed &&
  //       project.isAnonymous &&
  //       project.prompt &&
  //       messages.length === 0
  //     ) {
  //       setInitialPromptProcessed(true);
  //       try {
  //         await sendMessage(project.prompt);
  //       } catch (error) {
  //         console.error("Error sending initial prompt:", error);
  //       }
  //     }
  //   };

  //   handleInitialPrompt();
  // }, [
  //   project.id,
  //   messagesLoaded,
  //   messages.length,
  //   initialPromptProcessed,
  //   project.isAnonymous,
  //   project.prompt,
  //   sendMessage,
  // ]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleAssetClick = (asset: SceneObject) => {
    // TODO: Implement asset attribution popover in future tasks
    console.log("Asset clicked:", asset);
  };

  return (
    <div className="flex h-full">
      {/* Chat Panel - 30% */}
      <div className="w-[30%] border-r" style={{ borderColor: "#333334" }}>
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
        />
      </div>

      {/* Canvas Panel - 70% */}
      <div className="flex-1">
        <Canvas3D
          sceneJson={sceneJson || project.sceneJson}
          onAssetClick={handleAssetClick}
        />
      </div>
    </div>
  );
}
