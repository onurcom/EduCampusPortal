import React, { useState } from 'react';

export function CsrfProtectionLab({ isSafeMode }) {
  const [balance, setBalance] = useState(1000);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [logs, setLogs] = useState([]);
  const [csrfToken] = useState('csrf-token-xyz-987654321-secret');

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    setLogs((prev) => [{ id: Date.now(), timestamp, msg, type }, ...prev]);
  };

  // 1. Meşru Kullanıcı Transfer İşlemi (Sol Form)
  const handleLegitimateTransfer = (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    addLog(`📩 POST /api/v1/transfer (Meşru İstek) alındı -> Alıcı: ${recipient}, Miktar: ${amount} TL`, 'info');

    setBalance((prev) => prev - Number(amount));
    if (isSafeMode) {
      addLog(`✅ Meşru Transfer Başarılı! ${amount} TL -> "${recipient}" hesabına aktarıldı. (Güvenli Mod)`, 'success');
    } else {
      addLog(`⚠️ TRANSFER GERÇEKLEŞTİ: ${amount} TL -> "${recipient}" hesabına aktarıldı.`, 'warning');
    }
    setAmount('');
    setRecipient('');
  };

  // 2. Saldırganın Çapraz Siteden Gizli CSRF Tetiklemesi (Sağ Buton)
  const triggerCsrfAttack = () => {
    const attackerAccount = "xxx"; // Saldırganın sabit hesabı
    const stolenAmount = 1000;     // Çalınmak istenen sabit miktar

    addLog('😈 Saldırgan Web Sitesi (malicious-site.com) arka planda gizli istek fırlattı!', 'warning');
    addLog(`📩 POST /api/v1/transfer (Cross-Origin CSRF İsteği) alındı -> Alıcı: ${attackerAccount}, Miktar: ${stolenAmount} TL`, 'info');

    if (isSafeMode) {
      // SAFE MODE: Koruma devreye girer
      addLog('🛡️ WAF / Tarayıcı Engeli: SameSite=Strict veya Anti-CSRF Token uyuşmazlığı yakalandı!', 'danger');
      addLog('🚨 HTTP 403 Forbidden: Saldırgan alan adından gelen sahte istek reddedildi!', 'danger');
    } else {
      // UNSAFE MODE: Açık sömürülür ve bakiye düşer
      setBalance((prev) => prev - Number(stolenAmount));
      addLog(`⚠️ CSRF SALDIRISI BAŞARILI: Tarayıcı çerezleri otomatik ekledi! ${stolenAmount} TL saldırganın hesabına (${attackerAccount}) aktarıldı!`, 'danger');
    }
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          Hafta 3: CSRF (Cross-Site Request Forgery) & Cookie Güvenliği
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Çalışma Modu: <strong>{isSafeMode ? 'GÜVENLİ (SameSite=Strict & Anti-CSRF Token)' : 'GÜVENSİZ (SameSite=None & Tokensız Cookie)'}</strong>
        </div>
      </div>

      {/* Hesap Durumu Kasa Paneli */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#166534' }}>EduCampus Hesabınız (Aktif Oturum): </span>
        <strong style={{ fontSize: '16px', color: '#15803d' }}>{balance} TL</strong>
        {isSafeMode && (
          <span style={{ marginLeft: '12px', fontSize: '11px', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', color: '#166534' }}>
            CSRF Token: {csrfToken.slice(0, 12)}...
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Meşru EduCampus Transfer Formu */}
        <div style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '6px', backgroundColor: '#ffffff' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#111827' }}>🏢 EduCampus Bakiye Transfer Formu</h4>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px 0' }}>Kullanıcının kendi iradesiyle yaptığı normal transfer formudur.</p>
          <form onSubmit={handleLegitimateTransfer}>
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Alıcı Kullanıcı (Örn: Ahmet)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <input
                type="number"
                placeholder="Miktar (TL)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button type="submit" style={btnStyle('#111827')}>Güvenli Transfer Yap</button>
          </form>
        </div>

        {/* Saldırgan Web Sitesi Simülasyonu */}
        <div style={{ border: '1px solid #fca5a5', padding: '12px', borderRadius: '6px', backgroundColor: '#fef2f2' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#991b1b' }}>😈 Sahte Hediye Sitesi (malicious-site.com)</h4>
          <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '0 0 12px 0' }}>
            Kullanıcı bu sitede butona bastığında, form alanlarından bağımsız olarak 1000 TL doğrudan saldırganın hesabına (<strong>xxx</strong>) aktarılmaya çalışılır.
          </p>
          <button type="button" onClick={triggerCsrfAttack} style={btnStyle('#dc2626')}>
            🎁 "Tebrikler! 1000 TL Ödül Kazandınız Tıklayın!" (CSRF Saldırısı)
          </button>
        </div>
      </div>

      {/* Sunucu ve Ağ Trafiği Log Akışı */}
      <div style={{ border: '1px solid #111827', borderRadius: '6px', backgroundColor: '#0f172a', padding: '12px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
          Ağ Trafiği ve HTTP Başlıkları (Network Log Stream)
        </h4>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          {logs.length === 0 && <span style={{ color: '#64748b' }}>Henüz bir ağ isteği atılmadı...</span>}
          {logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', color: logColor(log.type) }}>
              [{log.timestamp}] {log.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  fontSize: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  boxSizing: 'border-box'
};

const btnStyle = (bg) => ({
  width: '100%',
  padding: '6px 12px',
  fontSize: '12px',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
});

const logColor = (type) => {
  switch (type) {
    case 'success': return '#4ade80';
    case 'danger': return '#f87171';
    case 'warning': return '#fbbf24';
    default: return '#38bdf8';
  }
};