import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Settings } from './types';

export default function OuterRings({ settings }: { settings: Settings }) {
  const ringCount = settings.outerRingCount;
  const spacing = settings.outerSpacing;
  const ringsRef = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    state.camera.position.z -= settings.cameraSpeed;
    const cameraZ = state.camera.position.z;

    for (let i = 0; i < ringCount; i++) {
      const mesh = ringsRef.current[i] as unknown as THREE.Mesh | undefined;
      if (!mesh) continue;
      mesh.rotation.z += settings.ringRotationSpeed;

      if (mesh.position.z > cameraZ + spacing) {
        mesh.position.z -= ringCount * spacing;
      }

      const totalLen = ringCount * spacing;
      const progress = ((mesh.position.z - cameraZ + totalLen) % totalLen) / totalLen;
      const c1 = new THREE.Color(settings.color1);
      const c2 = new THREE.Color(settings.color2);
      (mesh.material as THREE.MeshPhongMaterial).color.lerpColors(c1, c2, progress);
    }
  });

  return (
    <group>
      {new Array(ringCount).fill(0).map((_, i) => (
        <mesh
          key={`ring-${i}`}
          ref={(el) => (ringsRef.current[i] = el)}
          position={[0, 0, -i * spacing]}
        >
          <torusGeometry args={[8, 0.3, 16, 32]} />
          <meshPhongMaterial color={settings.color1} shininess={settings.ringShininess} />
        </mesh>
      ))}
    </group>
  );
}
