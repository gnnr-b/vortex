import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Props = { settings?: any };

export default function VortexGlowPass({ settings }: Props) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const { gl, scene, camera, size } = useThree();
  const rtSceneRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const rtRingRef = useRef<THREE.WebGLRenderTarget | null>(null);

  useEffect(() => {
    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const rtScene = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    const rtRing = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    rtSceneRef.current = rtScene;
    rtRingRef.current = rtRing;
    return () => {
      rtScene.dispose();
      rtRing.dispose();
      rtSceneRef.current = null;
      rtRingRef.current = null;
    };
  }, [size.width, size.height]);

  useFrame((_, delta) => {
    const mat = matRef.current;
    const rtScene = rtSceneRef.current;
    const rtRing = rtRingRef.current;
    if (!mat || !rtScene || !rtRing) return;

    // animate
    mat.uniforms.u_time.value += delta;
    mat.uniforms.u_resolution.value.set(size.width, size.height);

    // render outer rings only into rtRing (use camera layer 1)
    if (meshRef.current) meshRef.current.visible = false;
    camera.layers.set(1);
    gl.setRenderTarget(rtRing);
    gl.clear();
    gl.render(scene, camera as any);

    // render full scene into rtScene
    camera.layers.set(0);
    gl.setRenderTarget(rtScene);
    gl.clear();
    gl.render(scene, camera as any);

    gl.setRenderTarget(null);
    if (meshRef.current) meshRef.current.visible = true;

    mat.uniforms.u_scene.value = rtScene.texture;
    mat.uniforms.u_ring.value = rtRing.texture;
  });

  const vertex = `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
  `;

  // swirl + selective glow shader (keeps scene contrast, boosts bright areas)
  const fragment = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D u_scene;
    uniform sampler2D u_ring;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_strength;
    uniform float u_glow;
    uniform float u_speed;

    // simple hue shift
    vec3 hueShift(vec3 col, float shift){
      float angle = shift * 6.28318;
      float s = sin(angle), c = cos(angle);
      mat3 m = mat3(
        0.299, 0.587, 0.114,
        0.299, 0.587, 0.114,
        0.299, 0.587, 0.114
      );
      return col; // keep as-is; we'll control saturation elsewhere
    }

    void main(){
      vec2 uv = vUv;
      vec2 center = vec2(0.5);
      vec2 p = uv - center;
      float r = length(p);

      // vortex: angle offset increases with radius
      float angle = atan(p.y, p.x);
      float swirl = u_strength * (0.6 * r + 0.4 * r*r) * sin(u_time * u_speed * 0.2 + r * 10.0);
      float a = angle + swirl;
      vec2 rot = vec2(cos(a), sin(a));
      vec2 sampleUV = center + vec2(rot.x, rot.y) * r;

      // chromatic dispersion: sample offset slightly per channel
      vec2 disp = normalize(p + 0.001) * (0.01 * u_strength);
      vec3 colR = texture2D(u_scene, sampleUV + disp * 0.95).rgb;
      vec3 colG = texture2D(u_scene, sampleUV + disp * 0.6).rgb;
      vec3 colB = texture2D(u_scene, sampleUV + disp * 0.3).rgb;
      vec3 scene = vec3(colR.r, colG.g, colB.b);

      // ring mask sample (use luminance of ring render)
      float ringMask = dot(texture2D(u_ring, sampleUV).rgb, vec3(0.299,0.587,0.114));
      ringMask = smoothstep(0.05, 0.25, ringMask);

      // luminance and selective glow (boost highlights)
      float lum = dot(scene, vec3(0.299, 0.587, 0.114));
      float glow = smoothstep(0.4, 0.95, lum) * u_glow;
      vec3 glowCol = scene * (1.0 + glow * 0.9);

      // soft radial vignette to keep center vivid
      float vign = smoothstep(0.95, 0.2, r);

      // combine: preserve scene contrast, add bloom-like accent for bright areas
      vec3 combined = mix(scene, glowCol, clamp(glow, 0.0, 1.0));
      combined = mix(scene, combined, 0.3 * vign + 0.1);

      // subtle color separation near bright parts
      combined += pow(max(glow - 0.18, 0.0), 1.2) * vec3(0.9,0.75,1.0) * 0.15;

      // final tone: very slight increase saturation and contrast
      vec3 avg = vec3(dot(combined, vec3(0.333)));
      combined = mix(avg, combined, 1.06);
      combined = pow(combined, vec3(0.97));

      // composite: only apply effect where ring mask is present
      float applyMask = ringMask;
      vec3 outCol = mix(scene, combined, applyMask);

      gl_FragColor = vec4(outCol, 1.0);
    }
  `;

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef as any}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={{
          u_scene: { value: null },
          u_ring: { value: null },
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(size.width, size.height) },
          u_strength: { value: 0.6 },
          u_glow: { value: 0.8 },
          u_speed: { value: 0.6 },
        }}
        transparent={false}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
