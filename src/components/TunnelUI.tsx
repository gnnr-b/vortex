
type Props = {
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
};

export default function TunnelUI({ showOverlay, setShowOverlay, isRecording, startRecording, stopRecording }: Props) {
  return (
    <>
      {showOverlay && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', maxWidth: 520, margin: '0 16px', background: 'rgba(6,6,10,0.88)', color: '#fff', padding: 18, borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            <h2 style={{ margin: 0, marginBottom: 8 }}>Pynk</h2>
            <p style={{ margin: 0, opacity: 0.92 }}>Use the on-screen GUI to tweak colors, spacing and glow. Click "Start Recording" to record.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowOverlay(false)}
                style={{ padding: '8px 12px', borderRadius: 6, background: '#ff66cc', color: '#111', border: 'none', fontWeight: 700 }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8 }}>
        {!isRecording ? (
          <button onClick={startRecording} style={{ padding: '8px 12px', borderRadius: 6, background: '#ff66ff', color: '#111', border: 'none' }}>
            Start Recording
          </button>
        ) : (
          <>
            <div style={{ alignSelf: 'center', color: '#fff', fontWeight: 600 }}>Recording Video...</div>
            <button onClick={stopRecording} style={{ padding: '8px 12px', borderRadius: 6, background: '#ff66ff', color: '#111', border: 'none' }}>
              Stop & Save Video
            </button>
          </>
        )}
      </div>
    </>
  );
}
