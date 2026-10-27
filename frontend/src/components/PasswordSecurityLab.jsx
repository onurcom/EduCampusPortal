import React, { useEffect, useState } from 'react';
import { SecurityImpactNotice } from './SecurityImpactNotice';

const insecureExample = `// ❌ Parolayı düz metin saklamak
const user = {
  email: req.body.email,
  password: req.body.password
};
await db.users.insert(user);

// Sızıntıda parolalar okunabilir; yeniden kullanım riski büyür.`;

const secureExample = `import argon2 from 'argon2';

// Kayıt: Argon2id her parola için rastgele salt üretir.
const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456, // KiB
  timeCost: 2,
  parallelism: 1
});
await db.users.insert({ email, passwordHash });

// Giriş: salt ve parametreler hash içinden okunur.
const valid = await argon2.verify(user.passwordHash, password);
if (!valid) {
  return res.status(401).json({
    message: 'E-posta veya parola hatalı.'
  });
}`;

const defenseExample = `import rateLimit from 'express-rate-limit';

app.use('/api/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
}));

// MFA: parola doğru olsa da ikinci doğrulamayı iste.
if (user.mfaEnabled && !verifyTOTP(user, req.body.code)) {
  return res.status(401).json({
    message: 'Ek doğrulama gerekli veya bilgiler hatalı.'
  });
}`;

