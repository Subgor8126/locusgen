// Basic type definitions for the 3D Scene Generator

export interface User {
  id: string;
  name: string;
  email: string;
  cognitoSub: string;
}

export interface Project {
  id: string;
  name: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  sceneJson?: SceneJSON;
  isAnonymous?: boolean;
  prompt?: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface BackgroundConfig {
  type: 'color' | 'skybox' | 'environment';
  value: string | Record<string, unknown>;
}

export interface LightingConfig {
  ambient: {
    intensity: number;
    color: string;
  };
  directional?: {
    intensity: number;
    color: string;
    position: [number, number, number];
  };
}

export interface CameraConfig {
  type: 'perspective' | 'orthographic';
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export interface SceneJSON {
  version: string;
  metadata: {
    name: string;
    description: string;
    created_at: string;
  };
  scene: {
    background: BackgroundConfig;
    lighting: LightingConfig;
    camera: CameraConfig;
    objects: SceneObject[];
  };
}

export interface SceneObject {
  id: string;
  type: 'mesh' | 'light' | 'camera';
  asset?: AssetReference;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  properties: Record<string, string | number | boolean>;
  attribution: AttributionInfo;
}

export interface AssetReference {
  id: string;
  url: string;
  glb_url?: string;
  format: string;
}

export interface AttributionInfo {
  creator: string;
  source_url: string;
  license: string;
}

export interface Asset {
  id: string;
  name: string;
  sourceUrl: string;
  creator: string;
  licenseType: string;
  fileFormat: string;
  createdAt: string;
}