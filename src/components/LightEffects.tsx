import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Settings } from './types';

function makeFlareTexture(color: string, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, color);
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export default function LightEffects({ settings }: { settings: Settings }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  const beams = useMemo(() => {
    const out: { angle: number; radius: number; offset: number }[] = [];
    for (let i = 0; i < Math.max(1, settings.beamCount); i++) {
      const t = i / Math.max(1, settings.beamCount);
      const angle = t * Math.PI * 2 + (i % 2 === 0 ? 0.1 : -0.08);
      const radius = 6 + (i % 3) * 1.5;
      const offset = (i % 2 === 0 ? 0.2 : -0.15) * settings.beamSpread;
      out.push({ angle, radius, offset });
    }
    return out;
  }, [settings.beamCount, settings.beamSpread]);

  const flareTex = useMemo(() => makeFlareTexture(settings.beamColor), [settings.beamColor]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((c, idx) => {
      // gentle sway and pulsing
      const pulse = 0.6 + Math.sin(t * 2 + idx) * 0.4;
      (c as THREE.Mesh).material.opacity = (settings.beamIntensity * pulse) as any;
    });
  });

  if (!settings.lightBeamsEnabled && !settings.flareEnabled) return null;

  return (
    <group ref={groupRef}>
      {settings.lightBeamsEnabled && beams.map((b, i) => {
        const x = Math.cos(b.angle) * b.radius;
        const y = Math.sin(b.angle) * b.radius * 0.3;
        const z = -2 - i * (settings.beamLength / Math.max(1, settings.beamCount));
        const coneHeight = settings.beamLength;
        const coneRadius = Math.max(0.2, settings.beamSpread * 1.5);
        return (
          <mesh
            key={`beam-${i}`}
            position={[x + b.offset, y, z]}
            rotation={[-Math.PI / 2, 0, b.angle + Math.PI / 4]}
            renderOrder={10}
          >
            <coneGeometry args={[coneRadius, coneHeight, 16, 1]} />
            <meshBasicMaterial
              color={new THREE.Color(settings.beamColor).getHex()}
              transparent
              opacity={settings.beamIntensity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {settings.flareEnabled && Array.from({ length: settings.flareCount }).map((_, i) => {
        const angle = (i / Math.max(1, settings.flareCount)) * Math.PI * 2;
        const r = 4 + (i % 3) * 0.8;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.4;
        const z = -1 - (i % 5) * 0.5;
        return (
          <sprite key={`flare-${i}`} position={[x, y, z]} scale={[settings.flareSize, settings.flareSize, 1]}>
            <spriteMaterial map={flareTex} color={new THREE.Color(settings.beamColor).getHex()} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={settings.flareIntensity} />
          </sprite>
        );
      })}
    </group>
  );
}
