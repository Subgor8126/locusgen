import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

// Async thunks for API calls
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/messages/`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ projectId, content }: { projectId: string; content: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Even if response failed, return the data so we can access user_message and assistant_message
        return rejectWithValue(data);
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<ChatMessage> }>) => {
      const { id, updates } = action.payload;
      const messageIndex = state.messages.findIndex(msg => msg.id === id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = { ...state.messages[messageIndex], ...updates };
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        // Handle both paginated and non-paginated responses
        if (action.payload.results) {
          // Paginated response
          state.messages = Array.isArray(action.payload.results) ? action.payload.results : [];
        } else {
          // Direct array response
          state.messages = Array.isArray(action.payload) ? action.payload : [];
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add both user and assistant messages from response
        if (action.payload.user_message) {
          state.messages.push({
            id: action.payload.user_message.id,
            projectId: action.meta.arg.projectId,
            role: 'user',
            content: action.payload.user_message.content,
            timestamp: action.payload.user_message.timestamp,
          });
        }
        if (action.payload.assistant_message) {
          state.messages.push({
            id: action.payload.assistant_message.id,
            projectId: action.meta.arg.projectId,
            role: 'assistant',
            content: action.payload.assistant_message.content,
            timestamp: action.payload.assistant_message.timestamp,
          });
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        
        // Check if we have structured error data with messages
        const errorData = action.payload as any;
        if (typeof errorData === 'object' && errorData.user_message) {
          // Add user message even if request failed
          state.messages.push({
            id: errorData.user_message.id,
            projectId: action.meta.arg.projectId,
            role: 'user',
            content: errorData.user_message.content,
            timestamp: errorData.user_message.timestamp,
          });
          
          // Add assistant error message if available
          if (errorData.assistant_message) {
            state.messages.push({
              id: errorData.assistant_message.id,
              projectId: action.meta.arg.projectId,
              role: 'assistant',
              content: errorData.assistant_message.content,
              timestamp: errorData.assistant_message.timestamp,
            });
          }
          
          state.error = errorData.error || 'An error occurred';
        } else {
          state.error = typeof errorData === 'string' ? errorData : 'Unknown error';
        }
      });
  },
});

export const {
  addMessage,
  updateMessage,
  clearMessages,
  setError,
  clearError,
} = chatSlice.actions;

export default chatSlice.reducer;