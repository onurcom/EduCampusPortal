// src/components/DomVulnerable.jsx
import React, { useState, useEffect } from 'react';

export function DomVulnerable() {
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
        EduCampus - Tema Özelleştirme (Kontrolsüz - DOM XSS Vulnerable)
      </h3>
      
      <div style={{ padding: '10px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', marginBottom: '16px' }}>
        <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
          URL Hash üzerinden gelen karşılama mesajı:
        </div>
        {/* Zafiyetli Nokta: Hash ile gelen veri kontrol edilmeden HTML olarak DOM'a enjekte edilir */}
        <div dangerouslySetInnerHTML={{ __html: welcomeMessage }} style={{ color: '#111827', fontWeight: 500 }} />
      </div>
    </div>
  );
}