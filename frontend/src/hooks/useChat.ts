/**
 * Simple chat hook for REST-based messaging
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { sendMessage, fetchMessages } from '../store/slices/chatSlice';
import { setSceneJson } from '../store/slices/sceneSlice';

export interface UseChatOptions {
  projectId: string;
}

export function useChat({ projectId }: UseChatOptions) {
  const dispatch = useAppDispatch();
  const { messages, isLoading, error } = useAppSelector(state => state.chat);

  // Send a message
  const sendChatMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    try {
      const result = await dispatch(sendMessage({ projectId, content })).unwrap();
      
      // Update scene if SceneJSON is returned
      if (result.scene_json) {
        dispatch(setSceneJson(result.scene_json));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [dispatch, projectId]);

  // Load messages
  const loadMessages = useCallback(() => {
    return dispatch(fetchMessages(projectId));
  }, [dispatch, projectId]);

  return {
    messages: messages || [],
    isLoading,
    error,
    sendMessage: sendChatMessage,
    loadMessages,
  };
}