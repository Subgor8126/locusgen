"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useState } from "react";
import { SceneJSON, SceneObject } from "@/types";
import * as THREE from "three";

interface Canvas3DProps {
  onAssetClick?: (asset: SceneObject) => void;
}

// Attribution popover component
function AttributionPopover({
  object,
  position,
  onClose,
}: {
  object: SceneObject;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const attribution = object.attribution;

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border p-4 max-w-sm"
      style={{
        left: position.x + 10,
        top: position.y + 10,
        transform: "translate(0, -50%)",
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">Model Attribution</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ×
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {attribution?.creator && (
          <div>
            <span className="font-medium text-gray-700">Creator:</span>
            <span className="ml-2 text-gray-600">{attribution.creator}</span>
          </div>
        )}

        {attribution?.license && (
          <div>
            <span className="font-medium text-gray-700">License:</span>
            <span className="ml-2 text-gray-600">{attribution.license}</span>
          </div>
        )}

        {attribution?.source_url && (
          <div>
            <span className="font-medium text-gray-700">Source:</span>
            <a
              href={attribution.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              View on Sketchfab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

// Fallback scene with basic shapes when no SceneJSON
function FallbackScene() {
  return (
    <>
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#44ff44" />
      </mesh>
      <mesh position={[2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.5, 32]} />
        <meshStandardMaterial color="#4444ff" />
      </mesh>
    </>
  );
}

// Component for rendering individual scene objects
function SceneObjectRenderer({
  object,
  onAssetClick,
}: {
  object: SceneObject;
  onAssetClick?: (asset: SceneObject, event: any) => void;
}) {
  const position = object.transform?.position || [0, 0, 0];
  const rotation = object.transform?.rotation || [0, 0, 0];
  const scale = object.transform?.scale || [1, 1, 1];

  // Load the GLTF model if URL is provided
  const gltf = object.asset?.glb_url ? useGLTF(object.asset.glb_url) : null;

  return (
    <group
      position={position as [number, number, number]}
      rotation={rotation as [number, number, number]}
      scale={scale as [number, number, number]}
      onClick={(e) => {
        e.stopPropagation();
        onAssetClick?.(object, e);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {gltf ? (
          <primitive object={gltf.scene.clone()} castShadow receiveShadow />
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
        )}
      </Suspense>
    </group>
  );
}

// Component for rendering scene lighting
function SceneLighting({
  lighting,
}: {
  lighting: SceneJSON["scene"]["lighting"];
}) {
  const ambientColor = new THREE.Color(lighting.ambient.color);
  const directionalColor = lighting.directional
    ? new THREE.Color(lighting.directional.color)
    : new THREE.Color("#ffffff");

  return (
    <>
      <ambientLight
        intensity={lighting.ambient.intensity}
        color={ambientColor}
      />
      {lighting.directional && (
        <directionalLight
          position={lighting.directional.position as [number, number, number]}
          intensity={lighting.directional.intensity}
          color={directionalColor}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
      )}
    </>
  );
}

// Component for rendering scene background
function SceneBackground({
  background,
}: {
  background: SceneJSON["scene"]["background"];
}) {
  const backgroundColor = useMemo(() => {
    if (background.type === "color" && typeof background.value === "string") {
      return new THREE.Color(background.value);
    }
    return new THREE.Color("#111112");
  }, [background]);

  return <color attach="background" args={[backgroundColor]} />;
}

// Component for rendering the complete scene content
function SceneContent({
  sceneJson,
  onAssetClick,
}: {
  sceneJson: SceneJSON;
  onAssetClick?: (asset: SceneObject, event: any) => void;
}) {
  return (
    <>
      <SceneBackground background={sceneJson.scene.background} />
      <SceneLighting lighting={sceneJson.scene.lighting} />

      {sceneJson.scene.objects.map((obj) => (
        <SceneObjectRenderer
          key={obj.id}
          object={obj}
          onAssetClick={onAssetClick}
        />
      ))}
    </>
  );
}

export function Canvas3D({ onAssetClick }: Canvas3DProps) {
  const [selectedObject, setSelectedObject] = useState<SceneObject | null>(
    null
  );
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

  const handleAssetClick = (object: SceneObject, event: any) => {
    // Get mouse position for popover placement
    setPopoverPosition({ x: event.clientX, y: event.clientY });
    setSelectedObject(object);
    onAssetClick?.(object);
  };
  // Mock scene JSON with real Sketchfab models for testing
  const mockSceneJson: SceneJSON = {
    version: "1.0",
    metadata: {
      name: "Test Scene with Real Models",
      description:
        "A test scene using real Sketchfab models to test Canvas3D capabilities",
      created_at: new Date().toISOString(),
    },
    scene: {
      background: {
        type: "color",
        value: "#87CEEB",
      },
      lighting: {
        ambient: {
          intensity: 0.4,
          color: "#ffffff",
        },
        directional: {
          intensity: 1.0,
          color: "#ffffff",
          position: [10, 10, 5],
        },
      },
      camera: {
        type: "perspective",
        position: [8, 6, 8],
        target: [0, 0, 0],
        fov: 75,
      },
      objects: [
        {
          id: "house_2",
          type: "mesh",
          asset: {
            id: "c363402560a14535912508b72f2f6535",
            url: "https://sketchfab.com/3d-models/haunted-house-c363402560a14535912508b72f2f6535",
            glb_url:
              "https://locusgen-3d-models-dev.s3.amazonaws.com/models/c363402560a14535912508b72f2f6535.glb",
            format: "glb",
          },
          transform: {
            position: [-5, 0, 2],
            rotation: [0, 0.8, 0],
            scale: [0.7, 0.7, 0.7],
          },
          properties: {},
          attribution: {
            creator: "Sketchfab User",
            source_url:
              "https://sketchfab.com/3d-models/haunted-house-c363402560a14535912508b72f2f6535",
            license: "CC BY 4.0",
          },
        },
        {
          id: "car_1",
          type: "mesh",
          asset: {
            id: "acccd15d4e454399a39dbe40f4f6df71",
            url: "https://sketchfab.com/3d-models/car-acccd15d4e454399a39dbe40f4f6df71",
            glb_url:
              "https://locusgen-3d-models-dev.s3.amazonaws.com/models/acccd15d4e454399a39dbe40f4f6df71.glb",
            format: "glb",
          },
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          properties: {},
          attribution: {
            creator: "Sketchfab User",
            source_url:
              "https://sketchfab.com/3d-models/car-acccd15d4e454399a39dbe40f4f6df71",
            license: "CC BY 4.0",
          },
        },
      ],
    },
  };

  // Use mock scene instead of Redux state for testing
  const sceneJson = mockSceneJson;
  const isLoading = false;

  // Determine camera settings from SceneJSON or use defaults
  const cameraSettings = useMemo(() => {
    if (sceneJson?.scene.camera) {
      return {
        position: sceneJson.scene.camera.position as [number, number, number],
        fov: sceneJson.scene.camera.fov || 75,
      };
    }
    return {
      position: [5, 5, 5] as [number, number, number],
      fov: 75,
    };
  }, [sceneJson]);

  return (
    <div
      className="w-full h-full relative"
      style={{ backgroundColor: "#111112" }}
    >
      <Canvas
        camera={cameraSettings}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        {/* Environment and controls */}
        <Environment preset="night" />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          target={
            (sceneJson?.scene.camera.target as [number, number, number]) || [
              0, 0, 0,
            ]
          }
        />

        {/* Grid for reference */}
        <Grid
          args={[20, 20]}
          position={[0, -0.01, 0]}
          cellColor="#333333"
          sectionColor="#555555"
        />

        {/* Scene content */}
        <Suspense fallback={<LoadingFallback />}>
          {sceneJson ? (
            <SceneContent
              sceneJson={sceneJson}
              onAssetClick={handleAssetClick}
            />
          ) : (
            <FallbackScene />
          )}
        </Suspense>
      </Canvas>

      {/* Canvas overlay info */}
      <div className="absolute top-4 left-4 text-white bg-black/50 rounded-lg p-2 text-sm">
        <div>Camera: Drag to rotate, Scroll to zoom</div>
        <div className="text-gray-400 text-xs mt-1">
          {isLoading && "Loading scene..."}
          {!isLoading &&
            sceneJson &&
            `Objects: ${sceneJson.scene.objects.length}`}
          {!isLoading && !sceneJson && "No scene loaded - showing fallback"}
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-lg">Loading 3D Scene...</div>
        </div>
      )}

      {/* Attribution popover */}
      {selectedObject && (
        <AttributionPopover
          object={selectedObject}
          position={popoverPosition}
          onClose={() => setSelectedObject(null)}
        />
      )}
    </div>
  );
}
