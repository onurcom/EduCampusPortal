import React, { useState } from 'react';

const tests = [
  {
    id: 'sast',
    title: '1. Kodu kontrol et (SAST)',
    explanation: 'Kaynak kodu çalıştırmadan inceler. Örnekte kullanıcı girdisinin SQL sorgusuna eklenmesini bulur.',
    finding: {
      id: 'sql',
      title: 'SQL sorgusunda kullanıcı girdisi kullanılıyor',
      what: 'Arama kutusundan gelen değer doğrudan SQL komutuna eklenirse, veri komut gibi yorumlanabilir.',
      vulnerable: `// Riskli: değer SQL koduna ekleniyor
const sql = "SELECT * FROM courses WHERE name = '" + name + "'";
db.query(sql);`,
      safe: `// Güvenli: sorgu ve veri ayrı gönderiliyor
db.query(
  'SELECT * FROM courses WHERE name = ?',
  [name]
);`,
      fix: 'Parametreli sorgu kullan; kullanıcı değerini SQL metninden ayrı gönder.',
    },
  },
  {
    id: 'dast',
    title: '2. Çalışan uygulamayı dene (DAST)',
    explanation: 'Test ortamındaki çalışan uygulamanın yanıtlarını kontrol eder; örnekte başka kullanıcının notuna erişilip erişilemediğini sınar.',
    finding: {
      id: 'idor',
      title: 'Başka öğrencinin notuna erişim kontrolü eksik',
      what: 'Uygulama URL’deki öğrenci numarasını kullanıyor ancak oturum açan kullanıcının bu nota yetkisi olup olmadığını kontrol etmiyor.',
      vulnerable: `// Riskli: istenen öğrenci ID'si doğrudan kullanılıyor
app.get('/students/:id/grades', async (req, res) => {
  res.json(await grades.findByStudentId(req.params.id));
});`,
      safe: `// Güvenli: kullanıcının yetkisi kontrol ediliyor
app.get('/students/:id/grades', requireAuth, async (req, res) => {
  if (req.params.id !== req.user.studentId) {
    return res.sendStatus(403);
  }
  res.json(await grades.findByStudentId(req.params.id));
});`,
      fix: 'Her istekte sunucuda kullanıcının rolünü ve istenen kayda erişim yetkisini kontrol et.',
    },
  },
];

const initialStates = {
  sql: 'open',
  idor: 'open',
};

