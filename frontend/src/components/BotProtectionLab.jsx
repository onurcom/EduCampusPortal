import React, { useState } from 'react';
import { SecurityImpactNotice } from './SecurityImpactNotice';

const LIMIT = 5;

const secureExample = `// Kavramsal Express örneği: 5 isteği aşınca challenge gerekir.
app.post('/api/login', async (req, res) => {
  const rate = await loginLimiter.consume({
    account: req.body.email,
    ip: req.ip,
  });
  const risk = await riskService.evaluate({
    account: req.body.email,
    ip: req.ip,
    failedAttempts: await attempts.count(req.body.email),
  });

  if (rate.count > 5 || risk.challengeRequired) {
    const valid = await captchaProvider.verify(
      req.body.challengeToken,
      { remoteIp: req.ip }
    );
    if (!valid) {
      return res.status(403).json({ message: 'Ek doğrulama gerekli.' });
    }
  }

  const user = await authenticate(req.body);
  if (!user) {
    return res.status(401).json({ message: 'E-posta veya parola hatalı.' });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    req.session.userId = user.id;
    res.json({ ok: true });
  });
});`;

const insecureExample = `// GÜVENSİZ: oran sınırlaması ve ek kontrol yok.
app.post('/api/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (!user) {
    return res.status(401).json({ message: 'Giriş başarısız.' });
  }

  req.session.userId = user.id;
  res.json({ ok: true });
});`;

const cardStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#fff',
  padding: '14px',
};

const inputLabelStyle = { display: 'block', marginBottom: 5, color: '#374151', fontSize: 13, fontWeight: 600 };
const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', padding: 9, marginBottom: 10, border: '1px solid #9ca3af', borderRadius: 5, fontSize: 14 };

const buttonStyle = (background, disabled = false) => ({
  border: 0,
  borderRadius: '6px',
  padding: '9px 12px',
  color: '#fff',
  background,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.55 : 1,
  fontWeight: 600,
});

function statusLabel(status) {
  return {
    idle: 'Hazır',
    active: 'Oturum açık',
    challenge: 'Ek doğrulama bekleniyor',
    revoked: 'Oturum iptal edildi',
  }[status];
}

