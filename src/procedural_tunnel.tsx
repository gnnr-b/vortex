import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function ProceduralTunnel() {
  const containerRef = useRef(null);
  const [color1, setColor1] = useState('#ff0066');
  const [color2, setColor2] = useState('#00ffff');
  const [shapeType, setShapeType] = useState('cube');
  const sceneRef = useRef(null);
  const innerShapesRef = useRef([]);
  const outerRingsRef = useRef([]);

  // Helper to create geometry for a given shape type
  const createShape = (type: string) => {
    let geometry;
    switch (type) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        break;
      case 'tetrahedron':
        geometry = new THREE.TetrahedronGeometry(0.6);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    }
    return geometry;
  };

  // Create or recreate inner shapes; safe to call from any hook
  const createInnerShapes = (type: string) => {
    const scene = sceneRef.current as THREE.Scene | null;
    if (!scene) return;

    // Clear existing shapes
    innerShapesRef.current.forEach((s: THREE.Object3D) => scene.remove(s));
    innerShapesRef.current = [];

    const innerShapes: THREE.Mesh[] = [];
    const zSegments = 50;
    const shapesPerRing = 12;
    const radius = 5;
    const zSpacing = 1.5;
    const spiralRotation = 0.3; // Rotation per segment to create spiral

    for (let z = 0; z < zSegments; z++) {
      for (let i = 0; i < shapesPerRing; i++) {
        const geometry = createShape(type);
        const material = new THREE.MeshPhongMaterial({
          color: Math.random() * 0xffffff,
          shininess: 50,
        });
        const shape = new THREE.Mesh(geometry, material);

        const baseAngle = (i / shapesPerRing) * Math.PI * 2;
        const spiralOffset = z * spiralRotation;

        const phase = Math.random() * Math.PI * 2;
        const speedBase = 0.6 + (z / zSegments) * 0.8;
        const angularSpeed = speedBase * (0.8 + Math.random() * 0.8);

        const angle = baseAngle + spiralOffset + phase;

        shape.position.x = Math.cos(angle) * radius;
        shape.position.y = Math.sin(angle) * radius;
        shape.position.z = -z * zSpacing;

        shape.rotation.x = Math.random() * Math.PI;
        shape.rotation.y = Math.random() * Math.PI;

        (shape as any).userData = {
          baseAngle,
          spiralOffset,
          phase,
          angularSpeed,
          radius,
          zIndex: z,
        };

        scene.add(shape);
        innerShapes.push(shape);
      }
    }

    innerShapesRef.current = innerShapes;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    // Ensure the canvas fills the container even if Tailwind isn't present
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    containerRef.current.appendChild(canvas);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);

    // Create outer tunnel (rings)
    const outerRings = [];
    const ringCount = 50;
    const spacing = 2;

    for (let i = 0; i < ringCount; i++) {
      const geometry = new THREE.TorusGeometry(8, 0.3, 16, 32);
      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.z = -i * spacing;
      scene.add(ring);
      outerRings.push(ring);
    }
    outerRingsRef.current = outerRings;

    // create inner shapes now that scene is available
    createInnerShapes(shapeType);

    // Animation
    let cameraZ = 5;
    const animate = () => {
      requestAnimationFrame(animate);

      // Move camera forward
      cameraZ -= 0.05;
      camera.position.z = cameraZ;

      // Loop outer rings
      outerRings.forEach((ring, i) => {
        ring.rotation.z += 0.01;
        
        // Reset position when ring passes camera
        if (ring.position.z > cameraZ + spacing) {
          ring.position.z -= ringCount * spacing;
        }

        // Color gradient
        const progress = ((ring.position.z - cameraZ + ringCount * spacing) % (ringCount * spacing)) / (ringCount * spacing);
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        ring.material.color.lerpColors(c1, c2, progress);
      });

      // Per-shape vortex motion: update polar angle for each shape independently
      const zSegments = 50;
      const zSpacing = 1.5;
      const t = performance.now() * 0.001;

      innerShapesRef.current.forEach((shape: any, i) => {
        const ud = shape.userData || {};
        const baseAngle = ud.baseAngle ?? 0;
        const spiralOffset = ud.spiralOffset ?? 0;
        const phase = ud.phase ?? 0;
        const angularSpeed = ud.angularSpeed ?? 0.8;
        const radiusVal = ud.radius ?? 5;

        const angle = baseAngle + spiralOffset + phase + t * angularSpeed;
        shape.position.x = Math.cos(angle) * radiusVal;
        shape.position.y = Math.sin(angle) * radiusVal;

        // small per-shape self-rotation for visual variety
        shape.rotation.x += 0.01 + (i % 3) * 0.002;
        shape.rotation.y += 0.01 + (i % 4) * 0.002;

        // Reset position when shape passes camera and randomize phase to avoid unison
        if (shape.position.z > cameraZ + 5) {
          shape.position.z -= zSegments * zSpacing;
          shape.userData.phase = Math.random() * Math.PI * 2;
          shape.userData.angularSpeed = 0.6 + Math.random() * 1.0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update colors
  useEffect(() => {
    if (!sceneRef.current || !outerRingsRef.current.length) return;
    
    outerRingsRef.current.forEach((ring, i) => {
      const progress = i / outerRingsRef.current.length;
      const c1 = new THREE.Color(color1);
      const c2 = new THREE.Color(color2);
      ring.material.color.lerpColors(c1, c2, progress);
    });
  }, [color1, color2]);

  // Update shape type
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    
    // Recreate shapes using the shared creation helper so they include userData
    innerShapesRef.current.forEach(s => scene.remove(s));
    innerShapesRef.current = [];
    createInnerShapes(shapeType);
  }, [shapeType]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, background: 'rgba(17,17,17,0.9)', padding: 12, borderRadius: 8, color: '#fff' }}>
        <h2 className="text-white text-xl font-bold mb-4">Tunnel Controls</h2>
        
        <div className="mb-4">
          <label className="text-white block mb-2">Outer Tunnel Color 1:</label>
          <input
            type="color"
            value={color1}
            onChange={(e) => setColor1(e.target.value)}
            className="w-full h-10 cursor-pointer"
          />
        </div>

        <div className="mb-4">
          <label className="text-white block mb-2">Outer Tunnel Color 2:</label>
          <input
            type="color"
            value={color2}
            onChange={(e) => setColor2(e.target.value)}
            className="w-full h-10 cursor-pointer"
          />
        </div>

        <div className="mb-4">
          <label className="text-white block mb-2">Inner Tunnel Shape:</label>
          <select
            value={shapeType}
            onChange={(e) => setShapeType(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
          >
            <option value="cube">Cubes</option>
            <option value="sphere">Spheres</option>
            <option value="tetrahedron">Tetrahedrons</option>
          </select>
        </div>
      </div>

      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />
    </div>
  );
}