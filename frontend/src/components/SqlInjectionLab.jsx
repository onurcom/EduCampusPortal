import React, { useState } from 'react';
import { SecurityImpactNotice } from './SecurityImpactNotice';

const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'okul123';
const INJECTION_EXAMPLE = "admin' -- ";

const codePanelStyle = {
  margin: 0,
  padding: 12,
  overflowX: 'auto',
  borderRadius: 6,
  background: '#111827',
  color: '#e5e7eb',
  fontSize: 13,
  lineHeight: 1.6,
};

export function SqlInjectionLab({ isSafeMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);

  const vulnerableQuery = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}';`;
  const parameterizedQuery = 'SELECT * FROM users WHERE username = ? AND password = ?;';
  const injectionUsed = username.trim() === INJECTION_EXAMPLE.trim();

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!isSafeMode && injectionUsed) {
      setResult({
        success: true,
        message: "Güvensiz sorguda -- sonrası yorum sayıldı; parola koşulu devre dışı kaldı. Bu yalnızca yerel bir simülasyondur.",
        stolenData: {
          'Hesap': 'admin',
          'Çalınan veri': 'admin_email=admin@educampus.local, rol=admin, son_giris=2026-10-27T09:18:00Z',
          'Sonuç': 'Sorgu yorumlandığı için parola kontrolü atlandı; saldırgan tüm kullanıcı kayıtlarına erişebildi.'
        },
      });
      return;
    }

    const validCredentials = username === DEMO_USERNAME && password === DEMO_PASSWORD;
    setResult(validCredentials
      ? { success: true, message: 'Kullanıcı adı ve parola eşleşti. Örnek giriş başarılı.' }
      : {
        success: false,
        message: isSafeMode && injectionUsed
          ? "Güvenli sorguda giriş, SQL kodu olarak değil metin olarak ele alındı; eşleşme bulunamadı."
          : 'Kullanıcı adı veya parola hatalı.',
      });
  };

  const fillInjectionExample = () => {
    setUsername(INJECTION_EXAMPLE);
    setPassword('parola önemli değil');
    setResult(null);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setResult(null);
  };

  return (
    <section style={{ maxWidth: 820, margin: '0 auto', color: '#111827', fontFamily: 'inherit' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 19, margin: 0, fontWeight: 700 }}>Hafta 7: SQL Injection — basit giriş örneği</h2>
        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.55, margin: '8px 0' }}>
          SQL Injection, kullanıcı girdisinin sorgu koduna karışmasıyla oluşur. Aynı örneği güvenli ve güvensiz modda
          deneyerek farkı görebilirsin.
        </p>
        <strong style={{ color: isSafeMode ? '#047857' : '#b91c1c', fontSize: 13 }}>
          {isSafeMode ? 'GÜVENLİ: Parametreli sorgu simülasyonu' : 'GÜVENSİZ: Metin birleştirme simülasyonu'}
        </strong>
      </header>

      <div style={{ padding: 14, border: '1px solid #bfdbfe', borderRadius: 8, background: '#eff6ff', marginBottom: 14 }}>
        <strong>Örnek hesap</strong>
        <p style={{ margin: '6px 0 0', color: '#374151', fontSize: 13 }}>
          Kullanıcı adı: <code>{DEMO_USERNAME}</code> · Parola: <code>{DEMO_PASSWORD}</code>
          <br />
          Bu bilgiler yalnızca laboratuvardaki sahte hesap içindir; gerçek bir sisteme bağlanılmaz.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 14, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
            Kullanıcı adı
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              style={inputStyle}
              placeholder="admin"
            />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600 }}>
            Parola
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              style={inputStyle}
              placeholder="Parolayı gir"
            />
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button type="submit" style={buttonStyle('#2563eb')}>Girişi dene</button>
          <button type="button" onClick={fillInjectionExample} style={buttonStyle('#b91c1c')}>Örnek SQL girdisini doldur</button>
          <button type="button" onClick={resetForm} style={buttonStyle('#4b5563')}>Temizle</button>
        </div>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <article style={panelStyle}>
          <h3 style={headingStyle}>Güvensiz yaklaşım: metni birleştirme</h3>
          <pre style={codePanelStyle}><code>{vulnerableQuery}</code></pre>
          <p style={descriptionStyle}>
            Girdi sorgu metnine doğrudan ekleniyor. Örnek girdideki <code>--</code>, SQL’de devamındaki kısmı yorum
            yapabilir; bu yüzden parola koşulu etkisiz kalabilir.
          </p>
        </article>
        <article style={panelStyle}>
          <h3 style={headingStyle}>Güvenli yaklaşım: parametre kullan</h3>
          <pre style={codePanelStyle}><code>{parameterizedQuery}</code></pre>
          <p style={descriptionStyle}>
            Sorgu yapısı ve kullanıcı değerleri ayrı gönderilir. Veritabanı girdiyi SQL komutu değil, karşılaştırılacak
            metin olarak işler.
          </p>
        </article>
      </div>

      {result && (
        <div role="status" style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 6,
          border: `1px solid ${result.success ? '#86efac' : '#fcd34d'}`,
          background: result.success ? '#f0fdf4' : '#fffbeb',
          color: result.success ? '#166534' : '#92400e',
        }}>
          <strong>{result.success ? 'Giriş başarılı' : 'Giriş başarısız'}</strong>
          <p style={{ margin: '5px 0 0', fontSize: 13, lineHeight: 1.5 }}>{result.message}</p>
          {isSafeMode && injectionUsed && !result.success && (
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              Bu modda parametreler ayrı tutulduğu için <code>{INJECTION_EXAMPLE.trim()}</code> bir komut gibi çalışmaz.
            </p>
          )}
        </div>
      )}

      {!isSafeMode && result?.stolenData && (
        <SecurityImpactNotice
          title="SQL Injection sonucu veriler sızdırıldı"
          summary="Sorgu metni ve kullanıcı girişi ayrılmadığı için saldırgan, parola kontrolünü bypass edip veritabanının hassas alanlarını okuyabildi."
          evidence={result.stolenData}
        />
      )}

      <aside style={{ marginTop: 14, padding: 12, borderLeft: '4px solid #2563eb', background: '#f8fafc', color: '#374151', fontSize: 13, lineHeight: 1.55 }}>
        <strong>Öğrenme adımı:</strong> Önce güvenli modda örnek girdiyi doldurup deneyin; sonra sayfanın üstündeki
        güvenli mod seçimini kapatıp aynı girdiyi tekrar çalıştırın. <strong>Yalnızca bu yerel demo içinde</strong>{' '}
        güvensiz mod girişi atlar. Gerçek uygulamalarda parametreli sorgu veya ORM kullanın; parolaları da düz metin
        olarak saklamayın.
      </aside>
    </section>
  );
}

const inputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  padding: 9,
  border: '1px solid #9ca3af',
  borderRadius: 5,
  fontSize: 14,
};

const buttonStyle = (background) => ({
  padding: '9px 12px',
  border: 0,
  borderRadius: 5,
  color: '#fff',
  background,
  fontWeight: 600,
  cursor: 'pointer',
});

const panelStyle = {
  minWidth: 0,
  padding: 12,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fff',
};

const headingStyle = {
  margin: '0 0 9px',
  fontSize: 15,
};

const descriptionStyle = {
  margin: '9px 0 0',
  color: '#4b5563',
  fontSize: 13,
  lineHeight: 1.55,
};
