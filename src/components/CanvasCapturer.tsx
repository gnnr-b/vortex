import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';

type Props = {
  isRecording: boolean;
  gifRef: React.MutableRefObject<any>;
  readCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  readCtxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  framesCapturedRef: React.MutableRefObject<number>;
};

export default function CanvasCapturer({ isRecording, gifRef, readCanvasRef, readCtxRef, framesCapturedRef }: Props) {
  const { gl } = useThree();

  useFrame(() => {
    if (isRecording && gifRef.current && gl && gl.domElement) {
      try {
        const source = gl.domElement as HTMLCanvasElement;
        const rc = readCanvasRef.current;
        const rctx = readCtxRef.current;
        if (rc && rctx) {
          if (rc.width !== source.width || rc.height !== source.height) {
            rc.width = source.width;
            rc.height = source.height;
          }
          rctx.drawImage(source, 0, 0);
          try {
            const data = rc.toDataURL('image/png');
            const img = new Image();
            img.onload = () => {
              try {
                gifRef.current.addFrame(img, { copy: true, delay: Math.round(1000 / 30) });
                framesCapturedRef.current += 1;
              } catch (e) {
                // ignore
              }
            };
            img.src = data;
          } catch (e) {
            try {
              gifRef.current.addFrame(rc, { copy: true, delay: Math.round(1000 / 30) });
              framesCapturedRef.current += 1;
            } catch (ee) {
              // ignore
            }
          }
        } else {
          try {
            const data = source.toDataURL('image/png');
            const img = new Image();
            img.onload = () => {
              try {
                gifRef.current.addFrame(img, { copy: true, delay: Math.round(1000 / 30) });
                framesCapturedRef.current += 1;
              } catch (e) {
                // ignore
              }
            };
            img.src = data;
          } catch (e) {
            try {
              gifRef.current.addFrame(source, { copy: true, delay: Math.round(1000 / 30) });
              framesCapturedRef.current += 1;
            } catch (ee) {
              // ignore
            }
          }
        }
      } catch (e) {
        // swallow capture errors
      }
    }
  });

  return null;
}
