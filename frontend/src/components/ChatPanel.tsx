"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export function ChatPanel({
  messages = [],
  onSendMessage,
  isLoading,
  error,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "#1a1a1b" }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "#333334" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Chat</h2>
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages || messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-2">💬</div>
            <p>Start a conversation to generate your 3D scene</p>
          </div>
        ) : Array.isArray(messages) ? (
          messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <div
                className={`rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-red-900/20 border border-red-800/30"
                    : "bg-gray-800/50 border border-gray-700/30"
                }`}
              >
                <div className="text-white whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-2">⚠️</div>
            <p>Error loading messages</p>
          </div>
        )}

        {/* Loading message */}
        {isLoading && (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Assistant
            </div>
            <div className="rounded-lg p-3 bg-gray-800/50 border border-gray-700/30">
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-lg p-3 bg-red-900/20 border border-red-800/30">
            <div className="text-red-400">Error: {error}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: "#333334" }}>
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading
                ? "Processing your message..."
                : "Describe the 3D scene you want to create..."
            }
            disabled={isLoading}
            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 resize-none min-h-[40px] max-h-[120px] border border-gray-700 focus:border-red-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
