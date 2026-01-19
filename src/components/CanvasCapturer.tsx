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
      // Try to read pixels from the WebGL drawing buffer (works even when preserveDrawingBuffer=false if read during frame)
      const rawCtx = (gl.getContext && (gl.getContext() as unknown)) as WebGLRenderingContext | null;
      if (rawCtx && rc && rctx) {
        const width = source.width;
        const height = source.height;
        const required = width * height * 4;
        let buf = pixelBufferRef.current;
        if (!buf || buf.length !== required) {
          buf = new Uint8Array(required);
          pixelBufferRef.current = buf;
        }

        rawCtx.readPixels(0, 0, width, height, rawCtx.RGBA, rawCtx.UNSIGNED_BYTE, buf);

        // flip Y while copying into ImageData because WebGL's framebuffer is bottom-up
        const imageData = rctx.createImageData(width, height);
        const row = width * 4;
        for (let y = 0; y < height; y++) {
          const srcStart = (height - 1 - y) * row;
          const dstStart = y * row;
          imageData.data.set(buf.subarray(srcStart, srcStart + row), dstStart);
        }
        rctx.putImageData(imageData, 0, 0);
        gifRef.current.addFrame(rc, { copy: true, delay: Math.round(1000 / CAPTURE_FPS) });
      } else if (rc && rctx) {
        // fallback: drawImage
        if (rc.width !== source.width || rc.height !== source.height) {
          rc.width = source.width;
          rc.height = source.height;
        }
        rctx.drawImage(source, 0, 0);
        gifRef.current.addFrame(rc, { copy: true, delay: Math.round(1000 / CAPTURE_FPS) });
      } else {
        gifRef.current.addFrame(source, { copy: true, delay: Math.round(1000 / CAPTURE_FPS) });
      }

      framesCapturedRef.current += 1;
    } catch (e) {
      // swallow capture errors
    }
  });

  return null;
}
