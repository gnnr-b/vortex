import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import GUI from 'lil-gui';
import type { Settings } from './types';
import OuterRings from './OuterRings';
import InnerShapes from './InnerShapes';
import PostProcessing from './PostProcessing';

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
  // MediaRecorder (video) refs/state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [isMediaRecording, setIsMediaRecording] = useState(false);

  useEffect(() => {
    const gui = new GUI({ width: 300 });

    const outer = gui.addFolder('Outer Rings');
    outer.addColor(settings, 'color1').name('Color 1').onChange((v: string) => setSettings(s => ({ ...s, color1: v })));
    outer.addColor(settings, 'color2').name('Color 2').onChange((v: string) => setSettings(s => ({ ...s, color2: v })));
    outer.add(settings, 'outerRingCount', 10, 200, 1).name('Ring Count').onChange((v: number) => setSettings(s => ({ ...s, outerRingCount: v })));
    outer.add(settings, 'outerSpacing', 0.5, 5, 0.1).name('Spacing').onChange((v: number) => setSettings(s => ({ ...s, outerSpacing: v })));
    outer.add(settings, 'ringRotationSpeed', 0, 0.2, 0.001).name('Ring Rot Speed').onChange((v: number) => setSettings(s => ({ ...s, ringRotationSpeed: v })));
    outer.add(settings, 'cameraSpeed', 0, 1, 0.01).name('Camera Speed').onChange((v: number) => setSettings(s => ({ ...s, cameraSpeed: v })));
    outer.add(settings, 'ringShininess', 0, 200, 1).name('Shininess').onChange((v: number) => setSettings(s => ({ ...s, ringShininess: v })));
    // Ensure folders start closed on initial load
    try { outer.close(); } catch { /* ignore if API differs */ }

    const inner = gui.addFolder('Inner Shapes');
    inner.add(settings, 'shapeType', ['cube', 'sphere', 'tetrahedron']).name('Shape').onChange((v: string) => setSettings(s => ({ ...s, shapeType: v })));
    inner.add(settings, 'innerWireframe').name('Wireframe').onChange((v: boolean) => setSettings(s => ({ ...s, innerWireframe: v })));
    inner.add(settings, 'innerShapesPerRing', 4, 24, 1).name('Per Ring').onChange((v: number) => setSettings(s => ({ ...s, innerShapesPerRing: v })));
    inner.add(settings, 'innerZSegments', 10, 200, 1).name('Z Segments').onChange((v: number) => setSettings(s => ({ ...s, innerZSegments: v })));
    inner.add(settings, 'innerRadius', 1, 10, 0.1).name('Radius').onChange((v: number) => setSettings(s => ({ ...s, innerRadius: v })));
    inner.add(settings, 'innerZSpacing', 0.2, 3, 0.1).name('Z Spacing').onChange((v: number) => setSettings(s => ({ ...s, innerZSpacing: v })));
    inner.add(settings, 'innerSpiralRotation', 0, 1, 0.01).name('Spiral Rot').onChange((v: number) => setSettings(s => ({ ...s, innerSpiralRotation: v })));
    inner.add(settings, 'innerAngularSpeedScale', 0, 3, 0.01).name('Speed Scale').onChange((v: number) => setSettings(s => ({ ...s, innerAngularSpeedScale: v })));
    inner.add(settings, 'innerGlowEnabled').name('Glow Enabled').onChange((v: boolean) => setSettings(s => ({ ...s, innerGlowEnabled: v })));
    inner.addColor(settings, 'innerGlowColor').name('Glow Color').onChange((v: string) => setSettings(s => ({ ...s, innerGlowColor: v })));
    inner.add(settings, 'innerGlowIntensity', 6.0, 12, 0.1).name('Glow Intensity').onChange((v: number) => setSettings(s => ({ ...s, innerGlowIntensity: v })));
    inner.add(settings, 'innerGlowSize', 3.2, 8, 0.05).name('Glow Size').onChange((v: number) => setSettings(s => ({ ...s, innerGlowSize: v })));
    try { inner.close(); } catch { /* ignore if API differs */ }

    const env = gui.addFolder('Environment');
    env.addColor(settings, 'bgColor').name('BG Color').onChange((v: string) => setSettings(s => ({ ...s, bgColor: v })));
    env.add(settings, 'fogNear', 0.1, 20, 0.1).name('Fog Near').onChange((v: number) => setSettings(s => ({ ...s, fogNear: v })));
    env.add(settings, 'fogFar', 10, 200, 1).name('Fog Far').onChange((v: number) => setSettings(s => ({ ...s, fogFar: v })));
    try { env.close(); } catch { /* ignore if API differs */ }

    

    

    return () => {
      gui.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  const startMediaRecording = async () => {
    if (isMediaRecording || !canvasEl) return;
    try {
      const stream = (canvasEl as HTMLCanvasElement).captureStream(30); // target 30fps
      mediaStreamRef.current = stream;

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      } else {
        options = { mimeType: 'video/webm' };
      }

      const recorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'capture.webm';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        // stop all tracks from the stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsMediaRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsMediaRecording(true);
    } catch (err) {
      console.error('Failed to start MediaRecorder', err);
    }
  };

  const stopMediaRecording = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch (e) {
      console.error('Error stopping MediaRecorder', e);
    }
  };

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

      {showOverlay && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', maxWidth: 520, margin: '0 16px', background: 'rgba(6,6,10,0.88)', color: '#fff', padding: 18, borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            <h2 style={{ margin: 0, marginBottom: 8 }}>Pynk</h2>
            <p style={{ margin: 0, opacity: 0.92 }}>Interactive 3D tunnel with adjustable rings and inner shapes. Use the on-screen GUI to tweak colors, spacing and glow. Click "Start Recording Video" to record.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowOverlay(false)}
                style={{ padding: '8px 12px', borderRadius: 6, background: '#ff66cc', color: '#111', border: 'none', fontWeight: 700 }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8 }}>
        {/* MediaRecorder (video) controls */}
        {!isMediaRecording ? (
          <button onClick={startMediaRecording} style={{ padding: '8px 12px', borderRadius: 6, background: '#ff66ff', color: '#111', border: 'none' }}>
            Start Recording
          </button>
        ) : (
          <>
            <div style={{ alignSelf: 'center', color: '#fff', fontWeight: 600 }}>Recording Video...</div>
            <button onClick={stopMediaRecording} style={{ padding: '8px 12px', borderRadius: 6, background: '#ff66ff', color: '#111', border: 'none' }}>
              Stop & Save Video
            </button>
          </>
        )}
      </div>
    </div>
  );
}
