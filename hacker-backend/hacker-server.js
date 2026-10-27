// hacker-server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(cors({
  origin(origin, callback) {
    let isLocalOrigin = false;
    if (origin) {
      try {
        const parsedOrigin = new URL(origin);
        isLocalOrigin = parsedOrigin.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);
      } catch {
        isLocalOrigin = false;
      }
    }

    if (!origin || isLocalOrigin) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin izinli değil.'));
  }
}));
app.use(express.json({ limit: '2kb' }));

const demoRecords = {
  'sql-injection': {
    event: 'simulated-record-exposure',
    data: { id: 1, username: 'demo-admin', role: 'Sistem Yöneticisi' }
  },
  'bot-protection': {
    event: 'simulated-session-exposure',
    data: { account: 'demo-user', session: 'SIMULATED_SESSION_NOT_VALID' }
  },
  http: {
    event: 'simulated-plaintext-request',
    data: { user: 'ogrenci', password: 'ornek123', note: 'Eğitim için sentetik veri' }
  },
  https: {
    event: 'simulated-tls-endpoint-data',
    data: { user: 'ogrenci', password: 'ornek123', note: 'TLS hedef sunucuda çözülmüş sentetik veri' }
  }
};

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'local-lab-demo-collector' });
});

app.post('/lab/collect', (req, res) => {
  const { lab } = req.body;
  const demoRecord = demoRecords[lab];

  if (!demoRecord) {
    return res.status(400).json({ ok: false, error: 'Desteklenmeyen demo laboratuvarı.' });
  }

  const record = {
    time: new Date().toISOString(),
    lab,
    ...demoRecord
  };
  fs.appendFileSync('stolen_data.txt', `${JSON.stringify(record)}\n`);
  console.log('Yerel eğitim demosu kaydedildi:', record);
  return res.status(201).json({
    ok: true,
    lab,
    event: demoRecord.event,
    data: demoRecord.data
  });
});

app.listen(4000, '127.0.0.1', () => {
  console.log('Yerel eğitim alıcısı http://127.0.0.1:4000 üzerinde dinliyor...');
});