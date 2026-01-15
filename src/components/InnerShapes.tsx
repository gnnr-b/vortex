import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Settings } from './types';

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
    }
  });

  return (
    <group>
      {shapes.map((s, i) => (
        <mesh
          key={`shape-${i}`}
          ref={(el) => (meshRefs.current[i] = el)}
          position={[s.x, s.y, s.z]}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
        >
          {settings.shapeType === 'sphere' ? (
            <sphereGeometry args={[0.5, 16, 16]} />
          ) : settings.shapeType === 'tetrahedron' ? (
            <tetrahedronGeometry args={[0.6]} />
          ) : (
            <boxGeometry args={[0.8, 0.8, 0.8]} />
          )}
          <meshPhongMaterial color={new THREE.Color(Math.random() * 0xffffff)} shininess={50} wireframe={settings.innerWireframe} />
        </mesh>
      ))}
    </group>
  );
}
