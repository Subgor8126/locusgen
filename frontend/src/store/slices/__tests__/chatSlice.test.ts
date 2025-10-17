import { describe, it, expect } from 'vitest';
import chatReducer, {
  addMessage,
  updateMessage,
  clearMessages,
  setConnectionStatus,
  startStreaming,
  appendStreamingContent,
  finishStreaming,
  cancelStreaming,
  setError,
  clearError,
  handleSSEMessage,
  handleSSEError,
  handleSSEConnect,
  handleSSEDisconnect,
  fetchMessages,
  sendMessage,
} from '../chatSlice';
import { ChatMessage } from '../../../types';

// Mock message data
const mockMessage: ChatMessage = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  projectId: 'project123',
  role: 'user',
  content: 'Create a forest scene',
  timestamp: '2024-01-01T00:00:00Z',
  metadata: {},
};

const mockAssistantMessage: ChatMessage = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  projectId: 'project123',
  role: 'assistant',
  content: 'I\'ll create a beautiful forest scene for you.',
  timestamp: '2024-01-01T00:01:00Z',
  metadata: {},
};

describe('chatSlice', () => {
  const initialState = {
    messages: [],
    isStreaming: false,
    connectionStatus: 'disconnected' as const,
    currentStreamingMessage: '',
    error: null,
  };

  describe('reducers', () => {
    it('should handle addMessage', () => {
      const action = addMessage(mockMessage);
      const state = chatReducer(initialState, action);
      
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toEqual(mockMessage);
    });

    it('should handle updateMessage', () => {
      const stateWithMessage = {
        ...initialState,
        messages: [mockMessage],
      };
      
      const updates = { content: 'Updated content' };
      const action = updateMessage({ id: mockMessage.id, updates });
      const state = chatReducer(stateWithMessage, action);
      
      expect(state.messages[0].content).toBe('Updated content');
      expect(state.messages[0].id).toBe(mockMessage.id);
    });

    it('should handle clearMessages', () => {
      const stateWithMessages = {
        ...initialState,
        messages: [mockMessage, mockAssistantMessage],
      };
      
      const action = clearMessages();
      const state = chatReducer(stateWithMessages, action);
      
      expect(state.messages).toHaveLength(0);
    });

    it('should handle setConnectionStatus', () => {
      const action = setConnectionStatus('connected');
      const state = chatReducer(initialState, action);
      
      expect(state.connectionStatus).toBe('connected');
    });

    it('should handle startStreaming', () => {
      const action = startStreaming();
      const state = chatReducer(initialState, action);
      
      expect(state.isStreaming).toBe(true);
      expect(state.currentStreamingMessage).toBe('');
    });

    it('should handle appendStreamingContent', () => {
      const streamingState = {
        ...initialState,
        isStreaming: true,
        currentStreamingMessage: 'Hello',
      };
      
      const action = appendStreamingContent(' world');
      const state = chatReducer(streamingState, action);
      
      expect(state.currentStreamingMessage).toBe('Hello world');
    });

    it('should handle finishStreaming', () => {
      const streamingState = {
        ...initialState,
        isStreaming: true,
        currentStreamingMessage: 'Complete message',
      };
      
      const action = finishStreaming(mockAssistantMessage);
      const state = chatReducer(streamingState, action);
      
      expect(state.isStreaming).toBe(false);
      expect(state.currentStreamingMessage).toBe('');
      expect(state.messages).toContain(mockAssistantMessage);
    });

    it('should handle cancelStreaming', () => {
      const streamingState = {
        ...initialState,
        isStreaming: true,
        currentStreamingMessage: 'Partial message',
      };
      
      const action = cancelStreaming();
      const state = chatReducer(streamingState, action);
      
      expect(state.isStreaming).toBe(false);
      expect(state.currentStreamingMessage).toBe('');
    });

    it('should handle setError', () => {
      const error = 'Connection failed';
      const action = setError(error);
      const state = chatReducer(initialState, action);
      
      expect(state.error).toBe(error);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error',
      };
      
      const action = clearError();
      const state = chatReducer(stateWithError, action);
      
      expect(state.error).toBeNull();
    });

    it('should handle handleSSEMessage with text content', () => {
      const streamingState = {
        ...initialState,
        isStreaming: true,
        currentStreamingMessage: 'Hello',
      };
      
      const action = handleSSEMessage({ type: 'text', content: ' world' });
      const state = chatReducer(streamingState, action);
      
      expect(state.currentStreamingMessage).toBe('Hello world');
    });

    it('should handle handleSSEError', () => {
      const connectedState = {
        ...initialState,
        connectionStatus: 'connected' as const,
        isStreaming: true,
      };
      
      const error = 'SSE connection lost';
      const action = handleSSEError(error);
      const state = chatReducer(connectedState, action);
      
      expect(state.connectionStatus).toBe('error');
      expect(state.error).toBe(error);
      expect(state.isStreaming).toBe(false);
    });

    it('should handle handleSSEConnect', () => {
      const errorState = {
        ...initialState,
        connectionStatus: 'error' as const,
        error: 'Previous error',
      };
      
      const action = handleSSEConnect();
      const state = chatReducer(errorState, action);
      
      expect(state.connectionStatus).toBe('connected');
      expect(state.error).toBeNull();
    });

    it('should handle handleSSEDisconnect', () => {
      const connectedState = {
        ...initialState,
        connectionStatus: 'connected' as const,
        isStreaming: true,
      };
      
      const action = handleSSEDisconnect();
      const state = chatReducer(connectedState, action);
      
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.isStreaming).toBe(false);
    });
  });

  describe('async thunks', () => {
    it('should handle fetchMessages.fulfilled', () => {
      const messages = [mockMessage, mockAssistantMessage];
      const action = { 
        type: fetchMessages.fulfilled.type, 
        payload: messages 
      };
      const state = chatReducer(initialState, action);
      
      expect(state.messages).toEqual(messages);
    });

    it('should handle fetchMessages.rejected', () => {
      const error = 'Failed to fetch messages';
      const action = { 
        type: fetchMessages.rejected.type, 
        payload: error 
      };
      const state = chatReducer(initialState, action);
      
      expect(state.error).toBe(error);
    });

    it('should handle sendMessage.rejected', () => {
      const error = 'Failed to send message';
      const action = { 
        type: sendMessage.rejected.type, 
        payload: error 
      };
      const state = chatReducer(initialState, action);
      
      expect(state.error).toBe(error);
    });
  });
});