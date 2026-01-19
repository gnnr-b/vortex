import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { Settings } from './types';
import OuterRings from './OuterRings';
import InnerShapes from './InnerShapes';
import PostProcessing from './PostProcessing';
import SettingsGUI from './SettingsGUI';
import useMediaRecorder from './useMediaRecorder';
import TunnelUI from './TunnelUI';

export default function ProceduralTunnel() {
  const [settings, setSettings] = useState<Settings>({
    // Neon palette centered on fuchsia/pink
    color1: '#ff00ff',
    color2: '#00ffe1',
    bgColor: '#0b0014',
    outerRingCount: 50,
    outerSpacing: 2,
    ringRotationSpeed: 0.01,
    cameraSpeed: 0.05,
    ringShininess: 100,
    innerShapesPerRing: 12,
    innerZSegments: 50,
    innerRadius: 5,
    innerZSpacing: 1.5,
    innerSpiralRotation: 0.3,
    innerAngularSpeedScale: 1.0,
    innerWireframe: false,
    // Inner glow defaults (start high)
    innerGlowEnabled: true,
    innerGlowColor: '#ff66ff',
    innerGlowIntensity: 6.0,
    innerGlowSize: 3.2,
    fogNear: 1,
    fogFar: 50,
    shapeType: 'cube',
  });
  
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  const { isRecording, startRecording, stopRecording } = useMediaRecorder();

  const handleStartRecording = () => startRecording(canvasEl);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', zIndex: 0 }}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 5], fov: 75 }}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
          onCreated={(state) => setCanvasEl(state.gl.domElement)}
        >
        <color attach="background" args={[new THREE.Color(settings.bgColor).getHex()]} />
        <fog attach="fog" args={[new THREE.Color(settings.bgColor).getHex(), settings.fogNear, settings.fogFar]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          castShadow
          position={[5, 10, 5]}
          intensity={1.2}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
        />
        <pointLight position={[0, 0, 10]} intensity={0.6} castShadow />

        <OuterRings settings={settings} />
        <InnerShapes settings={settings} />
        <PostProcessing settings={settings} />
      </Canvas>

      <SettingsGUI settings={settings} setSettings={setSettings} />
      <TunnelUI
        showOverlay={showOverlay}
        setShowOverlay={setShowOverlay}
        isRecording={isRecording}
        startRecording={handleStartRecording}
        stopRecording={stopRecording}
      />
    </div>
  );
}
