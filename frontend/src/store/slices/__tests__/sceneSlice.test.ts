import { describe, it, expect } from 'vitest';
import sceneReducer, {
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
  fetchSceneJson,
  updateSceneJson,
} from '../sceneSlice';
import { SceneJSON, Asset } from '../../../types';

// Mock data
const mockSceneJson: SceneJSON = {
  version: '1.0',
  metadata: {
    name: 'Test Scene',
    description: 'A test scene',
    created_at: '2024-01-01T00:00:00Z',
  },
  scene: {
    background: {
      type: 'color',
      value: '#87CEEB',
    },
    lighting: {
      ambient: {
        intensity: 0.4,
        color: '#ffffff',
      },
      directional: {
        intensity: 1.0,
        color: '#ffffff',
        position: [10, 10, 5],
      },
    },
    camera: {
      type: 'perspective',
      position: [0, 5, 10],
      target: [0, 0, 0],
      fov: 75,
    },
    objects: [
      {
        id: 'tree1',
        type: 'mesh',
        asset: {
          id: 'asset1',
          url: 'https://example.com/tree.glb',
          format: 'glb',
        },
        transform: {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        properties: {},
        attribution: {
          creator: 'Test Creator',
          source_url: 'https://example.com',
          license: 'CC0',
        },
      },
    ],
  },
};

const mockAsset: Asset = {
  id: 'asset1',
  name: 'Tree Model',
  sourceUrl: 'https://example.com/tree.glb',
  creator: 'Test Creator',
  licenseType: 'CC0',
  fileFormat: 'glb',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('sceneSlice', () => {
  const initialState = {
    sceneJson: null,
    isRendering: false,
    selectedAsset: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  };

  describe('reducers', () => {
    it('should handle setSceneJson', () => {
      const action = setSceneJson(mockSceneJson);
      const state = sceneReducer(initialState, action);
      
      expect(state.sceneJson).toEqual(mockSceneJson);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle updateSceneJsonLocal', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const updates = {
        metadata: {
          ...mockSceneJson.metadata,
          name: 'Updated Scene Name',
        },
      };
      
      const action = updateSceneJsonLocal(updates);
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.metadata.name).toBe('Updated Scene Name');
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle clearSceneJson', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
        lastUpdated: '2024-01-01T00:00:00Z',
      };
      
      const action = clearSceneJson();
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });

    it('should handle setSelectedAsset', () => {
      const action = setSelectedAsset(mockAsset);
      const state = sceneReducer(initialState, action);
      
      expect(state.selectedAsset).toEqual(mockAsset);
    });

    it('should handle setIsRendering', () => {
      const action = setIsRendering(true);
      const state = sceneReducer(initialState, action);
      
      expect(state.isRendering).toBe(true);
    });

    it('should handle setError', () => {
      const error = 'Rendering failed';
      const action = setError(error);
      const state = sceneReducer(initialState, action);
      
      expect(state.error).toBe(error);
    });

    it('should handle clearError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error',
      };
      
      const action = clearError();
      const state = sceneReducer(stateWithError, action);
      
      expect(state.error).toBeNull();
    });

    it('should handle addSceneObject', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const newObject = {
        id: 'rock1',
        type: 'mesh',
        asset: {
          id: 'asset2',
          url: 'https://example.com/rock.glb',
          format: 'glb',
        },
        transform: {
          position: [2, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        properties: {},
        attribution: {
          creator: 'Rock Creator',
          source_url: 'https://example.com',
          license: 'CC0',
        },
      };
      
      const action = addSceneObject(newObject);
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.scene.objects).toHaveLength(2);
      expect(state.sceneJson?.scene.objects[1]).toEqual(newObject);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle updateSceneObject', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const updates = {
        transform: {
          position: [1, 0, 1],
          rotation: [0, 45, 0],
          scale: [1.5, 1.5, 1.5],
        },
      };
      
      const action = updateSceneObject({ id: 'tree1', updates });
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.scene.objects[0].transform.position).toEqual([1, 0, 1]);
      expect(state.sceneJson?.scene.objects[0].transform.scale).toEqual([1.5, 1.5, 1.5]);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle removeSceneObject', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const action = removeSceneObject('tree1');
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.scene.objects).toHaveLength(0);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle updateSceneBackground', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const newBackground = {
        type: 'skybox',
        value: 'https://example.com/skybox.hdr',
      };
      
      const action = updateSceneBackground(newBackground);
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.scene.background).toEqual(newBackground);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle updateSceneLighting', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const newLighting = {
        ambient: {
          intensity: 0.6,
          color: '#f0f0f0',
        },
      };
      
      const action = updateSceneLighting(newLighting);
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.scene.lighting.ambient.intensity).toBe(0.6);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle updateSceneCamera', () => {
      const stateWithScene = {
        ...initialState,
        sceneJson: mockSceneJson,
      };
      
      const newCamera = {
        type: 'perspective',
        position: [0, 10, 15],
        target: [0, 0, 0],
        fov: 60,
      };
      
      const action = updateSceneCamera(newCamera);
      const state = sceneReducer(stateWithScene, action);
      
      expect(state.sceneJson?.scene.camera.position).toEqual([0, 10, 15]);
      expect(state.sceneJson?.scene.camera.fov).toBe(60);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle handleStreamedSceneJson with valid JSON', () => {
      const validSceneJsonString = JSON.stringify(mockSceneJson);
      const action = handleStreamedSceneJson(validSceneJsonString);
      const state = sceneReducer(initialState, action);
      
      expect(state.sceneJson).toEqual(mockSceneJson);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle handleStreamedSceneJson with invalid JSON', () => {
      const invalidJsonString = '{ invalid json }';
      const action = handleStreamedSceneJson(invalidJsonString);
      const state = sceneReducer(initialState, action);
      
      expect(state.sceneJson).toBeNull();
      expect(state.error).toBe('Invalid SceneJSON received from stream');
    });
  });

  describe('async thunks', () => {
    it('should handle fetchSceneJson.pending', () => {
      const action = { type: fetchSceneJson.pending.type };
      const state = sceneReducer(initialState, action);
      
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fetchSceneJson.fulfilled', () => {
      const payload = { scene_json: mockSceneJson };
      const action = { 
        type: fetchSceneJson.fulfilled.type, 
        payload 
      };
      const state = sceneReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.sceneJson).toEqual(mockSceneJson);
      expect(state.lastUpdated).toBeTruthy();
    });

    it('should handle fetchSceneJson.rejected', () => {
      const error = 'Failed to fetch scene JSON';
      const action = { 
        type: fetchSceneJson.rejected.type, 
        payload: error 
      };
      const state = sceneReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should handle updateSceneJson.pending', () => {
      const action = { type: updateSceneJson.pending.type };
      const state = sceneReducer(initialState, action);
      
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle updateSceneJson.fulfilled', () => {
      const action = { type: updateSceneJson.fulfilled.type };
      const state = sceneReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
    });

    it('should handle updateSceneJson.rejected', () => {
      const error = 'Failed to update scene JSON';
      const action = { 
        type: updateSceneJson.rejected.type, 
        payload: error 
      };
      const state = sceneReducer(initialState, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(error);
    });
  });
});