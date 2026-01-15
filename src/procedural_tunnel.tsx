import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import GUI from 'lil-gui';

type Settings = {
  color1: string;
  color2: string;
  bgColor: string;
  outerRingCount: number;
  outerSpacing: number;
  ringRotationSpeed: number;
  cameraSpeed: number;
  ringShininess: number;
  innerShapesPerRing: number;
  innerZSegments: number;
  innerRadius: number;
  innerZSpacing: number;
  innerSpiralRotation: number;
  innerAngularSpeedScale: number;
  fogNear: number;
  fogFar: number;
  shapeType: string;
};

function OuterRings({ settings }: { settings: Settings }) {
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

function InnerShapes({ settings }: { settings: Settings }) {
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
          <meshPhongMaterial color={new THREE.Color(Math.random() * 0xffffff)} shininess={50} />
        </mesh>
      ))}
    </group>
  );
}

export default function ProceduralTunnel() {
  const [settings, setSettings] = useState<Settings>({
    color1: '#ff0066',
    color2: '#00ffff',
    bgColor: '#000000',
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
    fogNear: 1,
    fogFar: 50,
    shapeType: 'cube',
  });

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

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }} style={{ position: 'absolute', inset: 0, zIndex: 0 }} gl={{ antialias: true }}>
        <color attach="background" args={[new THREE.Color(settings.bgColor).getHex()]} />
        <fog attach="fog" args={[new THREE.Color(settings.bgColor).getHex(), settings.fogNear, settings.fogFar]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 10]} intensity={1} />

        <OuterRings settings={settings} />
        <InnerShapes settings={settings} />
      </Canvas>
    </div>
  );
}