export function SecurityTestingLab() {
  const [results, setResults] = useState({});
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [findingStates, setFindingStates] = useState(initialStates);
  const [events, setEvents] = useState([
    'Başlamak için yukarıdaki testlerden birini çalıştır.',
  ]);

  const addEvent = (message) => {
    setEvents((previous) => [message, ...previous].slice(0, 5));
  };

  const runTest = (test) => {
    setResults((previous) => ({ ...previous, [test.id]: true }));
    if (findingStates[test.finding.id] === 'fixed') {
      setFindingStates((previous) => ({ ...previous, [test.finding.id]: 'closed' }));
      addEvent(`${test.title}: Retest başarılı; düzeltme doğrulandı.`);
      return;
    }

    addEvent(`${test.title}: 1 örnek bulgu bulundu. Gerçek bir uygulamaya istek gönderilmedi.`);
  };

  const markFixed = (finding) => {
    setFindingStates((previous) => ({ ...previous, [finding.id]: 'fixed' }));
    addEvent(`“${finding.title}” için düzeltme yapıldı olarak işaretlendi. Kapatmak için aynı testi yeniden çalıştır.`);
  };

  const allTestsRun = tests.every((test) => results[test.id]);
  const unresolvedFindings = Object.values(findingStates).filter((state) => state !== 'closed').length;
  const gatePassed = allTestsRun && unresolvedFindings === 0;
  const selectedFinding = tests.map((test) => test.finding).find((finding) => finding.id === selectedFindingId);

  return (
    <section style={{ maxWidth: 900, margin: '0 auto', color: '#111827', fontFamily: 'inherit' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 19 }}>Hafta 10: Güvenlik testleri ve zafiyet analizi</h2>
        <p style={{ margin: '8px 0 0', color: '#4b5563', fontSize: 14, lineHeight: 1.55 }}>
          Güvenlik testi, uygulamadaki bir problemi bulup düzeltmek ve düzeltmenin işe yaradığını tekrar kontrol etmektir.
          Bu laboratuvar bunu iki basit, yerel örnekle gösterir.
        </p>
      </header>

      <aside style={{ padding: 12, marginBottom: 14, borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: 13, lineHeight: 1.6 }}>
        <strong>Önce üç kelimeyi öğren:</strong>
        <ul style={{ margin: '5px 0 0', paddingLeft: 20 }}>
          <li><strong>Test:</strong> sorun var mı diye kontrol et.</li>
          <li><strong>Bulgu:</strong> testin bulduğu güvenlik problemi.</li>
          <li><strong>Retest:</strong> düzeltmeden sonra testi yeniden çalıştır; sorun gerçekten kapandı mı gör.</li>
        </ul>
      </aside>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {tests.map((test) => {
          const state = findingStates[test.finding.id];
          const isResolved = state === 'closed';
          const isFixed = state === 'fixed';

          return (
            <article key={test.id} style={cardStyle}>
              <h3 style={{ margin: '0 0 7px', fontSize: 16 }}>{test.title}</h3>
              <p style={{ margin: '0 0 12px', color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>{test.explanation}</p>
              <button type="button" onClick={() => runTest(test)} style={buttonStyle('#1d4ed8')}>
                {isFixed ? 'Retest: düzeltmeyi kontrol et' : results[test.id] ? 'Testi yeniden çalıştır' : 'Testi çalıştır'}
              </button>

              {results[test.id] && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: isResolved ? '#f0fdf4' : isFixed ? '#fffbeb' : '#fef2f2', color: isResolved ? '#166534' : isFixed ? '#92400e' : '#991b1b' }}>
                  <strong>{isResolved ? 'Düzeltme doğrulandı' : isFixed ? 'Düzeltme bekliyor: retest çalıştır' : 'Bulgu bulundu'}</strong>
                  {!isResolved && (
                    <>
                      <p style={{ margin: '5px 0', fontSize: 13 }}>{test.finding.title}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedFindingId(test.finding.id)}
                        style={textButtonStyle}
                      >
                        Basit açıklama ve kod örneğini gör
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {selectedFinding && (
        <section aria-labelledby="finding-title" style={{ ...cardStyle, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
            <div>
              <h3 id="finding-title" style={{ margin: '0 0 6px', fontSize: 16 }}>{selectedFinding.title}</h3>
              <p style={{ margin: 0, color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>{selectedFinding.what}</p>
            </div>
            <button type="button" onClick={() => setSelectedFindingId(null)} aria-label="Açıklamayı kapat" style={textButtonStyle}>Kapat</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 12 }}>
            <div>
              <strong style={{ display: 'block', marginBottom: 6, color: '#991b1b', fontSize: 13 }}>Riskli örnek</strong>
              <pre style={codeStyle}><code>{selectedFinding.vulnerable}</code></pre>
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: 6, color: '#166534', fontSize: 13 }}>Daha güvenli örnek</strong>
              <pre style={codeStyle}><code>{selectedFinding.safe}</code></pre>
            </div>
          </div>
          <p style={{ margin: '10px 0', fontSize: 13 }}><strong>Nasıl düzeltilir?</strong> {selectedFinding.fix}</p>
          {findingStates[selectedFinding.id] === 'open' && (
            <button type="button" onClick={() => markFixed(selectedFinding)} style={buttonStyle('#047857')}>
              Örnek düzeltmeyi yaptım
            </button>
          )}
          {findingStates[selectedFinding.id] === 'fixed' && (
            <p style={{ margin: 0, color: '#92400e', fontSize: 13 }}>
              Şimdi ilgili testi tekrar çalıştır. Retest başarılı olursa bulgu kapanır.
            </p>
          )}
          {findingStates[selectedFinding.id] === 'closed' && (
            <p style={{ margin: 0, color: '#166534', fontSize: 13 }}>Retest başarılı; bulgu kapatıldı.</p>
          )}
        </section>
      )}

      <section aria-live="polite" style={{
        ...cardStyle,
        marginTop: 14,
        borderColor: gatePassed ? '#86efac' : '#e5e7eb',
        background: gatePassed ? '#f0fdf4' : '#f9fafb',
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15 }}>Sonuç: dağıtım kontrolü</h3>
        <p style={{ margin: '0 0 8px', color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
          Basit kalite kuralı: iki test de çalışmış ve bulunan sorunlar düzeltilip retest ile kapatılmış olmalı.
        </p>
        <strong style={{ color: gatePassed ? '#166534' : '#92400e', fontSize: 14 }}>
          {gatePassed ? 'BAŞARILI — testler tamamlandı, açık bulgu yok.' : `BEKLEMEDE — ${tests.filter((test) => !results[test.id]).length} test çalıştırılmadı; ${unresolvedFindings} bulgu kapatılmadı.`}
        </strong>
      </section>

      <section style={{ ...cardStyle, marginTop: 14 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Test günlüğü</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: '#4b5563', fontSize: 12, lineHeight: 1.6 }}>
          {events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}
        </ol>
      </section>

      <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
        Bu sadece eğitim simülasyonudur; gerçek bir siteye bağlanmaz veya tarama isteği göndermez.
        Gerçek sistemlerde güvenlik testlerini yalnızca yazılı izin ve belirlenmiş kapsam içinde yapın.
      </p>
    </section>
  );
}

const cardStyle = {
  padding: 14,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  background: '#fff',
};

const codeStyle = {
  margin: 0,
  padding: 10,
  overflowX: 'auto',
  borderRadius: 5,
  background: '#111827',
  color: '#e5e7eb',
  fontSize: 12,
  lineHeight: 1.55,
};

const buttonStyle = (background) => ({
  border: 0,
  borderRadius: 5,
  padding: '9px 12px',
  background,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
});

const textButtonStyle = {
  padding: 0,
  border: 0,
  background: 'transparent',
  color: '#1d4ed8',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: 13,
};
