// src/components/SearchVulnerable.jsx
import React, { useState } from 'react';
import { SecurityImpactNotice } from './SecurityImpactNotice';

export function SearchVulnerable() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [stolenData, setStolenData] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    setSubmittedQuery(query);
    setStolenData({
      'Kullanıcı': 'ogrenci@educampus.local',
      'Çalınan cookie': 'session_id=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
      'Etkilenen alan': 'Sorgu sonucu çıktısı, kullanıcı oturumu ve test verisi'
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: '15px', margin: '0 0 12px 0' }}>Reflected XSS (Kontrolsüz)</h3>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Arama terimi giriniz..." 
          style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', flex: 1 }}
        />
        <button type="submit" style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
          Ara
        </button>
      </form>

      {submittedQuery && (
        <>
          <div style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px' }}>
            Sonuçlar gösteriliyor: <span dangerouslySetInnerHTML={{ __html: submittedQuery }} />
          </div>
          {stolenData && (
            <SecurityImpactNotice
              title="Reflected XSS ile veri sızdırıldı"
              summary="Kullanıcı arama alanı içindeki payload, DOM’a eklenince saldırganın scripti çalıştı. Bu sahte örnekte oturum bilgisi ve kişisel arama verisi çalındı."
              evidence={stolenData}
            />
          )}
        </>
      )}
    </div>
  );
}