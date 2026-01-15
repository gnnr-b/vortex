import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import type { Settings } from './types';

export default function BloomComposer({ settings }: { settings: Settings }) {
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.setSize(size.width, size.height);
    composer.renderToScreen = true;

    const renderPass = new RenderPass(scene, camera as unknown as THREE.Camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), settings.bloomStrength ?? 1.0, settings.bloomRadius ?? 0.5, settings.bloomThreshold ?? 0.85);
    composer.addPass(bloomPass);

    composerRef.current = composer;
    bloomRef.current = bloomPass;

    return () => {
      composer.dispose();
      composerRef.current = null;
      bloomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bloomRef.current) return;
    bloomRef.current.strength = settings.bloomStrength ?? bloomRef.current.strength;
    bloomRef.current.radius = settings.bloomRadius ?? bloomRef.current.radius;
    bloomRef.current.threshold = settings.bloomThreshold ?? bloomRef.current.threshold;
  }, [settings.bloomStrength, settings.bloomRadius, settings.bloomThreshold]);

  useEffect(() => {
    const handle = () => {
      if (composerRef.current) composerRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useFrame((_, delta) => {
    if (!composerRef.current) return;
    if (settings.bloomEnabled) {
      composerRef.current.render(delta);
    }
  }, 1);

  return null;
}
