import React from 'react';

const normalizeRows = (evidence) => {
  if (!evidence) return [];
  if (Array.isArray(evidence)) {
    return evidence.map((entry) => {
      if (Array.isArray(entry)) return [entry[0], entry[1]];
      if (entry && typeof entry === 'object') {
        const [key, value] = Object.entries(entry)[0] || ['', ''];
        return [key, value];
      }
      return ['Veri', entry];
    });
  }

  if (typeof evidence === 'object') {
    return Object.entries(evidence);
  }

  return [['Veri', evidence]];
};

export function SecurityImpactNotice({ title = 'Saldırı başarılı', summary, evidence }) {
  const rows = normalizeRows(evidence);

  return (
    <aside style={{
      marginTop: 16,
      padding: 14,
      borderRadius: 8,
      border: '1px solid #fca5a5',
      background: '#fef2f2',
      color: '#7f1d1d',
      boxShadow: 'inset 0 0 0 1px rgba(127,29,29,0.04)',
    }}>
      <div style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8 }}>
        Hacker-Backend / Çalınan Veri
      </div>
      <h3 style={{ margin: '8px 0 6px', fontSize: 16, color: '#991b1b' }}>{title}</h3>
      {summary && <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.6 }}>{summary}</p>}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: 6, fontSize: 12, lineHeight: 1.5 }}>
          {rows.map(([key, value], index) => (
            <div key={`${key}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 140px) 1fr', gap: 8, alignItems: 'start' }}>
              <strong style={{ color: '#7f1d1d' }}>{key}</strong>
              <span style={{ wordBreak: 'break-word', color: '#4c0519' }}>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
