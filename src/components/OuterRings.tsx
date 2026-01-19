import { useRef } from 'react';
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

      // keep the material color equal to the precomputed base color
      const base = (mesh.userData as any)?.baseColor as THREE.Color | undefined;
      if (base) {
        (mesh.material as THREE.MeshPhongMaterial).color.copy(base);
      }
    }
  });

  return (
    <group>
      {new Array(ringCount).fill(0).map((_, i) => {
        const tube = Math.max(0.3, spacing * 0.5 + 0.02);
        const t = ringCount > 1 ? i / (ringCount - 1) : 0;
        const baseColor = new THREE.Color(settings.color1).lerp(new THREE.Color(settings.color2), t);
        const hsl = { h: 0, s: 0, l: 0 } as { h: number; s: number; l: number };
        baseColor.getHSL(hsl);
        // shift hue slightly per-ring and boost saturation for neon feel
        hsl.h = (hsl.h + i * 0.02) % 1;
        hsl.s = Math.min(1, hsl.s * 1.25 + 0.08);
        hsl.l = Math.min(1, Math.max(0.18, hsl.l * 1.05 + 0.02));
        baseColor.setHSL(hsl.h, hsl.s, hsl.l);
        const colorNum = baseColor.getHex();

        return (
          <mesh
            key={`ring-${i}`}
            ref={(el) => {
              ringsRef.current[i] = el;
              if (el) (el.userData as any).baseColor = baseColor;
            }}
            position={[0, 0, -i * spacing]}
            castShadow
            receiveShadow
          >
            <torusGeometry args={[8, tube, 32, 64]} />
            <meshPhongMaterial color={colorNum} shininess={settings.ringShininess} wireframe />
          </mesh>
        );
      })}
    </group>
  );
}
