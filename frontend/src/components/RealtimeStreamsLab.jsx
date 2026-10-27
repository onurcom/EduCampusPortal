import React, { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

const streamEventSchema = z.object({
  id: z.string().min(1, 'Olay kimliği boş olamaz.'),
  channel: z.enum(['campus.weather', 'campus.alerts']),
  occurredAt: z.string().datetime({ message: 'occurredAt ISO 8601 tarih-saat olmalı.' }),
  payload: z.object({
    temperatureC: z.number().min(-50).max(60),
    message: z.string().max(160)
  }).strict()
}).strict();

const validEvent = {
  id: 'evt-1042',
  channel: 'campus.weather',
  occurredAt: '2026-10-26T09:45:00.000Z',
  payload: {
    temperatureC: 18.5,
    message: 'Kampüste hava açık.'
  }
};

const invalidEvent = {
  id: 'evt-1043',
  channel: 'campus.weather',
  occurredAt: 'dün sabah',
  payload: {
    temperatureC: 180,
    message: 'Bu değer izin verilen aralığın dışında.',
    admin: true
  },
  isAdmin: true
};

const websocketClientCode = `// Tarayıcı: güvenli WSS bağlantısı, olayları doğrula
const socket = new WebSocket('wss://api.example.edu/realtime');

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({
    type: 'subscribe',
    channel: 'campus.weather'
  }));
});

socket.addEventListener('message', (event) => {
  try {
    const parsed = StreamEventSchema.safeParse(
      JSON.parse(event.data)
    );
    if (!parsed.success) {
      reportInvalidEvent(parsed.error);
      return;
    }
    updateDashboard(parsed.data);
  } catch {
    reportMalformedFrame();
  }
});

// WebSocket iki yönlüdür; istemci sunucuya mesaj gönderebilir.
socket.send(JSON.stringify({ type: 'ping' }));`;

const websocketServerCode = `// Node.js ws sunucusu — kütüphane: ws
const wss = new WebSocketServer({
  server: httpsServer,
  path: '/realtime'
});

wss.on('connection', (socket, request) => {
  // Upgrade öncesinde oturumu ve Origin izin listesini doğrulayın.
  const user = getAuthenticatedUser(request);
  if (!user) return socket.close(1008, 'Unauthorized');

  socket.on('message', (raw) => {
    const message = parseAndValidateClientMessage(raw);
    if (!message) return socket.close(1008, 'Invalid message');
    if (message.type === 'subscribe') {
      authorizeChannel(user, message.channel);
      subscribe(socket, message.channel);
    }
  });
});`;

const sseClientCode = `// EventSource otomatik yeniden bağlanmayı destekler.
const source = new EventSource('/api/stream/events', {
  withCredentials: true
});

source.addEventListener('campus.weather', (event) => {
  try {
    const parsed = StreamEventSchema.safeParse(
      JSON.parse(event.data)
    );
    if (!parsed.success) {
      reportInvalidEvent(parsed.error);
      return;
    }
    updateDashboard(parsed.data);
  } catch {
    reportMalformedFrame();
  }
});

source.onerror = () => showReconnecting();
// EventSource yalnızca sunucudan istemciye akar.
// İstemciden sunucuya veri için ayrı, korumalı POST kullanın.
await fetch('/api/preferences', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ channel: 'campus.weather' })
});`;

const sseServerCode = `// SSE yanıtı — HTTPS arkasında, oturum ve yetki kontrolüyle
app.get('/api/stream/events', requireAuth, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  const sendEvent = (id, event, data) => {
    res.write(\`id: \${id}\\nevent: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
  };
  const unsubscribe = subscribeToAuthorizedFeed(req.user, sendEvent);
  const heartbeat = setInterval(() => res.write(': ping\\n\\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});`;

const exampleJson = JSON.stringify(validEvent, null, 2);

export function RealtimeStreamsLab() {
  const [protocol, setProtocol] = useState('websocket');
  const [connected, setConnected] = useState(false);
  const [eventText, setEventText] = useState(exampleJson);
  const [validationResult, setValidationResult] = useState(null);
  const [receivedEvents, setReceivedEvents] = useState([]);
  const [clientMessage, setClientMessage] = useState('Kampüs hava durumu güncellemelerine abone ol');
  const [logs, setLogs] = useState([]);
  const reconnectTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(reconnectTimerRef.current), []);

  const addLog = (message, type = 'info') => {
    setLogs((previous) => [
      { id: `${Date.now()}-${Math.random()}`, message, type },
      ...previous
    ]);
  };

  const changeProtocol = (nextProtocol) => {
    window.clearTimeout(reconnectTimerRef.current);
    if (connected) {
      setConnected(false);
      addLog('Protokol değiştirildiği için önceki demo bağlantısı kapatıldı.', 'warning');
    }
    setProtocol(nextProtocol);
    setValidationResult(null);
  };

  const connect = () => {
    window.clearTimeout(reconnectTimerRef.current);
    setConnected(true);
    addLog(
      protocol === 'websocket'
        ? 'WSS demo bağlantısı açıldı; istemci ve sunucu mesaj gönderebilir.'
        : 'SSE demo akışı açıldı; sunucudan istemciye tek yönlü event-stream başladı.',
      'success'
    );
  };

  const disconnect = () => {
    window.clearTimeout(reconnectTimerRef.current);
    setConnected(false);
    addLog('Demo akışı kapatıldı.', 'warning');
  };

  const validateEvent = (eventTextToValidate = eventText) => {
    let decoded;
    try {
      decoded = JSON.parse(eventTextToValidate);
    } catch {
      setValidationResult({
        valid: false,
        errors: ['JSON sözdizimi hatalı; olay şemaya ulaşmadan reddedildi.']
      });
      addLog('Akış olayı reddedildi: geçersiz JSON.', 'danger');
      return;
    }

    const result = streamEventSchema.safeParse(decoded);
    if (!result.success) {
      const errors = result.error.issues.map((issue) =>
        `${issue.path.join('.') || 'event'}: ${issue.message}`
      );
      setValidationResult({ valid: false, errors });
      addLog(`Akış olayı şema doğrulamasını geçemedi (${errors.length} hata).`, 'danger');
      return;
    }

    setValidationResult({ valid: true, data: result.data });
    setReceivedEvents((previous) => [result.data, ...previous].slice(0, 5));
    addLog(`Doğrulandı ve işlendi: ${result.data.channel} · ${result.data.id}`, 'success');
  };

  const simulateServerEvent = () => {
    if (!connected) return;
    const event = {
      ...validEvent,
      id: `evt-${Date.now()}`,
      occurredAt: new Date().toISOString()
    };
    setEventText(JSON.stringify(event, null, 2));
    addLog(
      protocol === 'websocket'
        ? 'Sunucu → istemci: WebSocket message frame alındı.'
        : 'Sunucu → istemci: SSE campus.weather event alındı.',
      'info'
    );
    validateEvent(JSON.stringify(event));
  };

  const sendClientMessage = () => {
    if (!connected || protocol !== 'websocket' || !clientMessage.trim()) return;
    addLog(`İstemci → sunucu: subscribe isteği gönderildi ("${clientMessage.trim()}").`, 'success');
  };

  const simulateReconnect = () => {
    if (!connected) return;
    if (protocol === 'sse') {
      addLog('Bağlantı kesintisi simüle edildi: EventSource yeniden bağlanmayı dener; Last-Event-ID ile devam edebilir.', 'warning');
      addLog('SSE akışı yeniden açıldı (demo). Gerçek uygulamada sunucu event id ile kaldığı yerden sürdürür.', 'success');
      return;
    }

    setConnected(false);
    addLog('WSS kesintisi simüle edildi. WebSocket için yeniden bağlanma/backoff uygulama tarafından yönetilmelidir.', 'warning');
    reconnectTimerRef.current = window.setTimeout(() => {
      setConnected(true);
      addLog('WSS demo bağlantısı yeniden kuruldu. Üretimde exponential backoff ve jitter kullanın.', 'success');
    }, 700);
  };

  const clientCode = protocol === 'websocket' ? websocketClientCode : sseClientCode;
  const serverCode = protocol === 'websocket' ? websocketServerCode : sseServerCode;

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
          Hafta 8: WebSocket ve SSE ile Gerçek Zamanlı Veri Akışı
        </h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.55 }}>
          Anlık veriyi HTTP polling yerine akışla iletin. Protokolü ihtiyaca göre seçin
          ve gelen her mesajı uygulamadan önce doğrulayın.
        </p>
      </div>

      <div style={comparisonGridStyle}>
        <ProtocolCard
          title="WebSocket · ws:// / wss://"
          detail="TCP üzerinde bağlantı yükseltme; çift yönlü (full-duplex), metin ve ikili frame."
          example="Sohbet, ortak düzenleme, etkileşimli oyun"
          active={protocol === 'websocket'}
          onClick={() => changeProtocol('websocket')}
        />
        <ProtocolCard
          title="SSE · HTTP / HTTPS"
          detail="text/event-stream; sunucudan istemciye tek yönlü UTF-8 metin akışı."
          example="Bildirimler, skor ve haber akışı"
          active={protocol === 'sse'}
          onClick={() => changeProtocol('sse')}
        />
      </div>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={panelTitleStyle}>Gerçek zamanlı akış simülatörü</h3>
            <span style={{ color: '#64748b', fontSize: '10px' }}>
              {protocol === 'websocket' ? 'WSS · çift yönlü' : 'SSE · sunucudan istemciye'}
              {' · '}Durum: <strong style={{ color: connected ? '#047857' : '#b45309' }}>{connected ? 'Bağlı' : 'Kapalı'}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {!connected
              ? <button type="button" onClick={connect} style={buttonStyle('#047857')}>Demo akışını aç</button>
              : <button type="button" onClick={disconnect} style={buttonStyle('#475569')}>Bağlantıyı kapat</button>}
            <button type="button" onClick={simulateReconnect} disabled={!connected} style={buttonStyle('#1d4ed8')}>Kesinti / reconnect simüle et</button>
          </div>
        </div>

        <div style={directionStyle}>
          <span>Sunucu</span>
          <strong>{protocol === 'websocket' ? '↔' : '→'}</strong>
          <span>Tarayıcı</span>
          {protocol === 'websocket' && <span style={{ color: '#64748b' }}>İki yönlü mesaj</span>}
          {protocol === 'sse' && <span style={{ color: '#64748b' }}>İstemci → sunucu için ayrı HTTP isteği</span>}
        </div>

        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button type="button" onClick={simulateServerEvent} disabled={!connected} style={buttonStyle('#1d4ed8')}>
            Sunucudan örnek event al
          </button>
          {protocol === 'websocket' && (
            <>
              <input value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} aria-label="WebSocket istemci mesajı" style={inputStyle} />
              <button type="button" onClick={sendClientMessage} disabled={!connected} style={buttonStyle('#0369a1')}>
                İstemci mesajı gönder
              </button>
            </>
          )}
        </div>

        <label htmlFor="stream-event-json" style={labelStyle}>
          Gelen JSON olayı — doğrulanmadan uygulama state'ine eklenmez
        </label>
        <textarea id="stream-event-json" value={eventText} onChange={(event) => { setEventText(event.target.value); setValidationResult(null); }} rows={7} spellCheck="false" style={textareaStyle} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '7px' }}>
          <button type="button" onClick={() => validateEvent()} style={buttonStyle('#047857')}>JSON'u doğrula ve işle</button>
          <button type="button" onClick={() => { setEventText(JSON.stringify(validEvent, null, 2)); setValidationResult(null); }} style={buttonStyle('#475569')}>Geçerli örnek</button>
          <button type="button" onClick={() => { setEventText(JSON.stringify(invalidEvent, null, 2)); setValidationResult(null); }} style={buttonStyle('#b45309')}>Geçersiz örnek</button>
          <button type="button" onClick={() => { setEventText('{ "id": '); setValidationResult(null); }} style={buttonStyle('#64748b')}>Bozuk JSON</button>
        </div>

        {validationResult && (
          <div role="status" style={{
            marginTop: '9px',
            padding: '9px',
            borderRadius: '4px',
            backgroundColor: validationResult.valid ? '#f0fdf4' : '#fef2f2',
            color: validationResult.valid ? '#166534' : '#991b1b',
            fontSize: '10px'
          }}>
            <strong>{validationResult.valid ? 'Şema doğrulaması başarılı' : 'Olay reddedildi'}</strong>
            {validationResult.valid
              ? <div>{validationResult.data.channel} · {validationResult.data.payload.temperatureC}°C · {validationResult.data.payload.message}</div>
              : validationResult.errors.map((error) => <div key={error}>• {error}</div>)}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={panelTitleStyle}>Uygulama kodu · {protocol === 'websocket' ? 'tarayıcı ve Node.js ws sunucusu' : 'EventSource ve SSE sunucusu'}</h3>
        <CodeBlock title="İstemci" code={clientCode} />
        <CodeBlock title="Sunucu" code={serverCode} />
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={panelTitleStyle}>Doğrulanıp işlenen olaylar</h3>
          <span style={{ color: '#64748b', fontSize: '10px' }}>{receivedEvents.length} / 5</span>
        </div>
        {receivedEvents.length === 0
          ? <p style={{ color: '#64748b', fontSize: '11px', margin: '6px 0 0' }}>Henüz geçerli bir akış olayı işlenmedi.</p>
          : receivedEvents.map((event) => (
            <div key={event.id} style={eventRowStyle}>
              <strong>{event.channel}</strong> · {event.payload.temperatureC}°C · {event.payload.message}
              <span style={{ display: 'block', color: '#64748b', fontSize: '9px', marginTop: '3px' }}>{event.id} · {event.occurredAt}</span>
            </div>
          ))}
      </section>

      <section style={logPanelStyle}>
        <h3 style={{ margin: '0 0 7px', color: '#cbd5e1', fontSize: '11px' }}>Bağlantı ve doğrulama kayıtları</h3>
        {logs.length === 0
          ? <span style={{ color: '#64748b' }}>Akışı açın, event alın veya JSON örneklerini doğrulayın.</span>
          : logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', color: log.type === 'danger' ? '#fca5a5' : log.type === 'success' ? '#86efac' : log.type === 'warning' ? '#fcd34d' : '#cbd5e1' }}>
              {log.message}
            </div>
          ))}
      </section>

      <p style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.5, marginTop: '10px' }}>
        Güvenlik notu: Gerçek uygulamada WSS/HTTPS, oturum ve kanal yetkilendirmesi, izin verilen Origin kontrolü,
        mesaj boyutu/sıklığı sınırı, heartbeat ve bağlantı temizliği uygulayın. SSE'de event ID ve yeniden bağlanmayı
        yönetin. Bu arayüz ağ bağlantısı kurmaz; akış yerel verilerle simüle edilir.
      </p>
    </div>
  );
}

