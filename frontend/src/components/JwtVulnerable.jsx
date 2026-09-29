// src/components/JwtVulnerable.jsx
import React, { useState } from 'react';

export function JwtVulnerable() {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [stolenToken, setStolenToken] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Simüle edilmiş Login işlemi (Token LocalStorage'a yazılır)
  const handleLogin = () => {
    const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsInJvbGUiOiJ1c2VyIn0.vulnerable_signature_xyz';
    localStorage.setItem('jwt_token', mockJwt);
    setToken(mockJwt);
    setStolenToken('');
    setStatusMessage('Giriş başarılı. Token LocalStorage içerisine kaydedildi.');
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken('');
    setStolenToken('');
    setStatusMessage('Oturum kapatıldı. LocalStorage temizlendi.');
  };

  // Simüle edilmiş XSS Saldırısı (LocalStorage okunur)
  const simulateXssAttack = () => {
    // Saldırganın injection yoluyla çalıştırdığı kod:
    const leakedToken = localStorage.getItem('jwt_token');
    if (leakedToken) {
      setStolenToken(leakedToken);
      setStatusMessage('XSS Saldırısı Başarılı: LocalStorage içindeki JWT çalındı!');
    } else {
      setStatusMessage('Saldırı başarısız: LocalStorage içinde token bulunamadı.');
    }
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          2. Hafta: JWT Storage Security Lab (Kontrolsüz - LocalStorage)
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Şu Anki Mod: <strong>GÜVENSİZ (LocalStorage Kullanılıyor)</strong>
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

      {/* Mevcut Token Durumu */}
      <div style={{ border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '12px' }}>
        <strong>LocalStorage İçeriği (jwt_token):</strong>
        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px', color: token ? '#111827' : '#9ca3af' }}>
          {token || 'Token yok'}
        </div>
      </div>

      {/* Çalınan Token Çıktısı */}
      {stolenToken && (
        <div style={{ border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>
          <strong>XSS İle Çalınan Veri:</strong>
          <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '4px', color: '#374151' }}>
            {stolenToken}
          </div>
        </div>
      )}
    </div>
  );
}