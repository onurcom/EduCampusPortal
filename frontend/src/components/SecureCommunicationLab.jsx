import React, { useEffect, useState } from 'react';
import { sendLabDemoEvent } from '../api/labDemoCollector';
import { LabDemoCapture } from './LabDemoCapture';
import { SecurityImpactNotice } from './SecurityImpactNotice';

const handshakeSteps = [
  {
    title: 'Client Hello',
    detail: 'Tarayıcı, desteklediği TLS sürümünü ve şifre takımlarını sunucuya bildirir.'
  },
  {
    title: 'Sunucu sertifikası',
    detail: 'Sunucu, alan adı kimliğini ve açık anahtarını içeren sertifikasını gönderir.'
  },
  {
    title: 'Sertifika doğrulama',
    detail: 'Tarayıcı alan adını, geçerlilik süresini ve sertifika zincirini kontrol eder.'
  },
  {
    title: 'Oturum anahtarı',
    detail: 'Taraflar anahtar anlaşmasıyla ortak oturum anahtarını oluşturur; şifreli iletişim başlar.'
  }
];

export function SecureCommunicationLab({ isSafeMode }) {
  const [protocol, setProtocol] = useState('https');
  const [handshakeStep, setHandshakeStep] = useState(0);
  const [transferStatus, setTransferStatus] = useState('');
  const [capturedData, setCapturedData] = useState(null);

  const isHttps = protocol === 'https';

  useEffect(() => {
    setProtocol(isSafeMode ? 'https' : 'http');
    setCapturedData(null);
    setTransferStatus('');
  }, [isSafeMode]);

  const sendDemoRequest = async () => {
    setCapturedData(null);
    if (isSafeMode) {
      setTransferStatus('Güvenli mod etkin: demo aktarımı engellendi.');
      return;
    }

    setTransferStatus(`Sentetik ${isHttps ? 'HTTPS/TLS' : 'HTTP'} demo bağlantısı gönderiliyor...`);
    try {
      const capture = await sendLabDemoEvent(protocol, isSafeMode);
      setCapturedData(capture);
      setTransferStatus(`Sentetik ${isHttps ? 'HTTPS/TLS' : 'HTTP'} demo kaydı localhost:4000 eğitim alıcısına aktarıldı ve aşağıda gösterildi.`);
    } catch {
      setTransferStatus('Yerel eğitim alıcısına ulaşılamadı. Hacker-backend çalışıyor mu?');
    }
  };

  return (
    <div>
      <div style={sectionHeaderStyle}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          Hafta 4: HTTP, HTTPS ve TLS ile Güvenli İletişim
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Aynı isteğin ağda nasıl göründüğünü karşılaştırın ve TLS el sıkışmasını adım adım inceleyin.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }} role="status" aria-label="Aktif iletişim protokolü">
        <span style={protocolButtonStyle(isHttps)}>
          {isHttps ? 'HTTPS · TLS ile şifreli' : 'HTTP · Şifresiz'}
        </span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {isSafeMode ? 'Güvenli modda yalnızca HTTPS gösterilir.' : 'Güvenli mod kapalı; HTTP demo bağlantısı açık.'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: isSafeMode ? '#166534' : '#991b1b' }}>
          Mod: <strong>{isSafeMode ? 'Güvenli' : 'Güvensiz'}</strong>
        </span>
        <button type="button" onClick={sendDemoRequest} style={primaryButtonStyle}>
          Demo {isHttps ? 'HTTPS/TLS' : 'HTTP'} bağlantısı gönder
        </button>
      </div>
      {transferStatus && <div role="status" style={{ marginBottom: '12px', fontSize: '12px', color: '#334155' }}>{transferStatus}</div>}
      <LabDemoCapture capture={capturedData} title={`${isHttps ? 'HTTPS/TLS' : 'HTTP'} simülasyonunda yakalanan sentetik veri`} />
      {!isSafeMode && capturedData && (
        <SecurityImpactNotice
          title="HTTP üzerinden veri çalındı"
          summary="Güvensiz modda HTTP akışı açık bırakıldı. Ağdaki gözlemci, kullanıcı bilgisi ve demo oturum verisini okuyabildi."
          evidence={{
            'Çalınan alan': 'Authorization / user / session info',
            'Görünen veri': `user=ogrenci; password=******; session=${capturedData?.session ?? 'demo-session-west-01'}`,
            'Sonuç': 'Aynı ağ üzerinde dinleyen bir saldırgan, basit HTTP trafiğini okuyup kullanıcı verisine erişebilir.'
          }}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <section style={panelStyle}>
          <h3 style={panelTitleStyle}>Tarayıcıdan çıkan istek</h3>
          <div style={codeStyle}>
            <div>{isHttps ? 'POST /demo/login HTTPS' : 'POST /demo/login HTTP/1.1'}</div>
            <div>Host: egitim.example</div>
            <div style={{ marginTop: '8px' }}>user=ogrenci&amp;password=ornek123</div>
          </div>
          <p style={bodyTextStyle}>
            İstek yalnızca demo düğmesine bastığınızda işlenir; aktarımda backend tarafından tanımlı sentetik kayıt kullanılır.
          </p>
        </section>

        <section style={{ ...panelStyle, borderColor: isHttps ? '#86efac' : '#fca5a5', backgroundColor: isHttps ? '#f0fdf4' : '#fef2f2' }}>
          <h3 style={{ ...panelTitleStyle, color: isHttps ? '#166534' : '#991b1b' }}>
            Ağdaki gözlemcinin görebildiği
          </h3>
          <div style={codeStyle}>
            {isHttps ? (
              <>
                <div style={{ color: '#86efac' }}>TLS Application Data</div>
                <div style={{ color: '#cbd5e1' }}>7f 3a 91 c2 ... (şifreli kayıt)</div>
              </>
            ) : (
              <>
                <div style={{ color: '#fca5a5' }}>POST /demo/login HTTP/1.1</div>
                <div>user=ogrenci</div>
                <div>password=ornek123</div>
              </>
            )}
          </div>
          <p style={bodyTextStyle}>
            {isHttps
              ? 'Aradaki gözlemci TLS içeriğini okuyamaz. Hedef sunucu ise bağlantıyı çözüp bu veriyi alabilir.'
              : 'HTTP içerikleri şifrelemez; aynı ağı izleyen biri bu örnekteki alanları okuyabilir.'}
          </p>
        </section>
      </div>

      {isSafeMode && <section style={{ ...panelStyle, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <h3 style={{ ...panelTitleStyle, marginBottom: '4px' }}>TLS 1.3 el sıkışması</h3>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Bağlantı kurulurken gerçekleşen temel adımlar</div>
          </div>
          <button type="button" onClick={() => setHandshakeStep(0)} style={secondaryButtonStyle}>
            Baştan başlat
          </button>
        </div>

        <ol style={{ display: 'grid', gap: '8px', listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
          {handshakeSteps.map((step, index) => {
            const isComplete = index < handshakeStep;
            const isCurrent = index === handshakeStep;
            return (
              <li key={step.title} style={{ ...stepStyle, borderColor: isCurrent ? '#0284c7' : isComplete ? '#86efac' : '#e2e8f0', backgroundColor: isCurrent ? '#f0f9ff' : isComplete ? '#f0fdf4' : '#fff' }}>
                <span style={{ ...stepNumberStyle, backgroundColor: isComplete ? '#16a34a' : isCurrent ? '#0284c7' : '#94a3b8' }}>
                  {isComplete ? '✓' : index + 1}
                </span>
                <span>
                  <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>{step.title}</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: '#475569', marginTop: '2px' }}>{step.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={() => setHandshakeStep((current) => Math.min(current + 1, handshakeSteps.length))}
          disabled={handshakeStep === handshakeSteps.length}
          style={{ ...primaryButtonStyle, opacity: handshakeStep === handshakeSteps.length ? 0.55 : 1, cursor: handshakeStep === handshakeSteps.length ? 'default' : 'pointer' }}
        >
          {handshakeStep === handshakeSteps.length ? 'Güvenli bağlantı kuruldu' : 'Sonraki adım'}
        </button>
      </section>}

      <div style={{ borderLeft: '3px solid #0284c7', backgroundColor: '#f8fafc', padding: '10px 12px', fontSize: '12px', lineHeight: 1.55, color: '#334155' }}>
        <strong>Unutmayın:</strong> HTTPS aktarım gizliliği, bütünlük ve sunucu kimliğinin doğrulanmasına yardımcı olur. Sertifika, sitenin dürüst olduğunu garanti etmez; adresi yine kontrol edin.
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
        Protokol seçimi bu eğitim simülasyonunda kaydedilir. Yerel alıcıya giden test isteği HTTP kullanır; gerçek TLS el sıkışması veya şifreleme çalıştırılmaz. Alıcı yalnızca sentetik demo verisini kabul eder.
      </div>
    </div>
  );
}

const sectionHeaderStyle = {
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: '12px',
  marginBottom: '16px'
};

const panelStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '12px',
  backgroundColor: '#fff',
  minWidth: 0
};

const panelTitleStyle = {
  margin: '0 0 8px',
  fontSize: '14px',
  color: '#111827'
};

const codeStyle = {
  overflowX: 'auto',
  backgroundColor: '#0f172a',
  color: '#e2e8f0',
  padding: '10px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  lineHeight: 1.6,
  whiteSpace: 'pre'
};

const bodyTextStyle = {
  margin: '8px 0 0',
  color: '#475569',
  fontSize: '12px',
  lineHeight: 1.5
};

const stepStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  border: '1px solid',
  borderRadius: '4px',
  padding: '8px'
};

const stepNumberStyle = {
  display: 'grid',
  placeItems: 'center',
  width: '24px',
  height: '24px',
  flex: '0 0 24px',
  borderRadius: '50%',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 700
};

const protocolButtonStyle = (active) => ({
  padding: '7px 12px',
  border: `1px solid ${active ? '#0284c7' : '#cbd5e1'}`,
  borderRadius: '4px',
  backgroundColor: active ? '#e0f2fe' : '#fff',
  color: active ? '#075985' : '#334155',
  fontSize: '12px',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer'
});

const primaryButtonStyle = {
  padding: '7px 12px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#0369a1',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600
};

const secondaryButtonStyle = {
  padding: '6px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  backgroundColor: '#fff',
  color: '#334155',
  fontSize: '12px',
  cursor: 'pointer'
};