function ProtocolCard({ title, detail, example, active, onClick }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} style={{
      textAlign: 'left',
      border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
      borderRadius: '6px',
      backgroundColor: active ? '#eff6ff' : '#fff',
      padding: '10px',
      cursor: 'pointer'
    }}>
      <strong style={{ display: 'block', color: '#0f172a', fontSize: '11px', marginBottom: '4px' }}>{title}</strong>
      <span style={{ display: 'block', color: '#475569', fontSize: '10px', lineHeight: 1.45 }}>{detail}</span>
      <span style={{ display: 'block', color: '#0369a1', fontSize: '9px', marginTop: '5px' }}>Örnek: {example}</span>
    </button>
  );
}

function CodeBlock({ title, code }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <strong style={{ display: 'block', color: '#475569', fontSize: '10px', marginBottom: '4px' }}>{title}</strong>
      <pre style={codeStyle}><code>{code}</code></pre>
    </div>
  );
}

const headerStyle = {
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: '12px',
  marginBottom: '14px'
};

const comparisonGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
  gap: '8px',
  marginBottom: '12px'
};

const panelStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  marginBottom: '10px'
};

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '8px'
};

const panelTitleStyle = {
  margin: 0,
  color: '#111827',
  fontSize: '12px'
};

const directionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  minHeight: '36px',
  margin: '8px 0',
  borderRadius: '4px',
  backgroundColor: '#f8fafc',
  color: '#0369a1',
  fontSize: '10px'
};

