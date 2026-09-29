// src/components/DomSafe.jsx
import React, { useState, useEffect } from 'react';

export function DomSafe() {
  const [welcomeMessage, setWelcomeMessage] = useState('Hoş geldiniz! Sayfa temasını özelleştirebilirsiniz.');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setWelcomeMessage(decodeURIComponent(hash));
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div>
      <h3 style={{ fontSize: '15px', margin: '0 0 12px 0' }}>
        EduCampus - Tema Özelleştirme (Güvenli - DOM XSS Protection)
      </h3>
      
      <div style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', marginBottom: '16px' }}>
        <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
          URL Hash üzerinden gelen karşılama mesajı:
        </div>
        {/* Güvenli Nokta: React JSX interpolation veriyi düz metin olarak basar, zararlı kod çalışmaz */}
        <div style={{ color: '#111827', fontWeight: 500 }}>
          {welcomeMessage}
        </div>
      </div>
    </div>
  );
}