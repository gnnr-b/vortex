import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

type Props = {
  isRecording: boolean;
  gifRef: MutableRefObject<any>;
  readCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  readCtxRef: MutableRefObject<CanvasRenderingContext2D | null>;
  framesCapturedRef: MutableRefObject<number>;
};

export default function CanvasCapturer({ isRecording, gifRef, readCanvasRef, readCtxRef, framesCapturedRef }: Props) {
  const { gl } = useThree();

  const pixelBufferRef = useRef<Uint8Array | null>(null);
  const lastCaptureRef = useRef<number>(0);
  const CAPTURE_FPS = 15; // throttle capture to reduce CPU/GPU load
  const CAPTURE_SCALE = 0.6; // downscale factor for frames before encoding

  useFrame(() => {
    if (!isRecording || !gifRef.current || !gl || !gl.domElement) return;

    const now = performance.now();
    const interval = 1000 / CAPTURE_FPS;
    if (now - lastCaptureRef.current < interval) return;
    lastCaptureRef.current = now;

    const source = gl.domElement as HTMLCanvasElement;
    const rc = readCanvasRef.current;
    const rctx = readCtxRef.current;

    try {
      // Use drawImage on the canvas (reliable when preserveDrawingBuffer is true).
      // Log diagnostic info to help debug blank frames.
      // eslint-disable-next-line no-console
      console.debug('CanvasCapturer: capture', {
        isRecording,
        hasGif: !!gifRef.current,
        hasRC: !!rc,
        hasRctx: !!rctx,
        sourceW: source ? source.width : null,
        sourceH: source ? source.height : null,
      });

      if (rc && rctx) {
        const scaledW = Math.max(1, Math.round(source.width * CAPTURE_SCALE));
        const scaledH = Math.max(1, Math.round(source.height * CAPTURE_SCALE));
        if (rc.width !== scaledW || rc.height !== scaledH) {
          rc.width = scaledW;
          rc.height = scaledH;
        }

        // Attempt immediate draw into the smaller canvas; if we observe blank frames, retry next tick.
        try {
          rctx.drawImage(source, 0, 0, scaledW, scaledH);
        } catch (drawErr) {
          // eslint-disable-next-line no-console
          console.warn('CanvasCapturer drawImage failed, retrying next tick', drawErr);
          setTimeout(() => {
            try { rctx.drawImage(source, 0, 0, scaledW, scaledH); } catch (e) { /* swallow */ }
          }, 0);
        }

        gifRef.current.addFrame(rc, { copy: true, delay: Math.round(1000 / CAPTURE_FPS) });
      } else {
        // No intermediate canvas available - fall back to adding the source (full size)
        gifRef.current.addFrame(source, { copy: true, delay: Math.round(1000 / CAPTURE_FPS) });
      }

      framesCapturedRef.current += 1;
    } catch (e) {
      // surface capture errors to console for debugging
      // eslint-disable-next-line no-console
      console.error('CanvasCapturer capture error:', e);
    }
  });

  return null;
}
