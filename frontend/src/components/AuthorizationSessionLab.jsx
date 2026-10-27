import React, { useState } from 'react';
import { SecurityImpactNotice } from './SecurityImpactNotice';

const users = [
  { id: 'ada', name: 'Ada Yılmaz', role: 'student', classId: 'A' },
  { id: 'bora', name: 'Bora Demir', role: 'student', classId: 'A' },
  { id: 'ceylan', name: 'Ceylan Kaya', role: 'student', classId: 'B' },
  { id: 'selin', name: 'Selin Öğretmen', role: 'instructor', classId: 'A' },
  { id: 'admin', name: 'Sistem Yöneticisi', role: 'admin', classId: null }
];

const vulnerableCode = `// ❌ İstemci tarafından gelen ID'ye güveniliyor
app.get('/api/students/:studentId/grades', (req, res) => {
  const grades = gradeBook[req.params.studentId];
  if (!grades) return res.sendStatus(404);
  res.json(grades);
});`;

const secureCode = `// ✅ Kimlik ve yetki her istekte sunucuda doğrulanır
app.get('/api/students/:studentId/grades',
  requireAuth,
  (req, res) => {
    const student = studentsById[req.params.studentId];
    if (!student) return res.sendStatus(404);

    const isOwner =
      req.session.user.id === student.id;
    const isClassTeacher =
      req.session.user.role === 'instructor' &&
      req.session.user.classId === student.classId;
    const isAdmin = req.session.user.role === 'admin';

    if (!isOwner && !isClassTeacher && !isAdmin) {
      return res.sendStatus(403);
    }
    res.json(gradeBook[student.id]);
  }
);

// Not güncelleme: yalnızca öğretmen kendi sınıfında değiştirebilir.
app.patch('/api/students/:studentId/grade',
  requireAuth,
  requireRole('instructor'),
  async (req, res) => {
    const student = await students.findById(req.params.studentId);
    if (!student) return res.sendStatus(404);
    if (req.session.user.classId !== student.classId) {
      return res.sendStatus(403);
    }
    const grade = validateGrade(req.body.grade);
    await gradeBook.update(student.id, grade);
    res.json({ studentId: student.id, grade });
  }
);`;

const sessionCode = `// express-session yapılandırması (üretimde HTTPS zorunlu)
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
  }
}));

// POST /login: kimlik bilgileri doğrulandıktan sonra
req.session.regenerate((err) => {
  if (err) return next(err);
  req.session.user = { id: user.id, role: user.role };
  res.sendStatus(204);
});

// POST /admin/role-change: yeni rol sunucuda doğrulandıktan sonra
req.session.regenerate((err) => {
  if (err) return next(err);
  req.session.user = { id: user.id, role: verifiedRole };
  res.sendStatus(204);
});

// POST /logout: sunucu oturumunu da geçersiz kıl
req.session.destroy((err) => {
  if (err) return next(err);
  res.clearCookie('sid', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });
  res.sendStatus(204);
});`;

