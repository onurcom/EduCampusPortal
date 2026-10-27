import React from 'react';

export function LabDemoCapture({ capture, title = 'Simüle edilen yakalanan veri' }) {
  if (!capture) return null;

  return (
    <section aria-live="polite" style={capturePanelStyle}>
      <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: '#991b1b' }}>{title}</h3>
      <div style={{ marginBottom: '8px', fontSize: '11px', color: '#7f1d1d' }}>
        Yerel eğitim alıcısı · {capture.event} · Sentetik demo verisi
      </div>
      <pre style={captureCodeStyle}>{JSON.stringify(capture.data, null, 2)}</pre>
    </section>
  );
}

const capturePanelStyle = {
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  backgroundColor: '#fff7f7',
  padding: '12px',
  marginBottom: '16px'
};

const captureCodeStyle = {
  margin: 0,
  padding: '10px',
  borderRadius: '4px',
  backgroundColor: '#1f2937',
  color: '#fecaca',
  fontFamily: 'monospace',
  fontSize: '12px',
  lineHeight: 1.5,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap'
};