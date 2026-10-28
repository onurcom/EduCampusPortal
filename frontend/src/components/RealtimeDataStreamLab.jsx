import React, { useEffect, useRef, useState } from 'react';

const cardStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fff',
  padding: 14,
};

const buttonStyle = (active = false, disabled = false) => ({
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '8px 11px',
  background: active ? '#111827' : '#fff',
  color: active ? '#fff' : '#1f2937',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.55 : 1,
  fontWeight: 600,
});

const sseServerCode = `// Express: sunucudan istemciye yayın (tek yönlü)
app.get('/api/stream-events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  let eventId = 0;
  const timer = setInterval(() => {
    const data = JSON.stringify({
      course: 'Veri Alma',
      score: Math.floor(Math.random() * 101)
    });

    res.write(\`id: \${++eventId}\\n\`);
    res.write('event: score_update\\n');
    res.write(\`data: \${data}\\n\\n\`);
  }, 2000);

  req.on('close', () => clearInterval(timer));
});`;

const sseClientCode = `import { useEffect, useState } from 'react';

function LiveScore() {
  const [score, setScore] = useState(null);

  useEffect(() => {
    const source = new EventSource('/api/stream-events');

    source.addEventListener('score_update', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload.score === 'number') setScore(payload.score);
      } catch {
        console.error('Geçersiz SSE verisi');
      }
    });

    source.onerror = () => {
      // EventSource uygun durumda otomatik yeniden bağlanır.
      console.warn('Akış kesildi; yeniden bağlanma deneniyor.');
    };

    return () => source.close();
  }, []);

  return <p>Canlı skor: {score ?? 'bekleniyor...'}</p>;
}`;

const websocketServerCode = `const httpServer = require('http').createServer(app);
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({
  server: httpServer,
  path: '/realtime'
});

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({
    type: 'connected',
    message: 'Akışa bağlandınız'
  }));

  socket.on('message', (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'JSON geçersiz' }));
      return;
    }

    if (message.type === 'chat' && typeof message.text === 'string') {
      socket.send(JSON.stringify({
        type: 'chat',
        text: message.text.slice(0, 200)
      }));
    }
  });
});

httpServer.listen(5000);`;

const websocketClientCode = `import { useEffect, useRef, useState } from 'react';

function LiveChat() {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:5000/realtime');
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages((items) => [...items, message]);
      } catch {
        console.error('Sunucudan geçersiz JSON geldi');
      }
    };

    socket.onerror = () => console.error('WebSocket bağlantı hatası');
    return () => socket.close();
  }, []);

  function send(text) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'chat', text }));
    }
  }

  return <Chat messages={messages} onSend={send} />;
}`;

const comparisonRows = [
  ['İletişim yönü', 'Sunucu → istemci', 'İstemci ↔ sunucu'],
  ['Protokol', 'HTTP / HTTPS', 'WS / WSS'],
  ['Veri türü', 'UTF-8 metin', 'Metin ve ikili veri'],
  ['Yeniden bağlanma', 'Tarayıcı yerleşik olarak dener', 'Uygulama tarafından tasarlanır'],
  ['Uygun örnek', 'Bildirim, skor, haber akışı', 'Sohbet, oyun, ortak düzenleme'],
];

