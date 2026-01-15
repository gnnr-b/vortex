import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Settings } from './types';

function makeGlowTexture(hexColor: string, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, hexColor);
  grad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export default function InnerShapes({ settings }: { settings: Settings }) {
  const zSegments = settings.innerZSegments;
  const shapesPerRing = settings.innerShapesPerRing;
  const radius = settings.innerRadius;
  const zSpacing = settings.innerZSpacing;
  const spiralRotation = settings.innerSpiralRotation;

  const shapes = useMemo(() => {
    const result: Array<any> = [];
    for (let z = 0; z < zSegments; z++) {
      for (let i = 0; i < shapesPerRing; i++) {
        const baseAngle = (i / shapesPerRing) * Math.PI * 2;
        const spiralOffset = z * spiralRotation;
        const phase = Math.random() * Math.PI * 2;
        const speedBase = 0.6 + (z / zSegments) * 0.8;
        const angularSpeed = speedBase * (0.8 + Math.random() * 0.8) * settings.innerAngularSpeedScale;
        const angle = baseAngle + spiralOffset + phase;
        result.push({
          baseAngle,
          spiralOffset,
          phase,
          angularSpeed,
          radius,
          zIndex: z,
          angle,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: -z * zSpacing,
        });
      }
    }
    return result;
  }, [settings.shapeType, zSegments, shapesPerRing, radius, zSpacing, spiralRotation, settings.innerAngularSpeedScale]);

  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const spriteRefs = useRef<Array<THREE.Sprite | null>>([]);

  const { camera } = useThree();

  useFrame(() => {
    const t = performance.now() * 0.001;
    const cameraZ = (camera.position.z as number) || 0;

    for (let i = 0; i < shapes.length; i++) {
      const m = meshRefs.current[i];
      if (!m) continue;
      const ud = shapes[i];
      const angle = ud.baseAngle + ud.spiralOffset + ud.phase + t * ud.angularSpeed;
      m.position.x = Math.cos(angle) * ud.radius;
      m.position.y = Math.sin(angle) * ud.radius;

      m.rotation.x += 0.01 + (i % 3) * 0.002;
      m.rotation.y += 0.01 + (i % 4) * 0.002;

      if (m.position.z > cameraZ + 5) {
        m.position.z -= zSegments * zSpacing;
        ud.phase = Math.random() * Math.PI * 2;
        ud.angularSpeed = 0.6 + Math.random() * 1.0;
      }
      const sp = spriteRefs.current[i];
      if (sp) {
        sp.position.x = m.position.x;
        sp.position.y = m.position.y;
        sp.position.z = m.position.z + 0.01;
        // scale sprite slightly with pulsing
        const pulse = 1 + Math.sin(t * 4 + i) * 0.08;
        sp.scale.set(settings.innerGlowSize * pulse, settings.innerGlowSize * pulse, 1);
        sp.material.opacity = settings.innerGlowEnabled ? Math.min(1, (settings.innerGlowIntensity || 1) * 0.5) : 0;
      }
    }
  });

  return (
    <group>
      {shapes.map((s, i) => (
        <>
        <mesh
            key={`shape-${i}`}
            ref={(el) => (meshRefs.current[i] = el)}
            position={[s.x, s.y, s.z]}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
            castShadow
            receiveShadow
          >
          {settings.shapeType === 'sphere' ? (
            <sphereGeometry args={[0.5, 16, 16]} />
          ) : settings.shapeType === 'tetrahedron' ? (
            <tetrahedronGeometry args={[0.6]} />
          ) : (
            <boxGeometry args={[0.8, 0.8, 0.8]} />
          )}
          <meshStandardMaterial
            color={new THREE.Color(Math.random() * 0xffffff)}
            emissive={new THREE.Color(settings.innerGlowColor || settings.color1)}
            emissiveIntensity={settings.innerGlowIntensity || 1}
            roughness={0.1}
            metalness={0.0}
            wireframe={settings.innerWireframe}
          />
        </mesh>

        {/* additive sprite halo to fake a bloom/halo per-shape */}
        <sprite key={`glow-${i}`} ref={(el) => (spriteRefs.current[i] = el)} position={[s.x, s.y, s.z + 0.01]} scale={[settings.innerGlowSize, settings.innerGlowSize, 1]} renderOrder={100}>
          <spriteMaterial
            map={makeGlowTexture(settings.innerGlowColor || settings.color1)}
            color={new THREE.Color(settings.innerGlowColor || settings.color1).getHex()}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={settings.innerGlowEnabled ? Math.min(1, (settings.innerGlowIntensity || 1) * 0.5) : 0}
          />
        </sprite>
      </>
      ))}
    </group>
  );
}
