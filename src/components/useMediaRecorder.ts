import { useRef, useState } from 'react';

export default function useMediaRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async (canvasEl: HTMLCanvasElement | null) => {
    if (isRecording || !canvasEl) return;
    try {
      const stream = canvasEl.captureStream(30);
      mediaStreamRef.current = stream;

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      } else {
        options = { mimeType: 'video/webm' };
      }

      const recorder = new MediaRecorder(stream, options);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'capture.webm';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      // swallow; caller can inspect console if needed
      // eslint-disable-next-line no-console
      console.error('Failed to start MediaRecorder', err);
    }
  };

  const stopRecording = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error stopping MediaRecorder', e);
    }
  };

  return { isRecording, startRecording, stopRecording } as const;
}
