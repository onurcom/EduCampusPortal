const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'educampus_gizli_anahtar_2026';

// Body Parser & Cookie Parser Middleware
app.use(express.json());
app.use(cookieParser());

// Web Güvenliği Dersi: Sıkı CORS Yapılandırması
const allowedOrigins = ['http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Politikası Engeli: Yetkisiz Origin!'));
    }
  },
  credentials: true // HttpOnly Cookie aktarımı için şart
}));

// Bellek İçi Örnek Veri Deposu
let announcements = [
  { id: 1, title: 'Vize Sınav Takvimi Açıklandı', content: 'Sınavlar önümüzdeki hafta başlayacaktır.', category: 'Sınav' }
];

// --- AUTH ENDPOINTS ---

// Kullanıcı Girişi ve HttpOnly Cookie ile JWT Teslimi
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Örnek Sabit Kullanıcı (Demo)
  if (username === 'admin' && password === '123456') {
    const token = jwt.sign({ username, role: 'Instructor' }, JWT_SECRET, { expiresIn: '1h' });

    // Web Güvenliği Dersi: Token'ı LocalStorage yerine HttpOnly Cookie'de saklama
    res.cookie('accessToken', token, {
      httpOnly: true, // XSS ile erişilemez
      secure: false,  // Localhost (HTTP) için false, canlıda (HTTPS) true olmalı
      sameSite: 'lax',
      maxAge: 3600000 // 1 saat
    });

    return res.json({ success: true, message: 'Giriş başarılı!', user: { username, role: 'Instructor' } });
  }

  return res.status(401).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre!' });
});

// Oturum Durumu Kontrolü
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ message: 'Yetkisiz erişim! Token bulunamadı.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.status(401).json({ authenticated: false, message: 'Geçersiz veya süresi dolmuş token.' });
  }
});

// --- ANNOUNCEMENT ENDPOINTS ---

// Duyuruları Getirme (GET)
app.get('/api/announcements', (req, res) => {
  res.json(announcements);
});

// Yeni Duyuru Ekleme (POST)
app.post('/api/announcements', (req, res) => {
  const { title, content, category } = req.body;

  // Sunucu Tarafı Temel Doğrulama
  if (!title || !content || !category) {
    return res.status(400).json({ message: 'Tüm alanların doldurulması zorunludur.' });
  }

  const newAnnouncement = {
    id: announcements.length + 1,
    title,
    content,
    category
  };

  announcements.push(newAnnouncement);
  res.status(201).json({ success: true, data: newAnnouncement });
});

app.listen(PORT, () => {
  console.log(`EduCampus Backend çalışıyor: http://localhost:${PORT}`);
});