const labelStyle = {
  display: 'block',
  color: '#334155',
  fontSize: '10px',
  fontWeight: 600,
  marginBottom: '5px'
};

const inputStyle = {
  minHeight: '32px',
  flex: '1 1 220px',
  padding: '6px 8px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  fontSize: '10px'
};

const textareaStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  backgroundColor: '#f8fafc',
  color: '#0f172a',
  fontFamily: 'monospace',
  fontSize: '10px',
  lineHeight: 1.5,
  resize: 'vertical'
};

const codeStyle = {
  margin: 0,
  padding: '10px',
  overflowX: 'auto',
  borderRadius: '4px',
  backgroundColor: '#0f172a',
  color: '#e2e8f0',
  fontSize: '9px',
  lineHeight: 1.5
};

const buttonStyle = (backgroundColor) => ({
  minHeight: '31px',
  padding: '6px 9px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor,
  color: '#fff',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: 600
});

const eventRowStyle = {
  padding: '8px',
  marginTop: '6px',
  borderRadius: '4px',
  backgroundColor: '#f8fafc',
  color: '#334155',
  fontSize: '10px'
};

const logPanelStyle = {
  border: '1px solid #111827',
  borderRadius: '6px',
  backgroundColor: '#0f172a',
  padding: '11px',
  color: '#f8fafc',
  fontFamily: 'monospace',
  fontSize: '10px'
};