export function RealtimeDataStreamLab() {
  const [protocol, setProtocol] = useState('sse');
  const [connected, setConnected] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('Bağlantı kapalı');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const sequenceRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const addMessage = (direction, text) => {
    sequenceRef.current += 1;
    setMessages((items) => [
      {
        id: sequenceRef.current,
        direction,
        text,
        time: new Date().toLocaleTimeString(),
      },
      ...items,
    ].slice(0, 8));
  };

  useEffect(() => {
    if (!connected || protocol !== 'sse') return undefined;

    const timer = setInterval(() => {
      const score = Math.floor(Math.random() * 101);
      addMessage('server', `score_update: ${score}`);
    }, 1800);

    return () => clearInterval(timer);
  }, [connected, protocol]);

  useEffect(() => () => clearTimeout(reconnectTimerRef.current), []);

  const selectProtocol = (nextProtocol) => {
    clearTimeout(reconnectTimerRef.current);
    setProtocol(nextProtocol);
    setConnected(false);
    setConnectionMessage('Bağlantı kapalı');
    setMessages([]);
    setDraft('');
  };

  const connect = () => {
    setConnected(true);
    setConnectionMessage('Bağlandı (tarayıcı simülasyonu)');
    addMessage('system', protocol === 'sse'
      ? 'SSE: sunucu yayınları başlatıldı.'
      : 'WebSocket: çift yönlü kanal açıldı.');
  };

  const disconnect = () => {
    clearTimeout(reconnectTimerRef.current);
    setConnected(false);
    setConnectionMessage('Bağlantı kapalı');
    addMessage('system', 'Bağlantı kapatıldı.');
  };

  const simulateSseReconnect = () => {
    setConnected(false);
    setConnectionMessage('Akış koptu; EventSource yeniden bağlanmayı deniyor...');
    addMessage('system', 'Bağlantı kesildi. Tarayıcı yeniden bağlanmayı deneyecek.');
    clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      setConnected(true);
      setConnectionMessage('Yeniden bağlandı (tarayıcı simülasyonu)');
      addMessage('system', 'SSE akışı yeniden başladı.');
    }, 1200);
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!connected || !text) return;

    addMessage('client', `chat: ${text}`);
    addMessage('server', `chat yanıtı: ${text}`);
    setDraft('');
  };

  const sendServerMessage = () => {
    if (connected) addMessage('server', 'Sunucudan yeni duyuru geldi.');
  };

  return (
    <section style={{ color: '#111827', fontFamily: 'inherit' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 19, margin: 0, fontWeight: 700 }}>
          Hafta 5: WebSocket ve SSE ile Gerçek Zamanlı Veri Akışı
        </h2>
        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.55, margin: '8px 0 0' }}>
          Bir sunucu güncellemesini istemciye nasıl iletir? Tek yönlü yayın için SSE'yi,
          istemci ve sunucunun karşılıklı konuşması için WebSocket'i deneyin.
        </p>
        <div role="note" style={{ marginTop: 10, padding: 9, borderRadius: 6, background: '#eff6ff', color: '#1e3a8a', fontSize: 13 }}>
          Aşağıdaki etkileşimler ağ bağlantısı açmayan bir tarayıcı simülasyonudur.
          Kod örnekleri gerçek Express, EventSource ve WebSocket API'lerini gösterir.
        </div>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => selectProtocol('sse')} style={buttonStyle(protocol === 'sse')}>
          SSE: Sunucudan istemciye
        </button>
        <button type="button" onClick={() => selectProtocol('websocket')} style={buttonStyle(protocol === 'websocket')}>
          WebSocket: Çift yönlü
        </button>
        <button type="button" onClick={() => selectProtocol('compare')} style={buttonStyle(protocol === 'compare')}>
          Karşılaştırma
        </button>
      </div>

      {protocol === 'compare' ? (
        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Hangi durumda hangisi?</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr>
                {['Özellik', 'SSE', 'WebSocket'].map((heading) => (
                  <th key={heading} style={{ padding: 9, borderBottom: '2px solid #d1d5db' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([feature, sse, websocket]) => (
                <tr key={feature}>
                  {[feature, sse, websocket].map((value) => (
                    <td key={value} style={{ padding: 9, borderBottom: '1px solid #e5e7eb' }}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ margin: '12px 0 0', color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
            Sürekli bağlantı, sık sorgulardaki tekrar eden HTTP başlıklarını azaltabilir.
            Gerçek bant genişliği kazancı mesaj sıklığına, boyutuna ve bağlantı maliyetlerine bağlıdır;
            tek bir yüzde her uygulama için geçerli değildir.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.85fr)', gap: 14 }}>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
                {protocol === 'sse' ? 'Canlı skor akışı' : 'İki yönlü sohbet akışı'}
              </h3>
              <p style={{ margin: '0 0 10px', color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
                {protocol === 'sse'
                  ? 'Sunucu belirli aralıklarla skor olayı yayınlar. İstemci bu bağlantı üzerinden sunucuya mesaj gönderemez.'
                  : 'İstemci mesaj gönderir; sunucu yanıt veya yeni olay iletebilir. Her iki taraf da bağlantıyı kullanır.'}
              </p>
              <div role="status" style={{ marginBottom: 10, color: connected ? '#166534' : '#6b7280', fontSize: 13, fontWeight: 600 }}>
                {connectionMessage}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {!connected ? (
                  <button type="button" onClick={connect} style={buttonStyle(false)}>Bağlan</button>
                ) : (
                  <button type="button" onClick={disconnect} style={buttonStyle(false)}>Bağlantıyı kapat</button>
                )}
                {protocol === 'sse' && connected && (
                  <button type="button" onClick={simulateSseReconnect} style={buttonStyle(false)}>
                    Kopmayı ve yeniden bağlanmayı simüle et
                  </button>
                )}
                {protocol === 'websocket' && (
                  <button type="button" onClick={sendServerMessage} disabled={!connected} style={buttonStyle(false, !connected)}>
                    Sunucu mesajı gönder
                  </button>
                )}
              </div>
              {protocol === 'websocket' && (
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <label htmlFor="realtime-message" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
                    Sunucuya mesaj
                  </label>
                  <input
                    id="realtime-message"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={100}
                    placeholder="Bir mesaj yazın"
                    disabled={!connected}
                    style={{ flex: 1, minWidth: 0, padding: 9, border: '1px solid #9ca3af', borderRadius: 5 }}
                  />
                  <button type="submit" disabled={!connected || !draft.trim()} style={buttonStyle(false, !connected || !draft.trim())}>
                    Gönder
                  </button>
                </form>
              )}
            </div>

            <div aria-live="polite" style={{ ...cardStyle, minHeight: 190 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Olay günlüğü</h3>
              {messages.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 13 }}>Henüz olay yok. Akışı başlatın.</p>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, lineHeight: 1.7 }}>
                  {messages.map((message) => (
                    <li key={message.id}>
                      <strong>{message.direction === 'client' ? 'İstemci' : message.direction === 'server' ? 'Sunucu' : 'Sistem'}:</strong>{' '}
                      {message.text} <span style={{ color: '#6b7280' }}>({message.time})</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ ...cardStyle, marginTop: 14, background: '#fffbeb', borderColor: '#fcd34d', fontSize: 13, lineHeight: 1.55 }}>
        <strong>Üretim ortamı notu:</strong> HTTPS üzerinde WSS kullanın; bağlantı kurulurken kimlik
        doğrulaması ve WebSocket Origin kontrolü yapın. Gelen mesajların biçimini ve boyutunu sunucuda
        doğrulayın. Çoklu sunucu kurulumunda yayınları eşitlemek için Redis Pub/Sub veya NATS gibi bir
        broker gerekebilir. WebSocket yeniden bağlanması ve tekrar gönderilecek mesaj kuyruğu uygulamada
        ayrıca tasarlanmalıdır.
      </div>
    </section>
  );
}
