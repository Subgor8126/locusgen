import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Canvas3D } from '../Canvas3D';
import { SceneJSON } from '@/types';

// Mock React Three Fiber and Drei components
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode; camera?: any }) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
    <div data-testid="r3f-canvas" data-camera={JSON.stringify(props.camera)}>
      {children}
    </div>
  ),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls">OrbitControls</div>,
  Environment: ({ preset }: { preset?: string }) => <div data-testid="environment">Environment: {preset}</div>,
  Grid: ({ args }: { args?: number[] }) => <div data-testid="grid">Grid: {args?.join('x')}</div>,
  Text: ({ children, position, color }: { children: React.ReactNode; position?: number[]; color?: string }) => (
    <div data-testid="text" data-position={position?.join(',')} data-color={color}>
      {children}
    </div>
  ),
}));

describe('Canvas3D', () => {
  it('renders default scene when no sceneJson provided', () => {
    render(<Canvas3D />);

    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
    expect(screen.getByTestId('environment')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toBeInTheDocument();
    
    // Check for default scene text
    expect(screen.getByText('3D Scene Canvas')).toBeInTheDocument();
    expect(screen.getByText('Start chatting to generate your scene')).toBeInTheDocument();
  });

  it('renders scene content when sceneJson is provided', () => {
    const mockSceneJson: SceneJSON = {
      version: '1.0',
      metadata: {
        name: 'Forest Scene',
        description: 'A beautiful forest',
        created_at: '2024-01-01T00:00:00Z',
      },
      scene: {
        background: { type: 'color', value: '#87CEEB' },
        lighting: {
          ambient: { intensity: 0.4, color: '#ffffff' },
          directional: { intensity: 1, color: '#ffffff', position: [10, 10, 5] },
        },
        camera: { type: 'perspective', position: [5, 5, 5], target: [0, 0, 0] },
        objects: [
          {
            id: 'tree-1',
            type: 'mesh',
            transform: {
              position: [1, 0, 1],
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
          {
            id: 'rock-1',
            type: 'mesh',
            transform: {
              position: [-1, 0, -1],
              rotation: [0, 0.5, 0],
              scale: [0.8, 0.8, 0.8],
            },
            properties: {},
            attribution: {
              creator: 'Another Creator',
              source_url: 'https://example2.com',
              license: 'MIT',
            },
          },
        ],
      },
    };

    render(<Canvas3D sceneJson={mockSceneJson} />);

    // Should show the scene name
    expect(screen.getByText('Forest Scene')).toBeInTheDocument();
    expect(screen.getByText('SceneJSON loaded - Full rendering coming soon')).toBeInTheDocument();
  });

  it('displays canvas overlay with correct information', () => {
    render(<Canvas3D />);

    expect(screen.getByText('Camera: Drag to rotate, Scroll to zoom')).toBeInTheDocument();
    expect(screen.getByText('Default scene')).toBeInTheDocument();
  });

  it('shows object count in overlay when sceneJson is provided', () => {
    const mockSceneJson: SceneJSON = {
      version: '1.0',
      metadata: {
        name: 'Test Scene',
        description: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      },
      scene: {
        background: { type: 'color', value: '#000000' },
        lighting: { ambient: { intensity: 0.5, color: '#ffffff' } },
        camera: { type: 'perspective', position: [0, 0, 5], target: [0, 0, 0] },
        objects: [
          {
            id: 'obj-1',
            type: 'mesh',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            properties: {},
            attribution: { creator: 'Test', source_url: 'test', license: 'test' },
          },
          {
            id: 'obj-2',
            type: 'mesh',
            transform: { position: [1, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            properties: {},
            attribution: { creator: 'Test', source_url: 'test', license: 'test' },
          },
        ],
      },
    };

    render(<Canvas3D sceneJson={mockSceneJson} />);

    expect(screen.getByText('Objects: 2')).toBeInTheDocument();
  });

  it('configures camera correctly', () => {
    render(<Canvas3D />);

    const canvas = screen.getByTestId('r3f-canvas');
    const cameraData = JSON.parse(canvas.getAttribute('data-camera') || '{}');
    
    expect(cameraData.position).toEqual([5, 5, 5]);
    expect(cameraData.fov).toBe(75);
  });

  it('handles asset click callback', () => {
    const mockOnAssetClick = vi.fn();
    const mockSceneJson: SceneJSON = {
      version: '1.0',
      metadata: {
        name: 'Test Scene',
        description: 'Test',
        created_at: '2024-01-01T00:00:00Z',
      },
      scene: {
        background: { type: 'color', value: '#000000' },
        lighting: { ambient: { intensity: 0.5, color: '#ffffff' } },
        camera: { type: 'perspective', position: [0, 0, 5], target: [0, 0, 0] },
        objects: [
          {
            id: 'test-object',
            type: 'mesh',
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            properties: {},
            attribution: { creator: 'Test', source_url: 'test', license: 'test' },
          },
        ],
      },
    };

    render(<Canvas3D sceneJson={mockSceneJson} onAssetClick={mockOnAssetClick} />);

    // The onAssetClick callback should be passed to the scene content
    // In a real test, we would simulate a click event on a mesh
    // For now, we just verify the component renders without errors
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });
});