export function BotProtectionLab({ isSafeMode = true }) {
  const [username, setUsername] = useState('ogrenci');
  const [password, setPassword] = useState('123456');
  const [requestCount, setRequestCount] = useState(0);
  const [status, setStatus] = useState('idle');
  const [challengeVerified, setChallengeVerified] = useState(false);
  const [botChallengeVerified, setBotChallengeVerified] = useState(false);
  const [challengeReason, setChallengeReason] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [compromisedData, setCompromisedData] = useState(null);
  const [logs, setLogs] = useState([
    { message: 'Laboratuvar hazır. Bütün senaryolar bu tarayıcıda simüle edilir.', type: 'info' },
  ]);

  const addLog = (message, type = 'info') => {
    setLogs((previous) => [
      { message, type, id: `${Date.now()}-${Math.random()}` },
      ...previous,
    ].slice(0, 8));
  };

  const issueDemoSession = (reason) => {
    const id = `demo-session-${Date.now().toString(36)}`;
    setSessionId(id);
    setStatus('active');
    setChallengeVerified(false);
    setBotChallengeVerified(false);
    setChallengeReason(null);
    if (!isSafeMode) {
      setCompromisedData({
        'Oturum kimliği': id,
        'Çalınan veri': `user=${username}; password=${password}; session=${id}`,
        'Açık mesaj': 'Bot koruması kapalı olduğu için otomasyon girişini başarıyla simüle etti ve oturum bilgisi elde edildi.'
      });
    } else {
      setCompromisedData(null);
    }
    addLog(`${reason} Oturum açıldı: ${id}. Bu gerçek bir kimlik bilgisi veya sunucu oturumu değildir.`, 'success');
  };

  const handleManualLogin = () => {
    if (status === 'active') return;
    if (isSafeMode && status === 'challenge') return;

    const nextCount = requestCount + 1;
    setRequestCount(nextCount);

    if (isSafeMode && nextCount > LIMIT && !challengeVerified) {
      setStatus('challenge');
      setChallengeReason('rate-limit');
      addLog(`İstek sayacı ${LIMIT} sınırını geçti (${nextCount}). Giriş devam etmeden önce CAPTCHA doğrulaması isteniyor.`, 'warning');
      return;
    }

    if (username !== 'ogrenci' || password !== '123456') {
      addLog('Kullanıcı adı veya şifre hatalı. Demo için ogrenci / 123456 bilgilerini kullanın.', 'danger');
      return;
    }

    issueDemoSession('Manuel giriş başarılı:');
  };

  const handleBotLogin = () => {
    if (status === 'active') return;

    if (isSafeMode && !botChallengeVerified) {
      setStatus('challenge');
      setChallengeReason('bot');
      addLog('Bot algılandı. Giriş yapmanız için CAPTCHA çözmeniz gerekiyor.', 'warning');
      return;
    }

    if (username !== 'ogrenci' || password !== '123456') {
      addLog('Kullanıcı adı veya şifre hatalı. Demo için ogrenci / 123456 bilgilerini kullanın.', 'danger');
      return;
    }

    setRequestCount((count) => count + 1);
    issueDemoSession(isSafeMode ? 'CAPTCHA sonrası bot giriş simülasyonu:' : 'Güvensiz modda bot girişi başarılı:');
  };

  const simulateBurst = () => {
    if (status === 'active') return;
    const nextCount = requestCount + 6;
    setRequestCount(nextCount);

    if (isSafeMode) {
      setStatus('challenge');
      setChallengeReason('rate-limit');
      addLog(`Altı hızlı istek simüle edildi (${nextCount} toplam). Sayaç ${LIMIT} sınırını geçti; giriş devam etmeden önce CAPTCHA doğrulaması isteniyor.`, 'warning');
      return;
    }

    addLog('Güvensiz modda altı hızlı istek de kabul edildi. Hız sınırı olmadığında kaynak tüketimi ve parola tahmini riski artar.', 'danger');
    issueDemoSession('Güvensiz simülasyon:');
  };

  const verifyChallenge = (passed) => {
    if (!passed) {
      setStatus('challenge');
      setChallengeVerified(false);
      setChallengeReason(challengeReason);
      addLog('Ek doğrulama başarısız. Oturum oluşturulmadı; kullanıcıya erişilebilir alternatif sunulmalıdır.', 'danger');
      return;
    }

    if (challengeReason === 'bot') {
      setBotChallengeVerified(true);
      setChallengeReason(null);
      setStatus('idle');
      addLog('CAPTCHA çözüldü. Botla giriş düğmesine yeniden basarak devam edin.', 'success');
      return;
    }

    if (challengeReason === 'rate-limit') {
      setChallengeVerified(true);
      setChallengeReason(null);
      setStatus('idle');
      addLog('CAPTCHA çözüldü. Giriş bilgilerini yeniden göndererek devam edin.', 'success');
      return;
    }

    setChallengeVerified(true);
    setChallengeReason(null);
    setStatus('idle');
    addLog('Eğitim amaçlı challenge sonucu doğrulandı. Şimdi normal giriş adımını tekrar deneyin.', 'success');
  };

  const revokeSession = () => {
    if (!sessionId) return;
    setSessionId(null);
    setStatus('revoked');
    addLog('Risk politikası oturumu iptal etti. Gerçek sistemde sunucu oturum kaydını geçersiz kılmalı ve cookie temizlenmelidir.', 'warning');
  };

  const resetLab = () => {
    setRequestCount(0);
    setChallengeVerified(false);
    setBotChallengeVerified(false);
    setChallengeReason(null);
    setSessionId(null);
    setCompromisedData(null);
    setStatus('idle');
    setLogs([{ message: 'Simülasyon sıfırlandı; yeni bir test penceresi başladı.', type: 'info' }]);
  };

  const requestPercent = Math.min((requestCount / LIMIT) * 100, 100);
  const currentCode = isSafeMode ? secureExample : insecureExample;

  return (
    <section style={{ color: '#111827', fontFamily: 'inherit' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 19, margin: 0, fontWeight: 700 }}>
          Hafta 5: Bot Koruması — sinyal, risk, hız sınırı ve oturum
        </h2>
        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.55, margin: '8px 0 0' }}>
          Amaç her otomasyonu “yakalamak” değil; kötüye kullanım maliyetini artırırken gerçek kullanıcıları
          gereksiz yere engellememektir. Aşağıdaki bütün işlemler yerel ve sentetiktir.
        </p>
        <div style={{
          display: 'inline-block',
          marginTop: 8,
          padding: '5px 9px',
          borderRadius: 5,
          background: isSafeMode ? '#dcfce7' : '#fee2e2',
          color: isSafeMode ? '#166534' : '#991b1b',
          fontWeight: 700,
          fontSize: 12,
        }}>
          {isSafeMode ? 'GÜVENLİ ÖRNEK: hız sınırı ve risk tabanlı challenge' : 'GÜVENSİZ ÖRNEK: korumalar devre dışı'}
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.8fr)', gap: 14 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Giriş bilgileri</h3>
          <p style={{ margin: '0 0 12px', padding: 9, borderRadius: 5, background: '#eff6ff', color: '#1e3a8a', fontSize: 13 }}>
            Deneme bilgileri: <strong>Kullanıcı adı: ogrenci</strong> · <strong>Şifre: 123456</strong>
          </p>
          <label htmlFor="bot-login-username" style={inputLabelStyle}>Kullanıcı adı</label>
          <input
            id="bot-login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={inputStyle}
          />
          <label htmlFor="bot-login-password" style={inputLabelStyle}>Şifre</label>
          <input
            id="bot-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" onClick={handleManualLogin} disabled={status === 'active'} style={buttonStyle('#166534', status === 'active')}>
              Manuel giriş
            </button>
            <button type="button" onClick={handleBotLogin} disabled={status === 'active'} style={buttonStyle('#7c3aed', status === 'active')}>
              Botla giriş
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={simulateBurst} disabled={status === 'active'} style={buttonStyle('#991b1b', status === 'active')}>
              6 hızlı istek simüle et
            </button>
          </div>

          {status === 'challenge' && isSafeMode && (
            <div role="group" aria-label="Ek doğrulama simülasyonu" style={{ marginTop: 14, padding: 12, border: '1px solid #f59e0b', borderRadius: 6, background: '#fffbeb' }}>
              <strong>{challengeReason === 'bot' ? 'Bot algılandı. Giriş yapmanız için CAPTCHA çözmeniz gerekiyor.' : 'CAPTCHA doğrulaması gerekli'}</strong>
              <p style={{ fontSize: 13, margin: '6px 0 10px', color: '#4b5563' }}>
                Gerçek CAPTCHA yerine, öğretim simülasyonunda doğrulama sonucunu seçin.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => verifyChallenge(true)} style={buttonStyle('#166534')}>CAPTCHA'yı çöz (simülasyon)</button>
                <button type="button" onClick={() => verifyChallenge(false)} style={buttonStyle('#991b1b')}>CAPTCHA başarısız</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
              <span><strong>Durum:</strong> {statusLabel(status)}</span>
              <span><strong>İstek sayacı:</strong> {requestCount} / {LIMIT}</span>
            </div>
            <div role="progressbar" aria-label="Simüle edilen istek sayısı" aria-valuenow={Math.min(requestCount, LIMIT)} aria-valuemin="0" aria-valuemax={LIMIT} style={{ height: 8, background: '#e5e7eb', borderRadius: 4, marginTop: 8 }}>
              <div style={{ width: `${requestPercent}%`, height: '100%', borderRadius: 4, background: requestCount >= LIMIT ? '#dc2626' : '#2563eb', transition: 'width 150ms ease' }} />
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
              {LIMIT} istek aşıldığında güvenli mod girişten önce CAPTCHA ister. Gerçek sayaç ve zaman penceresi sunucuda tutulur.
            </p>
            {sessionId && (
              <p style={{ fontSize: 13, color: '#166534', overflowWrap: 'anywhere' }}>
                <strong>Örnek oturum:</strong> {sessionId}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {status === 'active' && <button type="button" onClick={revokeSession} style={buttonStyle('#7f1d1d')}>Risk algıla ve oturumu iptal et</button>}
              <button type="button" onClick={resetLab} style={buttonStyle('#4b5563')}>Laboratuvarı sıfırla</button>
            </div>
          </div>
        </div>

        <aside style={cardStyle}>
          {!isSafeMode && compromisedData && (
            <SecurityImpactNotice
              title="Bot koruması kapalı: oturum bilgisi ve giriş verisi çalındı"
              summary="Güvensiz modda otomasyon girişinin hiç engellenmediği için saldırgan, kullanıcı adı ve şifreye yakın veriyi elde etti."
              evidence={compromisedData}
            />
          )}
          {isSafeMode && challengeReason === 'bot' ? (
            <div role="alert" style={{ padding: 11, border: '1px solid #fca5a5', borderRadius: 6, background: '#fef2f2', color: '#991b1b', fontSize: 13, lineHeight: 1.5 }}>
              <h3 style={{ margin: '0 0 7px', fontSize: 16 }}>Bot algılandı</h3>
              <p style={{ margin: 0 }}>
                Bu demoda <strong>Botla giriş</strong> düğmesi otomatik isteği temsil ettiği için bot olarak işaretlenir.
                Gerçek sistemler kısa sürede çok sayıda istek gelmesi, tuşların insan hızından çok daha hızlı gönderilmesi
                veya fare hareketlerinin olağandışı olması gibi sinyallere bakabilir. Tek bir sinyal bot olduğunu kanıtlamaz;
                sinyaller birlikte değerlendirilir. Güvenli mod CAPTCHA ister.
              </p>
            </div>
          ) : isSafeMode && challengeReason === 'rate-limit' ? (
            <div role="alert" style={{ padding: 11, border: '1px solid #fcd34d', borderRadius: 6, background: '#fffbeb', color: '#92400e', fontSize: 13, lineHeight: 1.5 }}>
              <h3 style={{ margin: '0 0 7px', fontSize: 16 }}>CAPTCHA gerekiyor</h3>
              <p style={{ margin: 0 }}>
                Kısa sürede çok sayıda istek algılandı. Devam etmek için CAPTCHA doğrulaması gereklidir.
              </p>
            </div>
          ) : (
            <>
              <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Bot koruması hakkında</h3>
              <p style={{ margin: '0 0 10px', color: '#374151', fontSize: 13, lineHeight: 1.5 }}>
                Botla giriş düğmesi otomatik bir isteği temsil eder. Güvenli mod bu isteği CAPTCHA’ya yönlendirir; güvensiz mod ise ek kontrol yapmadan kabul eder.
              </p>
              <div style={{ padding: 10, borderRadius: 5, background: '#eff6ff', color: '#1e3a8a', fontSize: 13, lineHeight: 1.5 }}>
                Gerçek sistemlerde istek sıklığı ve sunucu tarafındaki risk sinyalleri kontrol edilir. Bu laboratuvar yalnızca yerel bir simülasyondur.
              </div>
            </>
          )}
        </aside>
      </div>

      <div style={{ ...cardStyle, marginTop: 14 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Sunucu tarafı örnek akış</h3>
        <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.5, margin: '0 0 10px' }}>
          {isSafeMode
            ? 'Güvenli örnekte hız sınırı, risk değerlendirmesi ve challenge doğrulaması sunucu tarafındadır. Üretimde CAPTCHA sağlayıcısının gizli anahtarı sadece sunucuda saklanır.'
            : 'Güvensiz örnekte istek doğrudan kimlik doğrulamaya gider; bu nedenle otomatik tekrarları sınırlayan bir katman yoktur.'}
        </p>
        <pre style={{ margin: 0, padding: 12, overflowX: 'auto', borderRadius: 6, background: '#111827', color: '#e5e7eb', fontSize: 12, lineHeight: 1.55 }}>
          <code>{currentCode}</code>
        </pre>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 0 }}>
          Kod kavramsaldır; üretime almadan önce proxy/IP yapılandırması, ortak sayaç deposu, erişilebilir alternatifler,
          gizlilik ve hesap kilitleme kaynaklı hizmet engelleme riskleri değerlendirilmelidir.
        </p>
      </div>

      <div aria-live="polite" style={{ ...cardStyle, marginTop: 14 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Simülasyon günlüğü</h3>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          {logs.map((entry) => (
            <li key={entry.id || entry.message} style={{
              color: entry.type === 'danger' ? '#991b1b' : entry.type === 'success' ? '#166534' : entry.type === 'warning' ? '#92400e' : '#374151',
            }}>
              {entry.message}
            </li>
          ))}
        </ol>
      </div>

    </section>
  );
}
