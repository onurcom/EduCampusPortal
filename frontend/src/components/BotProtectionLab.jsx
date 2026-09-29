import React, { useState, useEffect, useRef } from 'react';

export function BotProtectionLab({ isSafeMode }) {
  // Telemetri ve Etkileşim State'leri
  const [mouseActivityCount, setMouseActivityCount] = useState(0);
  const [keyActivityCount, setKeyActivityCount] = useState(0);
  const [telemetryData, setTelemetryData] = useState(null);
  
  // Oturum ve İletişim State'leri
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('LOGGED_OUT'); // LOGGED_OUT, ACTIVE, REVOKED
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const heartbeatTimerRef = useRef(null);

  // --- İSTEMCİ TARAFINDAN FARE VE KLAVYE HAREKETİ TOPLAMA ---
  useEffect(() => {
    const handleMouseMove = () => setMouseActivityCount((prev) => prev + 1);
    const handleKeyDown = () => setKeyActivityCount((prev) => prev + 1);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- DEDEKTÖR: BROWSER FINGERPRINT VE TELEMETRİ TOPLAYICI ---
  const collectTelemetry = (forceBotMode = false) => {
    // Canvas Fingerprinting Simülasyonu
    let canvasHash = 'unknown';
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillText('EduCampus-Bot-Check', 2, 2);
      canvasHash = canvas.toDataURL().slice(-16);
    } catch (e) {
      canvasHash = 'blocked';
    }

    const realWebDriver = !!navigator.webdriver;
    const isPhantom = !!window.callPhantom || !!window._phantom;
    const isHeadlessUA = /HeadlessChrome/.test(navigator.userAgent);
    const hasLanguages = navigator.languages && navigator.languages.length > 0;

    // Otomasyon script simülasyonu veya gerçek bot sinyali
    const isBotDetected = forceBotMode || realWebDriver || isPhantom || isHeadlessUA || !hasLanguages || (mouseActivityCount === 0 && keyActivityCount === 0);

    const telemetry = {
      webdriver: forceBotMode ? true : realWebDriver,
      mouseEvents: forceBotMode ? 0 : mouseActivityCount,
      keyEvents: forceBotMode ? 0 : keyActivityCount,
      canvasHash,
      userAgent: navigator.userAgent,
      isBotDetected
    };

    setTelemetryData(telemetry);
    return telemetry;
  };

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    setLogs((prev) => [{ id: Date.now(), timestamp, msg, type }, ...prev]);
  };

  // --- GİRİŞ İŞLEMİ VE SUNUCU KONTROLÜ ---
  const handleLogin = (isSimulatedBot = false) => {
    setIsLoading(true);
    clearHeartbeat();

    const currentTelemetry = collectTelemetry(isSimulatedBot);

    addLog(
      isSimulatedBot 
        ? '🤖 Bot Scripti Tarafından Otomatik POST /api/login İstegi Gönderildi.' 
        : '👤 Kullanıcı Giriş Yap Butonuna Bastı (POST /api/login)', 
      'info'
    );

    // Sunucu Yanıtı Simülasyonu
    setTimeout(() => {
      const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ user: 'admin', bot: currentTelemetry.isBotDetected }))}.signature`;
      setSessionToken(fakeToken);
      setSessionStatus('ACTIVE');
      setIsLoading(false);

      addLog('✅ Sunucu HTTP 200 OK: Kullanıcı adı/şifre doğru. Session Cookie verildi.', 'success');

      // SAFEMODE: Arka planda telemetri analizini başlat ve 2 saniye sonra doğrulama yap
      if (isSafeMode) {
        addLog('🛡️ Safe Mode WAF: Arka plan telemetri denetimi (Post-Check) başlatıldı...', 'warning');
        
        heartbeatTimerRef.current = setTimeout(() => {
          verifySessionWithServer(currentTelemetry, fakeToken);
        }, 2000);
      } else {
        addLog('⚠️ Unsafe Mode: Telemetri kontrolü devre dışı. Oturum açık kalacak.', 'danger');
      }
    }, 800);
  };

  // --- SUNUCU TARAFINDA DİNAMİK OTURUM İPTALİ (SESSION REVOCATION) ---
  const verifySessionWithServer = (telemetry, token) => {
    addLog('📡 Arka Plan API İsteği: POST /api/verify-session (WAF Telemetry Analysis)', 'info');

    if (telemetry.isBotDetected) {
      setSessionStatus('REVOKED');
      setSessionToken(null);
      addLog('❌ SUNUCU WAF KARARI: Bot / Otomasyon Sinyali Yakalandı! (webdriver=true veya Mouse=0)', 'danger');
      addLog('🚨 HTTP 401 Unauthorized: Session ID veritabanından SILINDI. Kullanıcı Login Sayfasına Yönlendirildi!', 'danger');
    } else {
      addLog('🟢 SUNUCU WAF KARARI: Telemetri Başarılı. İnsan Davranışı Doğrulandı. Session Aktif.', 'success');
    }
  };

  const clearHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }
  };

  const handleLogout = () => {
    clearHeartbeat();
    setSessionToken(null);
    setSessionStatus('LOGGED_OUT');
    addLog('ℹ️ Oturum kullanıcı tarafından kapatıldı.', 'info');
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          Hafta 4: Bot Protection, Fingerprinting & Session Revocation
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Çalışma Modu: <strong>{isSafeMode ? 'GÜVENLİ (WAF Telemetry & Revocation Aktif)' : 'GÜVENSİZ (Telemetri Yok / Bot Geçirgen)'}</strong>
        </div>
      </div>

      {/* Aksiyon Butonları */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button 
          onClick={() => handleLogin(false)} 
          disabled={isLoading || sessionStatus === 'ACTIVE'}
          style={btnStyle('#111827')}
        >
          1. Normal İnsan Girişi Yap
        </button>

        <button 
          onClick={() => handleLogin(true)} 
          disabled={isLoading || sessionStatus === 'ACTIVE'}
          style={btnStyle('#991b1b')}
        >
          2. Otomasyon / Bot Script Simülasyonu Çalıştır
        </button>

        {sessionStatus !== 'LOGGED_OUT' && (
          <button onClick={handleLogout} style={btnStyle('#6b7280')}>
            Oturumu Kapat
          </button>
        )}
      </div>

      {/* Canlı Telemetri Paneli */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '16px', backgroundColor: '#f9fafb' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#111827' }}>
          İstemci Tarafı Canlı Telemetri ve Fingerprint Göstergeleri
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
          <div style={metricBoxStyle}>
            <span>Fare Hareket Sayısı:</span> <strong>{mouseActivityCount}</strong>
          </div>
          <div style={metricBoxStyle}>
            <span>Klavye Tuş Sayısı:</span> <strong>{keyActivityCount}</strong>
          </div>
          <div style={metricBoxStyle}>
            <span>navigator.webdriver:</span>{' '}
            <strong style={{ color: navigator.webdriver ? '#991b1b' : '#065f46' }}>
              {String(navigator.webdriver)}
            </strong>
          </div>
        </div>
      </div>

      {/* Oturum Durumu Bildirim Kutusu */}
      <div style={{ marginBottom: '16px' }}>
        {sessionStatus === 'ACTIVE' && (
          <div style={statusBanner('#d1fae5', '#065f46', '#047857')}>
            🟢 OTURUM AKTİF: Kullanıcı Paneline Erişilebilir (Token: {sessionToken?.slice(0, 25)}...)
          </div>
        )}
        {sessionStatus === 'REVOKED' && (
          <div style={statusBanner('#fee2e2', '#991b1b', '#7f1d1d')}>
            🚫 OTURUM İPTAL EDİLDİ (REVOKED): Giriş yapılmasına rağmen WAF arka planda bot aktivitesi tespit etti ve session ID'yi sildi. Login sayfasına yönlendirildiniz!
          </div>
        )}
        {sessionStatus === 'LOGGED_OUT' && (
          <div style={statusBanner('#f3f4f6', '#374151', '#4b5563')}>
            ⚪ OTURUM KAPALI: Lütfen test etmek için yukarıdaki giriş senaryolarından birini seçin.
          </div>
        )}
      </div>

      {/* Sunucu & WAF Denetim Log Akışı */}
      <div style={{ border: '1px solid #111827', borderRadius: '6px', backgroundColor: '#1e293b', padding: '12px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
          WAF & Server Audit Log Stream
        </h4>
        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
          {logs.length === 0 && <span style={{ color: '#64748b' }}>Henüz bir işlem yapılmadı...</span>}
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

// Yardımcı Stil Metotları
const btnStyle = (bg) => ({
  padding: '6px 12px',
  fontSize: '12px',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
});

const metricBoxStyle = {
  backgroundColor: '#fff',
  padding: '8px',
  border: '1px solid #e5e7eb',
  borderRadius: '4px'
};

const statusBanner = (bg, color, borderColor) => ({
  backgroundColor: bg,
  color: color,
  border: `1px solid ${borderColor}`,
  padding: '10px 12px',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: '500'
});

const logColor = (type) => {
  switch (type) {
    case 'success': return '#4ade80';
    case 'danger': return '#f87171';
    case 'warning': return '#fbbf24';
    default: return '#38bdf8';
  }
};