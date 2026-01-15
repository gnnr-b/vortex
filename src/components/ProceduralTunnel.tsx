import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import GUI from 'lil-gui';
import type { Settings } from './types';
import OuterRings from './OuterRings';
import InnerShapes from './InnerShapes';
import CanvasCapturer from './CanvasCapturer';

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
    fogNear: 1,
    fogFar: 50,
    shapeType: 'cube',
  });

  const gifRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const framesCapturedRef = useRef<number>(0);
  const readCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const readCtxRef = useRef<CanvasRenderingContext2D | null>(null);

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
    outer.open();

    const inner = gui.addFolder('Inner Shapes');
    inner.add(settings, 'shapeType', ['cube', 'sphere', 'tetrahedron']).name('Shape').onChange((v: string) => setSettings(s => ({ ...s, shapeType: v })));
    inner.add(settings, 'innerWireframe').name('Wireframe').onChange((v: boolean) => setSettings(s => ({ ...s, innerWireframe: v })));
    inner.add(settings, 'innerShapesPerRing', 4, 24, 1).name('Per Ring').onChange((v: number) => setSettings(s => ({ ...s, innerShapesPerRing: v })));
    inner.add(settings, 'innerZSegments', 10, 200, 1).name('Z Segments').onChange((v: number) => setSettings(s => ({ ...s, innerZSegments: v })));
    inner.add(settings, 'innerRadius', 1, 10, 0.1).name('Radius').onChange((v: number) => setSettings(s => ({ ...s, innerRadius: v })));
    inner.add(settings, 'innerZSpacing', 0.2, 3, 0.1).name('Z Spacing').onChange((v: number) => setSettings(s => ({ ...s, innerZSpacing: v })));
    inner.add(settings, 'innerSpiralRotation', 0, 1, 0.01).name('Spiral Rot').onChange((v: number) => setSettings(s => ({ ...s, innerSpiralRotation: v })));
    inner.add(settings, 'innerAngularSpeedScale', 0, 3, 0.01).name('Speed Scale').onChange((v: number) => setSettings(s => ({ ...s, innerAngularSpeedScale: v })));
    inner.open();

    const env = gui.addFolder('Environment');
    env.addColor(settings, 'bgColor').name('BG Color').onChange((v: string) => setSettings(s => ({ ...s, bgColor: v })));
    env.add(settings, 'fogNear', 0.1, 20, 0.1).name('Fog Near').onChange((v: number) => setSettings(s => ({ ...s, fogNear: v })));
    env.add(settings, 'fogFar', 10, 200, 1).name('Fog Far').onChange((v: number) => setSettings(s => ({ ...s, fogFar: v })));
    env.open();

    return () => {
      gui.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const gifScript = 'https://unpkg.com/gif.js@0.2.0/dist/gif.js';
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${gifScript}"]`);
        if (existing) return resolve();
        const s = document.createElement('script');
        s.src = gifScript;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });

      const workerResp = await fetch('https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js');
      const workerText = await workerResp.text();
      const blob = new Blob([workerText], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      const GIFLib = (window as any).GIF || (window as any).gif;
      if (!GIFLib) {
        console.error('gif.js lib not available on window after loading script');
        return;
      }

      const gifOpts: any = { workers: 2, quality: 10, workerScript: workerUrl };
      if (canvasEl) {
        gifOpts.width = canvasEl.width;
        gifOpts.height = canvasEl.height;
      }
      const gif = new GIFLib(gifOpts);
      gifRef.current = gif;
      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'capture.gif';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        URL.revokeObjectURL(workerUrl);
      });

      console.log('GIF recorder started', { workerUrl, width: gifOpts.width, height: gifOpts.height });

      if (canvasEl) {
        try {
          const rc = document.createElement('canvas');
          rc.width = canvasEl.width;
          rc.height = canvasEl.height;
          const rctx = rc.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
          readCanvasRef.current = rc;
          readCtxRef.current = rctx;
        } catch (e) {
          readCanvasRef.current = null;
          readCtxRef.current = null;
        }
      }

      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start GIF recorder', err);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !gifRef.current) return;
    try {
      const gif = gifRef.current;
      if (framesCapturedRef.current === 0 && canvasEl) {
        try {
          gif.addFrame(canvasEl, { copy: true, delay: Math.round(1000 / 30) });
          framesCapturedRef.current += 1;
          if (framesCapturedRef.current % 10 === 0) console.log('Captured frames', framesCapturedRef.current);
        } catch (e) {
        }
      }
      gif.render();
    } catch (err) {
      console.error('Failed to stop GIF recorder', err);
    } finally {
      gifRef.current = null;
      setIsRecording(false);
      framesCapturedRef.current = 0;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
        onCreated={(state) => setCanvasEl(state.gl.domElement)}
      >
        <color attach="background" args={[new THREE.Color(settings.bgColor).getHex()]} />
        <fog attach="fog" args={[new THREE.Color(settings.bgColor).getHex(), settings.fogNear, settings.fogFar]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 10]} intensity={1} />

        <OuterRings settings={settings} />
        <InnerShapes settings={settings} />
        <CanvasCapturer isRecording={isRecording} gifRef={gifRef} readCanvasRef={readCanvasRef} readCtxRef={readCtxRef} framesCapturedRef={framesCapturedRef} />
      </Canvas>

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8 }}>
        {!isRecording ? (
          <button onClick={startRecording} style={{ padding: '8px 12px', borderRadius: 6, background: '#ff0066', color: '#fff', border: 'none' }}>
            Start Recording GIF
          </button>
        ) : (
          <>
            <div style={{ alignSelf: 'center', color: '#fff', fontWeight: 600 }}>Recording...</div>
            <button onClick={stopRecording} style={{ padding: '8px 12px', borderRadius: 6, background: '#00aaff', color: '#fff', border: 'none' }}>
              Stop & Save GIF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
