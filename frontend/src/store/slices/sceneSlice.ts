import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SceneJSON, Asset } from '../../types';

interface SceneState {
  sceneJson: SceneJSON | null;
  isRendering: boolean;
  selectedAsset: Asset | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: SceneState = {
  sceneJson: null,
  isRendering: false,
  selectedAsset: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks for API calls
export const fetchSceneJson = createAsyncThunk(
  'scene/fetchSceneJson',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/scene/`);
      if (!response.ok) {
        throw new Error('Failed to fetch scene JSON');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateSceneJson = createAsyncThunk(
  'scene/updateSceneJson',
  async ({ projectId, sceneJson }: { projectId: string; sceneJson: SceneJSON }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}/scene/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scene_json: sceneJson }),
      });
      if (!response.ok) {
        throw new Error('Failed to update scene JSON');
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const sceneSlice = createSlice({
  name: 'scene',
  initialState,
  reducers: {
    setSceneJson: (state, action: PayloadAction<SceneJSON>) => {
      state.sceneJson = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    updateSceneJsonLocal: (state, action: PayloadAction<Partial<SceneJSON>>) => {
      if (state.sceneJson) {
        state.sceneJson = { ...state.sceneJson, ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
    clearSceneJson: (state) => {
      state.sceneJson = null;
      state.lastUpdated = null;
    },
    setSelectedAsset: (state, action: PayloadAction<Asset | null>) => {
      state.selectedAsset = action.payload;
    },
    setIsRendering: (state, action: PayloadAction<boolean>) => {
      state.isRendering = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Scene manipulation actions
    addSceneObject: (state, action: PayloadAction<any>) => {
      if (state.sceneJson) {
        state.sceneJson.scene.objects.push(action.payload);
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateSceneObject: (state, action: PayloadAction<{ id: string; updates: any }>) => {
      if (state.sceneJson) {
        const { id, updates } = action.payload;
        const objectIndex = state.sceneJson.scene.objects.findIndex(obj => obj.id === id);
        if (objectIndex !== -1) {
          state.sceneJson.scene.objects[objectIndex] = {
            ...state.sceneJson.scene.objects[objectIndex],
            ...updates,
          };
          state.lastUpdated = new Date().toISOString();
        }
      }
    },
    removeSceneObject: (state, action: PayloadAction<string>) => {
      if (state.sceneJson) {
        state.sceneJson.scene.objects = state.sceneJson.scene.objects.filter(
          obj => obj.id !== action.payload
        );
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateSceneBackground: (state, action: PayloadAction<any>) => {
      if (state.sceneJson) {
        state.sceneJson.scene.background = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateSceneLighting: (state, action: PayloadAction<any>) => {
      if (state.sceneJson) {
        state.sceneJson.scene.lighting = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateSceneCamera: (state, action: PayloadAction<any>) => {
      if (state.sceneJson) {
        state.sceneJson.scene.camera = action.payload;
        state.lastUpdated = new Date().toISOString();
      }
    },
    // Handle SceneJSON from SSE stream
    handleStreamedSceneJson: (state, action: PayloadAction<string>) => {
      try {
        const parsedSceneJson = JSON.parse(action.payload);
        // Validate that it's a proper SceneJSON structure
        if (parsedSceneJson.version && parsedSceneJson.scene) {
          state.sceneJson = parsedSceneJson;
          state.lastUpdated = new Date().toISOString();
        }
      } catch (error) {
        console.error('Failed to parse streamed SceneJSON:', error);
        state.error = 'Invalid SceneJSON received from stream';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch scene JSON
      .addCase(fetchSceneJson.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSceneJson.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sceneJson = action.payload.scene_json;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchSceneJson.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update scene JSON
      .addCase(updateSceneJson.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSceneJson.fulfilled, (state, action) => {
        state.isLoading = false;
        // Scene JSON is already updated locally, this confirms persistence
      })
      .addCase(updateSceneJson.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSceneJson,
  updateSceneJsonLocal,
  clearSceneJson,
  setSelectedAsset,
  setIsRendering,
  setError,
  clearError,
  addSceneObject,
  updateSceneObject,
  removeSceneObject,
  updateSceneBackground,
  updateSceneLighting,
  updateSceneCamera,
  handleStreamedSceneJson,
} = sceneSlice.actions;

export default sceneSlice.reducer;