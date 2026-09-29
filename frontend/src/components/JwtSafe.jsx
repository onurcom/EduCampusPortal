// src/components/JwtSafe.jsx
import React, { useState, useEffect } from 'react';

export function JwtSafe() {
  const [inMemoryToken, setInMemoryToken] = useState('');
  const [stolenToken, setStolenToken] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Güvenli moda geçildiğinde LocalStorage'daki eski güvensiz token'ları temizle
  useEffect(() => {
    localStorage.removeItem('jwt_token');
  }, []);

  const handleLogin = () => {
    // Güvenli Mod: LocalStorage'a HİÇBİR ŞEY YAZILMAZ.
    // Token sadece bellekte (React State) tutulur.
    const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsInJvbGUiOiJ1c2VyIn0.safe_signature_abc';
    
    localStorage.removeItem('jwt_token'); // Temizlik garantisi
    setInMemoryToken(mockJwt);
    setStolenToken('');
    setStatusMessage('Giriş başarılı. Token yalnızca bellek içinde (In-Memory / HttpOnly) tutuluyor.');
  };

  const handleLogout = () => {
    setInMemoryToken('');
    setStolenToken('');
    localStorage.removeItem('jwt_token');
    setStatusMessage('Oturum kapatıldı. Bellek temizlendi.');
  };

  // Simüle edilmiş XSS Saldırısı (Storage erişimi denenir)
  const simulateXssAttack = () => {
    const leakedLocalStorage = localStorage.getItem('jwt_token');
    
    if (leakedLocalStorage) {
      setStolenToken(leakedLocalStorage);
      setStatusMessage('XSS Saldırısı Başarılı!');
    } else {
      setStolenToken('');
      setStatusMessage('XSS Saldırısı Engellendi: Depolama alanlarında (LocalStorage) token bulunamadı.');
    }
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          2. Hafta: JWT Storage Security Lab (Güvenli - HttpOnly / In-Memory)
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Şu Anki Mod: <strong>GÜVENLİ (In-Memory / HttpOnly Cookie Simülasyonu)</strong>
        </div>
      </div>

      {/* İşlem Butonları */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handleLogin}
          style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
        >
          Oturum Aç (Login)
        </button>

        <button
          onClick={handleLogout}
          style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
        >
          Çıkış Yap (Logout)
        </button>

        <button
          onClick={simulateXssAttack}
          style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#fff', color: '#111827', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
        >
          XSS Saldırısı Çalıştır
        </button>
      </div>

      {/* Durum Mesajı */}
      {statusMessage && (
        <div style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', color: '#374151', marginBottom: '16px' }}>
          Durum: {statusMessage}
        </div>
      )}

      {/* Uygulama İçi Kullanım Durumu */}
      <div style={{ border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '12px' }}>
        <strong>Uygulama İçi Bellek Durumu (In-Memory State):</strong>
        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px', color: inMemoryToken ? '#111827' : '#9ca3af' }}>
          {inMemoryToken ? 'Token aktif (İsteklerde Authorization header olarak kullanılabilir)' : 'Token yok'}
        </div>
      </div>

      {/* Çalınan Token Çıktısı */}
      <div style={{ border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>
        <strong>XSS İle Okunabilen Depolama Verisi:</strong>
        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px', color: stolenToken ? '#111827' : '#9ca3af' }}>
          {stolenToken || 'Erişilebilir veri yok (Güvenli)'}
        </div>
      </div>
    </div>
  );
}