export function PasswordSecurityLab({ isSafeMode }) {
  const [demoPassword, setDemoPassword] = useState('');
  const [hashes, setHashes] = useState(null);
  const [hashError, setHashError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (lockSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setLockSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [lockSeconds]);

  const addEvent = (message, type = 'info') => {
    setEvents((previous) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString('tr-TR'),
        message,
        type
      },
      ...previous
    ]);
  };

  const generateSaltedHashes = async () => {
    setHashes(null);
    setHashError('');

    if (!demoPassword) {
      setHashError('Karşılaştırma için önce örnek bir parola yazın.');
      return;
    }

    if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
      setHashError('Web Crypto kullanılamıyor. Güvenli bağlamda (HTTPS veya localhost) yeniden deneyin.');
      return;
    }

    try {
      const encoder = new TextEncoder();
      const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const firstSaltBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const secondSaltBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const firstSalt = toHex(firstSaltBytes);
      const secondSalt = toHex(secondSaltBytes);
      const digest = async (salt) => {
        const result = await window.crypto.subtle.digest(
          'SHA-256',
          encoder.encode(`${salt}:${demoPassword}`)
        );
        return toHex(new Uint8Array(result));
      };

      const [plainDigest, firstDigest, secondDigest] = await Promise.all([
        window.crypto.subtle.digest('SHA-256', encoder.encode(demoPassword)),
        digest(firstSalt),
        digest(secondSalt)
      ]);

      setHashes({
        plain: toHex(new Uint8Array(plainDigest)),
        firstSalt,
        first: firstDigest,
        secondSalt,
        second: secondDigest
      });
      addEvent('Aynı örnek parola için hash üretildi; rastgele salt kullanıldığında özetler farklı.', 'success');
    } catch (error) {
      setHashError(`Hash örneği üretilemedi: ${error.message}`);
    }
  };

  const simulateFailedLogin = () => {
    if (lockSeconds > 0) return;
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);

    if (nextAttempts >= 5) {
      setLockSeconds(30);
      addEvent('Demo hesabı geçici olarak kilitlendi. Gerçek sistemde IP/hesap bazlı hız sınırlama ve izleme gerekir.', 'danger');
      return;
    }

    addEvent('401 — E-posta veya parola hatalı. Yanıt, hesabın varlığını açıklamaz.', 'warning');
  };

  const resetAttempts = () => {
    if (lockSeconds > 0) return;
    setFailedAttempts(0);
    addEvent('Yerel demo deneme sayacı sıfırlandı.', 'info');
  };

  const code = isSafeMode ? secureExample : insecureExample;

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          Hafta 9: Kimlik Doğrulama Zafiyetleri ve Parola Güvenliği
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#4b5563', margin: '6px 0 0' }}>
          Parolayı veritabanında nasıl saklarız ve giriş uç noktasını otomatik denemelere karşı
          nasıl koruruz? Aşağıdaki örnekler yalnızca tarayıcıda çalışır.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <ConceptCard title="Brute-force" text="Bir hesaba çok sayıda parola denemesi yapılması. Hız sınırlama ve gecikme kullanın." />
        <ConceptCard title="Credential stuffing" text="Başka bir sızıntıdan alınan kullanıcı/parola çiftlerinin yeniden denenmesi. Her sitede farklı parola kullanın." />
        <ConceptCard title="Password spraying" text="Az sayıda yaygın parolanın çok sayıda hesapta denenmesi. Hesap ve IP bazlı anomali izleyin." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <ConceptCard title="Salt (tuz)" text="Her parola için farklı, rastgele değer. Salt gizli değildir; eş parolaların aynı hash'i vermesini önler." />
        <ConceptCard title="Pepper (biber)" text="Veritabanından ayrı bir secret manager/HSM içinde tutulan ek sır. İstemciye veya veritabanına koymayın." />
        <ConceptCard title="Key stretching" text="Argon2id, bcrypt veya PBKDF2 ile doğrulamayı bilinçli olarak maliyetli yapın; MD5/SHA-1/SHA-256 tek başına parola hash'i değildir." />
      </div>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 6px', color: '#111827' }}>Salt deneyi: aynı parola, farklı özet</h3>
        <p style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5, margin: '0 0 10px' }}>
          Gerçek veya kullandığınız bir parolayı girmeyin. Bu demo yalnızca tarayıcıda SHA-256 ile
          salt farkını gösterir; SHA-256 parola saklamak için yeterince yavaş değildir.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="password"
            autoComplete="off"
            value={demoPassword}
            onChange={(event) => { setDemoPassword(event.target.value); setHashes(null); setHashError(''); }}
            placeholder="Yalnızca örnek bir parola yazın"
            aria-label="Örnek parola"
            style={inputStyle}
          />
          <button type="button" onClick={generateSaltedHashes} style={buttonStyle('#1d4ed8')}>
            Salt/hash karşılaştır
          </button>
          <button type="button" onClick={() => { setDemoPassword(''); setHashes(null); setHashError(''); }} style={buttonStyle('#475569')}>
            Temizle
          </button>
        </div>
        {hashError && <p role="alert" style={{ color: '#b91c1c', fontSize: '12px', marginBottom: 0 }}>{hashError}</p>}
        {hashes && (
          <div style={{ display: 'grid', gap: '7px', marginTop: '12px' }}>
            <HashRow label="Salt olmadan SHA-256 (aynı parola → aynı hash)" value={hashes.plain} />
            <HashRow label={`Salt A: ${hashes.firstSalt}`} value={hashes.first} />
            <HashRow label={`Salt B: ${hashes.secondSalt}`} value={hashes.second} />
            <strong style={{ color: '#047857', fontSize: '11px' }}>
              Salt A ve B farklı olduğu için aynı parola farklı özet üretti. Üretimde Argon2id gibi parola hash algoritması kullanın.
            </strong>
          </div>
        )}

        {!isSafeMode && demoPassword && (
          <SecurityImpactNotice
            title="Düz metin parola sızdırıldı"
            summary="Bu güvensiz örnekte parola veritabanında doğrudan saklanır. Sızıntı sonrası saldırgan aynı kullanıcı/parola çiftini başka sistemlerde de deneyebilir."
            evidence={{
              'Örnek parola': demoPassword,
              'Sızıntı türü': 'Veritabanı açıklaması / plaintext password',
              'Risk': 'Aynı parola tekrar kullanılırsa hesaplar birden fazla yerde çalınmış olur.'
            }}
          />
        )}
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 6px', color: '#111827' }}>Giriş koruması: hız sınırlama simülasyonu</h3>
        <p style={{ color: '#64748b', fontSize: '11px', margin: '0 0 10px' }}>
          Bu buton gerçek giriş isteği göndermez. Beş başarısız demo denemesinden sonra arayüz 30 saniye bekletir.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={simulateFailedLogin} disabled={lockSeconds > 0} style={buttonStyle(lockSeconds > 0 ? '#94a3b8' : '#b91c1c')}>
            {lockSeconds > 0 ? `Bekleyin: ${lockSeconds} sn` : 'Başarısız giriş denemesini simüle et'}
          </button>
          <button type="button" onClick={resetAttempts} disabled={lockSeconds > 0} style={buttonStyle('#475569')}>
            Sayaç sıfırla
          </button>
          <span style={{ fontSize: '12px', color: '#374151' }}>Başarısız deneme: <strong>{failedAttempts}/5</strong></span>
        </div>
        <p style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.5, marginBottom: 0 }}>
          Üretimde sadece istemci sayacına güvenmeyin: sınırı sunucuda uygulayın; kullanıcıya genel hata mesajı verin,
          MFA sunun ve denemeleri izleyin. IP tek başına yeterli bir kilitleme ölçütü değildir.
        </p>
      </section>

      <section style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ padding: '9px 12px', backgroundColor: isSafeMode ? '#ecfdf5' : '#fff1f2', color: isSafeMode ? '#065f46' : '#9f1239', fontSize: '12px', fontWeight: 700 }}>
          {isSafeMode ? 'Güvenli örnek: Argon2id ile hash ve doğrulama' : 'Güvensiz örnek: düz metin parola saklama'}
        </div>
        <pre style={{ margin: 0, padding: '12px', overflowX: 'auto', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '11px', lineHeight: 1.55 }}>
          <code>{code}</code>
        </pre>
        {isSafeMode && (
          <pre style={{ margin: 0, padding: '12px', overflowX: 'auto', backgroundColor: '#111827', color: '#bfdbfe', fontSize: '11px', lineHeight: 1.55, borderTop: '1px solid #334155' }}>
            <code>{defenseExample}</code>
          </pre>
        )}
      </section>

      <div style={{ border: '1px solid #111827', borderRadius: '6px', backgroundColor: '#0f172a', padding: '12px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '11px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: '12px' }}>Eğitim denetim kayıtları (yerel demo)</h3>
        <div aria-live="polite" style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {events.length === 0 && <span style={{ color: '#64748b' }}>Salt deneyi veya başarısız giriş simülasyonu başlatın.</span>}
          {events.map((event) => (
            <div key={event.id} style={{ marginBottom: '4px', color: event.type === 'danger' ? '#fca5a5' : event.type === 'success' ? '#86efac' : event.type === 'warning' ? '#fcd34d' : '#cbd5e1' }}>
              [{event.time}] {event.message}
            </div>
          ))}
        </div>
      </div>
      <p style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.5, marginTop: '10px' }}>
        Argon2id parametrelerini sunucunuzda benchmark edin; sunumdaki hedef bir doğrulama için en az 250 ms'dir.
        Pepper kullanılıyorsa veritabanından ayrı yönetin. Bu laboratuvar gerçek kullanıcı hesabı veya parola servisi değildir.
      </p>
    </div>
  );
}

function ConceptCard({ title, text }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc' }}>
      <strong style={{ display: 'block', color: '#0f172a', fontSize: '11px', marginBottom: '4px' }}>{title}</strong>
      <span style={{ color: '#475569', fontSize: '10px', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function HashRow({ label, value }) {
  return (
    <div style={{ padding: '7px', borderRadius: '4px', backgroundColor: '#f8fafc', overflowWrap: 'anywhere' }}>
      <strong style={{ display: 'block', fontSize: '10px', color: '#334155', marginBottom: '3px' }}>{label}</strong>
      <code style={{ fontSize: '10px', color: '#0369a1' }}>{value}</code>
    </div>
  );
}

const inputStyle = {
  flex: '1 1 220px',
  minHeight: '34px',
  boxSizing: 'border-box',
  padding: '7px 9px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  fontSize: '12px'
};

const buttonStyle = (backgroundColor) => ({
  minHeight: '34px',
  padding: '7px 10px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor,
  color: '#fff',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600
});
