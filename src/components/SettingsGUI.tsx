import { useEffect } from 'react';
import GUI from 'lil-gui';
import type { Settings } from './types';

type Props = {
  settings: Settings;
  setSettings: (s: Settings | ((s: Settings) => Settings)) => void;
};

export default function SettingsGUI({ settings, setSettings }: Props) {
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
    try { outer.close(); } catch { /* ignore if API differs */ }

    const inner = gui.addFolder('Inner Shapes');
    inner.add(settings, 'shapeType', ['cube', 'sphere', 'tetrahedron']).name('Shape').onChange((v: string) => setSettings(s => ({ ...s, shapeType: v })));
    inner.add(settings, 'innerWireframe').name('Wireframe').onChange((v: boolean) => setSettings(s => ({ ...s, innerWireframe: v })));
    inner.add(settings, 'innerShapesPerRing', 4, 24, 1).name('Per Ring').onChange((v: number) => setSettings(s => ({ ...s, innerShapesPerRing: v })));
    inner.add(settings, 'innerZSegments', 10, 200, 1).name('Z Segments').onChange((v: number) => setSettings(s => ({ ...s, innerZSegments: v })));
    inner.add(settings, 'innerRadius', 1, 10, 0.1).name('Radius').onChange((v: number) => setSettings(s => ({ ...s, innerRadius: v })));
    inner.add(settings, 'innerZSpacing', 0.2, 3, 0.1).name('Z Spacing').onChange((v: number) => setSettings(s => ({ ...s, innerZSpacing: v })));
    inner.add(settings, 'innerSpiralRotation', 0, 1, 0.01).name('Spiral Rot').onChange((v: number) => setSettings(s => ({ ...s, innerSpiralRotation: v })));
    inner.add(settings, 'innerAngularSpeedScale', 0, 3, 0.01).name('Speed Scale').onChange((v: number) => setSettings(s => ({ ...s, innerAngularSpeedScale: v })));
    inner.add(settings, 'innerGlowEnabled').name('Glow Enabled').onChange((v: boolean) => setSettings(s => ({ ...s, innerGlowEnabled: v })));
    inner.addColor(settings, 'innerGlowColor').name('Glow Color').onChange((v: string) => setSettings(s => ({ ...s, innerGlowColor: v })));
    inner.add(settings, 'innerGlowIntensity', 6.0, 12, 0.1).name('Glow Intensity').onChange((v: number) => setSettings(s => ({ ...s, innerGlowIntensity: v })));
    inner.add(settings, 'innerGlowSize', 3.2, 8, 0.05).name('Glow Size').onChange((v: number) => setSettings(s => ({ ...s, innerGlowSize: v })));
    try { inner.close(); } catch { /* ignore if API differs */ }

    const env = gui.addFolder('Environment');
    env.addColor(settings, 'bgColor').name('BG Color').onChange((v: string) => setSettings(s => ({ ...s, bgColor: v })));
    env.add(settings, 'fogNear', 0.1, 20, 0.1).name('Fog Near').onChange((v: number) => setSettings(s => ({ ...s, fogNear: v })));
    env.add(settings, 'fogFar', 10, 200, 1).name('Fog Far').onChange((v: number) => setSettings(s => ({ ...s, fogFar: v })));
    try { env.close(); } catch { /* ignore if API differs */ }

    return () => gui.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
