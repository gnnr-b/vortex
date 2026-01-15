import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

type Props = { settings: any };

const SwirlRefractionShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    strength: { value: 0.35 },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    dispersion: { value: 0.004 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    uniform float strength;
    uniform vec2 center;
    uniform float dispersion;
    varying vec2 vUv;

    // simple swirl/refraction effect without heavy bloom
    void main(){
      vec2 uv = vUv;
      vec2 coord = uv - center;
      float r = length(coord);
      float a = atan(coord.y, coord.x);

      // swirl strength falls off with radius
      float swirl = strength * (1.0 - smoothstep(0.0, 0.9, r)) * sin(3.0 * r - time * 1.8);
      float na = a + swirl;
      vec2 displaced = center + vec2(cos(na), sin(na)) * r;

      // add slight normal-like perturb from time-driven noise (cheap)
      float n = fract(sin(dot(displaced.xy ,vec2(12.9898,78.233))) * 43758.5453);
      vec2 normal = normalize(vec2(n - 0.5, fract(n*1.3) - 0.5));

      // dispersion for subtle color separation
      vec3 colR = texture2D(tDiffuse, displaced + normal * dispersion).rgb;
      vec3 colG = texture2D(tDiffuse, displaced).rgb;
      vec3 colB = texture2D(tDiffuse, displaced - normal * dispersion).rgb;

      vec3 color = vec3(colR.r, colG.g, colB.b);

      // subtle contrast boost toward center
      color *= 1.0 - 0.15 * r;

      gl_FragColor = vec4(pow(color, vec3(0.95)), 1.0);
    }
  `,
};

export default function PostProcessing({ settings }: Props) {
  const composerRef = useRef<EffectComposer | null>(null);
  const shaderPassRef = useRef<ShaderPass | null>(null);
  const { scene, gl, size, camera } = useThree();

  useEffect(() => {
    const composer = new EffectComposer(gl as any);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Swirl refraction shader pass (no bloom)
    const swirl = new ShaderPass(SwirlRefractionShader as any);
    swirl.uniforms.resolution.value = new THREE.Vector2(size.width, size.height);
    swirl.uniforms.strength.value = 0.32;
    swirl.uniforms.center.value = new THREE.Vector2(0.5, 0.5);
    swirl.uniforms.dispersion.value = 0.004;
    shaderPassRef.current = swirl;
    composer.addPass(swirl);

    composer.setSize(size.width, size.height);

    return () => {
      composer.dispose();
      composerRef.current = null;
      shaderPassRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!composerRef.current) return;
    // No bloom pass in this configuration. Update shader uniforms only.
    if (shaderPassRef.current) {
      const u = (shaderPassRef.current as any).uniforms;
      if (u.dispersion) u.dispersion.value = Math.max(0.001, (settings.innerGlowSize ?? 3.2) * 0.001);
      if (u.strength) u.strength.value = Math.max(0.05, (settings.ringRotationSpeed ?? 0.01) * 2.0);
    }
  }, [settings.innerGlowIntensity, settings.innerGlowSize]);

  useFrame((_, delta) => {
    if (!composerRef.current) return;
    if (shaderPassRef.current) {
      const u = (shaderPassRef.current as any).uniforms;
      if (u && u.time) u.time.value += delta;
    }
    composerRef.current.render(delta);
  }, 1);

  return null;
}
