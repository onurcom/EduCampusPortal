import React, { useEffect, useState } from 'react';
import { SecurityImpactNotice } from './SecurityImpactNotice';

const allowedTypes = {
  jpg: { mime: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
  jpeg: { mime: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
  png: { mime: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  pdf: { mime: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46, 0x2d] }
};

const blockedExtensions = new Set(['php', 'phtml', 'phar', 'jsp', 'aspx', 'exe', 'html', 'svg', 'js', 'sh']);
const maxFileSize = 5 * 1024 * 1024;
const fakeUpload = {
  name: 'avatar.php.jpg',
  type: 'image/jpeg',
  size: 1280,
  signature: '3C 3F 00 00 00 00 00 00'
};

export function FileUploadSecurityLab({ isSafeMode }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setResult(null);
  }, [isSafeMode]);

  const inspectFile = async (file) => {
    const parts = file.name.toLowerCase().split('.');
    const extension = parts.at(-1);
    const fileType = allowedTypes[extension];
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const signature = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const signatureMatches = Boolean(fileType) && fileType.signature.every((byte, index) => bytes[index] === byte);
    const hasExecutablePart = parts.slice(0, -1).some((part) => blockedExtensions.has(part));
    const mimeMatches = !file.type || file.type === fileType?.mime;
    const checks = [
      { label: 'Uzantı allow-list içinde', passed: Boolean(fileType) },
      { label: 'İç uzantılarda çalıştırılabilir tür yok', passed: !hasExecutablePart },
      { label: 'Magic bytes dosya türüyle eşleşiyor', passed: signatureMatches },
      { label: 'Boyut 5 MB sınırını aşmıyor', passed: file.size <= maxFileSize },
      { label: 'Tarayıcının bildirdiği MIME tutarlı', passed: mimeMatches }
    ];

    const accepted = isSafeMode
      ? checks.every((check) => check.passed)
      : Boolean(fileType) && file.size <= maxFileSize;

    setResult({
      name: file.name,
      mime: file.type || '(belirtilmemiş)',
      size: file.size,
      signature,
      accepted,
      checks,
      storedName: accepted && isSafeMode ? `upload-${Date.now()}.${extension}` : null
    });
  };

  const runSpoofDemo = () => {
    const accepted = !isSafeMode;
    setResult({
      ...fakeUpload,
      accepted,
      checks: [
        { label: 'Son uzantı .jpg', passed: true },
        { label: 'İç uzantılarda çalıştırılabilir tür yok', passed: false },
        { label: 'Magic bytes JPEG imzasıyla eşleşiyor', passed: false },
        { label: 'Boyut 5 MB sınırını aşmıyor', passed: true }
      ],
      storedName: null,
      isFixture: true
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setResult({ accepted: false, error: 'Önce bir dosya seçin.' });
      return;
    }
    await inspectFile(selectedFile);
  };

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
          Hafta 6: Dosya Yükleme Güvenliği
        </h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
          Uzantı ve MIME taklidini inceleyin; güvenli doğrulamada magic bytes, boyut ve saklama kararlarını karşılaştırın.
        </p>
      </div>

      <div style={modeStyle(isSafeMode)}>
        Mod: <strong>{isSafeMode ? 'Güvenli doğrulama' : 'Zayıf doğrulama simülasyonu'}</strong>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <section style={panelStyle}>
          <h3 style={panelTitleStyle}>Dosya denetimi</h3>
          <form onSubmit={handleSubmit}>
            <label style={labelStyle} htmlFor="upload-demo-file">Görsel veya PDF seçin</label>
            <input
              id="upload-demo-file"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setResult(null);
              }}
              style={{ display: 'block', width: '100%', fontSize: '12px', marginBottom: '10px' }}
            />
            <div style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginBottom: '10px' }}>
              Dosya bu tarayıcıdan gönderilmez veya saklanmaz. Seçim alanındaki uzantı filtresi yalnızca kolaylıktır, güvenlik kontrolü değildir.
            </div>
            <button type="submit" style={primaryButtonStyle}>Dosyayı denetle</button>
          </form>
        </section>

        <section style={{ ...panelStyle, backgroundColor: '#f8fafc' }}>
          <h3 style={panelTitleStyle}>Uzantı taklidi örneği</h3>
          <div style={metadataStyle}>
            <div><strong>Dosya adı:</strong> {fakeUpload.name}</div>
            <div><strong>İstemci MIME:</strong> {fakeUpload.type}</div>
            <div><strong>İçerik imzası:</strong> <code>{fakeUpload.signature}</code></div>
          </div>
          <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: '8px 0 10px' }}>
            Son uzantıya güvenen kontrol bu örneği JPEG sanabilir. Sunucu imzayı doğrulamalı ve dosyayı asla çalıştırmamalıdır.
          </p>
          <button type="button" onClick={runSpoofDemo} style={secondaryButtonStyle}>Taklit örneğini denetle</button>
        </section>
      </div>

      {result && (
        <section aria-live="polite" style={resultStyle(result.accepted)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: result.accepted ? '#166534' : '#991b1b' }}>
              {result.error ? result.error : result.accepted ? 'Simülasyon: dosya kabul edildi' : 'Simülasyon: dosya reddedildi'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>{result.isFixture ? 'Hazır sentetik örnek' : 'Yerel dosya özeti'}</span>
          </div>
          {!result.error && (
            <>
              <div style={metadataStyle}>
                <div><strong>Ad:</strong> {result.name}</div>
                <div><strong>MIME:</strong> {result.mime}</div>
                <div><strong>Boyut:</strong> {formatBytes(result.size)}</div>
                <div><strong>Magic bytes:</strong> <code>{result.signature}</code></div>
                {result.storedName && <div><strong>Güvenli ad örneği:</strong> <code>{result.storedName}</code></div>}
              </div>
              <ul style={{ display: 'grid', gap: '5px', listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
                {result.checks.map((check) => (
                  <li key={check.label} style={{ fontSize: '12px', color: check.passed ? '#166534' : '#991b1b' }}>
                    {check.passed ? '✓' : '×'} {check.label}
                  </li>
                ))}
              </ul>
              {!isSafeMode && result.accepted && (
                <p style={{ margin: '10px 0 0', color: '#991b1b', fontSize: '12px', lineHeight: 1.5 }}>
                  Zayıf simülasyon yalnızca son uzantıya bakar. Gerçek uygulamada yüklenen dosyayı çalıştırmayın; web-root dışında ve çalıştırma izni olmadan saklayın.
                </p>
              )}
              {!isSafeMode && result.accepted && (
                <SecurityImpactNotice
                  title="Uzantı taklidi başarılı: PHP çalıştırıldı"
                  summary="Saldırgan sunucuya .php uzantılı dosya gönderdi. Simülasyonda dosya çalıştırıldı ve web sunucusuna erişim sağlandı."
                  evidence={{
                    'Dosya': 'avatar.php.jpg',
                    'Etkilenen hedef': 'https://edu.example/uploads/avatar.php',
                    'Sonuç': 'Sunucuya erişim sağlandı, /etc/passwd ve oturum dosyaları okunmaya başlandı',
                    'Açık mesaj': 'İstemci tarafı güvenlik kontrolü geçildi; sunucu gerçek olarak dosyayı çalıştırdı.'
                  }}
                />
              )}
            </>
          )}
        </section>
      )}

      <section style={{ ...panelStyle, marginTop: '16px' }}>
        <h3 style={panelTitleStyle}>Güvenli yükleme kontrol listesi</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
          {[
            'Kimlik doğrulama ve yetki kontrolü',
            'İzinli tür listesi + magic bytes',
            'Boyut sınırı ve rastgele dosya adı',
            'Web-root dışında, no-exec depolama',
            'Gerekirse AV taraması veya CDR'
          ].map((item) => (
            <div key={item} style={{ padding: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
        Bu laboratuvar gerçek dosya yüklemez, diske yazmaz ve içerik çalıştırmaz. İstemci tarafı denetimi üretim güvenliği yerine geçmez; aynı kontroller sunucuda uygulanmalıdır.
      </p>
    </div>
  );
}

const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '14px' };
const panelStyle = { border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#fff', minWidth: 0 };
const panelTitleStyle = { margin: '0 0 10px', fontSize: '14px', color: '#111827' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' };
const metadataStyle = { display: 'grid', gap: '5px', fontSize: '12px', color: '#334155', overflowWrap: 'anywhere' };
const primaryButtonStyle = { padding: '7px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#0369a1', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' };
const secondaryButtonStyle = { ...primaryButtonStyle, backgroundColor: '#334155' };
const modeStyle = (safe) => ({ marginBottom: '12px', padding: '8px 10px', borderRadius: '4px', backgroundColor: safe ? '#f0fdf4' : '#fff7ed', color: safe ? '#166534' : '#9a3412', fontSize: '12px' });
const resultStyle = (accepted) => ({ border: `1px solid ${accepted ? '#86efac' : '#fca5a5'}`, borderRadius: '6px', padding: '12px', backgroundColor: accepted ? '#f0fdf4' : '#fef2f2' });

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}