export function AuthorizationSessionLab({ isSafeMode }) {
  const [actorId, setActorId] = useState('ada');
  const [targetId, setTargetId] = useState('ada');
  const [gradeBook, setGradeBook] = useState({
    ada: { course: 'Web Güvenliği', grade: 92 },
    bora: { course: 'Web Güvenliği', grade: 78 },
    ceylan: { course: 'Web Güvenliği', grade: 85 }
  });
  const [gradeInput, setGradeInput] = useState('90');
  const [sessionActive, setSessionActive] = useState(true);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const actor = users.find((user) => user.id === actorId);
  const target = users.find((user) => user.id === targetId);
  const roleNames = {
    student: 'Öğrenci',
    instructor: 'Öğretmen',
    admin: 'Yönetici'
  };

  const addLog = (message, type = 'info') => {
    setLogs((previous) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString('tr-TR'),
        message,
        type
      },
      ...previous
    ]);
  };

  const handleActorChange = (event) => {
    const nextActor = users.find((user) => user.id === event.target.value);
    setActorId(nextActor.id);
    if (nextActor.role === 'student') {
      setTargetId(nextActor.id);
    } else if (nextActor.role === 'instructor') {
      setTargetId(users.find((user) => user.role === 'student' && user.classId === nextActor.classId).id);
    } else {
      setTargetId(users.find((user) => user.role === 'student').id);
    }
    setSessionActive(true);
    setResult(null);
    addLog(
      `${nextActor.name} ile giriş yapıldı. Yeni oturum kimliği oluşturuldu (session rotation).`,
      'success'
    );
  };

  const handleRequest = () => {
    if (!sessionActive) {
      setResult({ allowed: false, status: 401, message: 'Oturum bulunamadı veya süresi doldu.' });
      addLog('401 Unauthorized — aktif oturum olmadığı için istek reddedildi.', 'danger');
      return;
    }

    if (!isSafeMode) {
      setResult({
        allowed: true,
        status: 200,
        record: gradeBook[targetId],
        message: 'Güvensiz demo: sunucu rol ve sınıf sahipliğini denetlemeden kaydı döndürdü.'
      });
      addLog(
        `200 OK — ${actor.name}, /api/students/${targetId}/grades kaydını yetki kontrolü olmadan aldı.`,
        'danger'
      );
      return;
    }

    const isOwner = actor.role === 'student' && actor.id === target.id;
    const isClassTeacher = actor.role === 'instructor' && actor.classId === target.classId;
    const isAdmin = actor.role === 'admin';

    if (!isOwner && !isClassTeacher && !isAdmin) {
      setResult({
        allowed: false,
        status: 403,
        message: 'Bu öğrenci kaydına erişim yetkiniz yok.'
      });
      addLog(
        `403 Forbidden — sunucu ${actor.name} kullanıcısının ${target.name} kaydına erişimini engelledi.`,
        'danger'
      );
      return;
    }

    setResult({
      allowed: true,
      status: 200,
      record: gradeBook[targetId],
      message: isOwner
        ? 'Öğrenci yalnızca kendi notunu görüntüleyebilir.'
        : isClassTeacher
          ? 'Öğretmen kendi sınıfındaki öğrencinin notunu görüntüleyebilir ve güncelleyebilir.'
          : 'Yönetici tüm öğrencilerin notlarını görüntüleyebilir.'
    });
    addLog(
      `200 OK — ${actor.name} kullanıcısının ${target.name} kaydına erişimi sunucuda doğrulandı.`,
      'success'
    );
  };

  const handleGradeUpdate = () => {
    if (!sessionActive) {
      setResult({ allowed: false, status: 401, message: 'Oturum bulunamadı veya süresi doldu.' });
      addLog('401 Unauthorized — aktif oturum olmadığı için not güncelleme reddedildi.', 'danger');
      return;
    }

    const numericGrade = Number(gradeInput);
    if (!Number.isInteger(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      setResult({ allowed: false, status: 400, message: 'Not 0 ile 100 arasında tam sayı olmalıdır.' });
      addLog('400 Bad Request — not değeri 0–100 aralığında değil.', 'danger');
      return;
    }

    const mayManageGrade = actor.role === 'instructor' && actor.classId === target.classId;
    if (isSafeMode && !mayManageGrade) {
      setResult({
        allowed: false,
        status: 403,
        message: actor.role === 'admin'
          ? 'Bu örnekte yönetici tüm notları görüntüler; not değiştirme yetkisi öğretmene verilmiştir.'
          : 'Öğrenci not değiştiremez; yalnızca kendi notunu görüntüleyebilir.'
      });
      addLog(`403 Forbidden — ${actor.name} kullanıcısının ${target.name} notunu değiştirme yetkisi yok.`, 'danger');
      return;
    }

    setGradeBook((previous) => ({
      ...previous,
      [targetId]: { ...previous[targetId], grade: numericGrade }
    }));
    setResult({
      allowed: true,
      status: 200,
      record: { ...gradeBook[targetId], grade: numericGrade },
      message: isSafeMode
        ? 'Öğretmen kendi sınıfındaki öğrencinin notunu güncelledi.'
        : 'Güvensiz demo: not, sınıf/rol yetkisi denetlenmeden güncellendi.'
    });
    addLog(`200 OK — ${actor.name}, ${target.name} öğrencisinin notunu ${numericGrade} olarak güncelledi.`, isSafeMode ? 'success' : 'danger');
  };

  const handleLogout = () => {
    setSessionActive(false);
    setResult(null);
    addLog('Çıkış yapıldı: sunucu oturumu geçersiz kılındı ve sid çerezi silindi.', 'warning');
  };

  const handleIdleTimeout = () => {
    setSessionActive(false);
    setResult(null);
    addLog('15 dakika hareketsizlik simüle edildi: oturum zaman aşımıyla kapatıldı.', 'warning');
  };

  const code = isSafeMode ? secureCode : vulnerableCode;
  const codeTitle = isSafeMode ? 'Güvenli sunucu tarafı yetki kontrolü' : 'Zafiyetli doğrudan nesne erişimi';
  const visibleStudents = users.filter((user) => {
    if (user.role !== 'student') return false;
    if (!isSafeMode || actor.role === 'admin') return true;
    if (actor.role === 'instructor') return actor.classId === user.classId;
    return actor.id === user.id;
  });

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          Hafta 8: Yetkilendirme, Erişim Kontrolü ve Oturum Yönetimi
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#4b5563', margin: '6px 0 0' }}>
          Kimlik doğrulama “Kimsin?”, yetkilendirme ise “Bu kaynağa erişebilir misin?” sorusunu yanıtlar.
          Bu laboratuvar RBAC, IDOR ve güvenli oturum yaşam döngüsünü inceler.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginBottom: '10px' }}>
        <ConceptCard title="RBAC" text="Öğrenci kendi notunu; öğretmen kendi sınıfını; yönetici tüm kayıtları görebilir." />
        <ConceptCard title="IDOR" text="URL'deki öğrenci kimliğini değiştirerek başka bir kayda erişmek. UUID, yetki kontrolünün yerini tutmaz." />
        <ConceptCard title="Session" text="HTTP durumsuzdur; girişte oturum kimliğini yenile, boşta kalma süresini sınırla ve çıkışta iptal et." />
        <ConceptCard title="Hijacking / Fixation" text="Çerez bayrakları ve girişte session ID yenileme, oturum saldırılarının etkisini azaltır." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px', marginBottom: '16px' }}>
        <ModelCard acronym="RBAC" title="Rol tabanlı" text="Yetki, kullanıcı rolüne göre verilir." />
        <ModelCard acronym="ABAC" title="Öznitelik tabanlı" text="Kullanıcı, kaynak ve ortam özelliklerine göre karar verilir." />
        <ModelCard acronym="DAC" title="İsteğe bağlı" text="Kaynak sahibi erişimi devredebilir." />
        <ModelCard acronym="MAC" title="Zorunlu" text="Merkezi politika ve güvenlik etiketleri uygulanır." />
      </div>

      <div style={{
        padding: '10px 12px',
        marginBottom: '14px',
        borderRadius: '6px',
        border: `1px solid ${sessionActive ? '#86efac' : '#fca5a5'}`,
        backgroundColor: sessionActive ? '#f0fdf4' : '#fef2f2',
        color: sessionActive ? '#166534' : '#991b1b',
        fontSize: '12px'
      }}>
        <strong>Oturum durumu:</strong> {sessionActive ? 'Aktif — sid yalnızca HttpOnly çerezde varsayılır' : 'Kapalı / zaman aşımına uğradı'}
        <span style={{ marginLeft: '8px' }}>• {sessionActive ? 'HTTPS + Secure • SameSite=Lax • 15 dk hareketsizlik sınırı' : 'Sunucu oturumu geçersiz kılındı'}</span>
      </div>

      <section style={{ border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px', marginBottom: '14px', background: '#eff6ff' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>Bu laboratuvardaki yetki kuralları</h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '13px', lineHeight: 1.7, color: '#1f2937' }}>
          <li><strong>Öğrenci:</strong> yalnızca kendi notunu görüntüler; not değiştiremez.</li>
          <li><strong>Öğretmen:</strong> yalnızca kendi sınıfındaki öğrencilerin notlarını görüntüler ve günceller.</li>
          <li><strong>Yönetici:</strong> bütün öğrencilerin notlarını görüntüler.</li>
        </ul>
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#4b5563' }}>
          Kullanıcı/öğrenci seçicileri IDOR denemelerini göstermek içindir. Güvenli modda sunucu kuralı erişimi reddeder.
        </p>
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 10px', color: '#111827' }}>Not görüntüleme API'sini deneyin</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <label style={labelStyle}>
            Oturum açan kullanıcı
            <select value={actorId} onChange={handleActorChange} style={selectStyle}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {roleNames[user.role]}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            İstenen öğrenci kaydı
            <select value={targetId} onChange={(event) => { setTargetId(event.target.value); setResult(null); }} style={selectStyle}>
              {users.filter((user) => user.role === 'student').map((user) => (
                <option key={user.id} value={user.id}>{user.name} (Sınıf {user.classId})</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleRequest} style={buttonStyle('#1d4ed8')}>
            GET /api/students/{targetId}/grades
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <label style={{ ...labelStyle, maxWidth: '180px' }}>
            Yeni not (0–100)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={gradeInput}
              onChange={(event) => setGradeInput(event.target.value)}
              style={selectStyle}
            />
          </label>
          <button type="button" onClick={handleGradeUpdate} style={buttonStyle('#047857')}>
            Seçili öğrencinin notunu güncelle
          </button>
        </div>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '11px' }}>
          Güvenli modda yalnızca öğretmen, kendi sınıfındaki öğrencinin notunu değiştirebilir. Diğer denemeler 403 alır.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          <button type="button" onClick={handleLogout} disabled={!sessionActive} style={buttonStyle('#475569')}>
            Oturumu kapat
          </button>
          <button type="button" onClick={handleIdleTimeout} disabled={!sessionActive} style={buttonStyle('#b45309')}>
            15 dk hareketsizliği simüle et
          </button>
        </div>
        {result && (
          <div role="status" style={{
            marginTop: '12px',
            padding: '10px',
            borderRadius: '5px',
            backgroundColor: result.allowed ? '#f0fdf4' : '#fef2f2',
            color: result.allowed ? '#166534' : '#991b1b',
            fontSize: '12px'
          }}>
            <strong>HTTP {result.status} {result.allowed ? 'OK' : result.status === 401 ? 'Unauthorized' : 'Forbidden'}</strong>
            <div>{result.message}</div>
            {result.record && <div style={{ marginTop: '5px' }}>Ders: {result.record.course} • Not: {result.record.grade}</div>}
          </div>
        )}
        {!isSafeMode && result?.allowed && result?.record && (
          <SecurityImpactNotice
            title="IDOR ile başka öğrencinin notlarına erişildi"
            summary="Kullanıcı, URL içindeki öğrenci kimliğini değiştirerek sunucu tarafı yetki kontrolünü bypass etti. Bu örnekte hedef öğrencinin notları ve dersi çalındı."
            evidence={{
              'Erişilen kayıt': `${target?.name ?? targetId} | ${result.record.course}`,
              'Çalınan veri': `not=${result.record.grade}, sınıf=${target?.classId ?? 'bilinmiyor'}`,
              'Sonuç': 'Saldırgan kendi oturumundaki yetkiyle başka öğrencinin verilerini okudu.'
            }}
          />
        )}
        <div style={{ marginTop: '14px' }}>
          <h4 style={{ margin: '0 0 7px', fontSize: '13px' }}>
            {actor.role === 'admin' ? 'Tüm öğrencilerin notları' : actor.role === 'instructor' ? `Sınıf ${actor.classId} notları` : 'Kendi notun'}
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={tableCellStyle}>Öğrenci</th>
                  <th style={tableCellStyle}>Sınıf</th>
                  <th style={tableCellStyle}>Ders</th>
                  <th style={tableCellStyle}>Not</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.id}>
                    <td style={tableCellStyle}>{student.name}</td>
                    <td style={tableCellStyle}>{student.classId}</td>
                    <td style={tableCellStyle}>{gradeBook[student.id].course}</td>
                    <td style={tableCellStyle}>{gradeBook[student.id].grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ padding: '9px 12px', backgroundColor: isSafeMode ? '#ecfdf5' : '#fff1f2', color: isSafeMode ? '#065f46' : '#9f1239', fontSize: '12px', fontWeight: 700 }}>
          {codeTitle}
        </div>
        <pre style={{ margin: 0, padding: '12px', overflowX: 'auto', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '11px', lineHeight: 1.55 }}>
          <code>{code}</code>
        </pre>
        {isSafeMode && (
          <pre style={{ margin: 0, padding: '12px', overflowX: 'auto', backgroundColor: '#111827', color: '#bfdbfe', fontSize: '11px', lineHeight: 1.55, borderTop: '1px solid #334155' }}>
            <code>{sessionCode}</code>
          </pre>
        )}
      </section>

      <div style={{ border: '1px solid #111827', borderRadius: '6px', backgroundColor: '#0f172a', padding: '12px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '11px' }}>
        <h3 style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: '12px' }}>API / Oturum denetim kayıtları</h3>
        <div aria-live="polite" style={{ maxHeight: '130px', overflowY: 'auto' }}>
          {logs.length === 0 && <span style={{ color: '#64748b' }}>Bir API isteği veya oturum işlemi başlatın.</span>}
          {logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', color: log.type === 'danger' ? '#fca5a5' : log.type === 'success' ? '#86efac' : '#cbd5e1' }}>
              [{log.time}] {log.message}
            </div>
          ))}
        </div>
      </div>

      <p style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.5, marginTop: '10px' }}>
        Eğitim notu: Bu ekran tamamen yerel bir simülasyondur; veritabanına veya gerçek bir oturum servisine bağlanmaz.
        Gerçek uygulamada kimlik, rol, kayıt sahipliği, zaman aşımı ve oturum iptali sunucuda uygulanmalıdır.
      </p>
    </div>
  );
}

function ConceptCard({ title, text }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc' }}>
      <strong style={{ display: 'block', color: '#0f172a', fontSize: '12px', marginBottom: '4px' }}>{title}</strong>
      <span style={{ color: '#475569', fontSize: '11px', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function ModelCard({ acronym, title, text }) {
  return (
    <div style={{ borderLeft: '3px solid #38bdf8', padding: '7px 9px', backgroundColor: '#f8fafc' }}>
      <strong style={{ color: '#0369a1', fontSize: '10px' }}>{acronym} · </strong>
      <strong style={{ color: '#1f2937', fontSize: '10px' }}>{title}</strong>
      <div style={{ color: '#64748b', fontSize: '10px', lineHeight: 1.4, marginTop: '3px' }}>{text}</div>
    </div>
  );
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  color: '#374151',
  fontSize: '11px',
  fontWeight: 600
};

const selectStyle = {
  width: '100%',
  minHeight: '34px',
  padding: '6px 8px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  backgroundColor: '#fff',
  color: '#111827',
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

const tableCellStyle = {
  padding: '7px 8px',
  borderBottom: '1px solid #e2e8f0'
};
