import React, { useState } from 'react';

const examScores = [
  { student: 'Ece', classroom: '9-A', score: 85 },
  { student: 'Ali', classroom: '9-A', score: 110 },
  { student: 'Zeynep', classroom: '9-B', score: 72 },
  { student: 'Mert', classroom: '9-B', score: null },
  { student: 'Deniz', classroom: '9-A', score: 90 }
];

const storageOptions = {
  warehouse: {
    label: 'Veri ambarı',
    description: 'Kontrol edilmiş notları saklar. Öğretmenler buradan sınıf ortalaması gibi raporlar alır.'
  },
  lake: {
    label: 'Veri gölü',
    description: 'Gelen verileri ilk hâliyle saklar. Örneğin notların yanında öğretmenin yüklediği dosyalar da tutulabilir.'
  },
  lakehouse: {
    label: 'Lakehouse',
    description: 'Ham kayıtları da temizlenmiş notları ve raporları da aynı yapıda tutar.'
  }
};

export function DataStorageArchitectureLab() {
  const [storage, setStorage] = useState('lakehouse');
  const [showReport, setShowReport] = useState(false);
  const validScores = examScores.filter((record) => (
    record.student.trim() !== ''
    && record.classroom.trim() !== ''
    && Number.isInteger(record.score)
    && record.score >= 0
    && record.score <= 100
  ));
  const classAverages = Object.values(validScores.reduce((averages, record) => {
    const classroom = averages[record.classroom] ?? { classroom: record.classroom, total: 0, count: 0 };
    classroom.total += record.score;
    classroom.count += 1;
    averages[record.classroom] = classroom;
    return averages;
  }, {})).map((classroom) => ({
    ...classroom,
    average: Math.round(classroom.total / classroom.count)
  }));
  const selectedStorage = storageOptions[storage];

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Hafta 7: Veri Depolama — Sınav Notları Örneği</h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
          Bir sınav uygulamasına gelen notları kontrol edip saklayalım ve sınıf ortalamasını bulalım.
        </p>
      </div>

      <section style={panelStyle}>
        <h3 style={panelTitleStyle}>1. Notlar sisteme geliyor (ham veri)</h3>
        <p style={descriptionStyle}>
          Öğrenci adı, sınıf ve not bilgisi kaydedilmek üzere gelir. Önce bu bilgilerin geçerli olup olmadığını kontrol ederiz.
        </p>
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Öğrenci', 'Sınıf', 'Not', 'Kontrol sonucu'].map((column) => (
                  <th key={column} style={thStyle}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {examScores.map((record) => {
                const isValid = validScores.includes(record);
                return (
                  <tr key={record.student}>
                    <td style={tdStyle}>{record.student}</td>
                    <td style={tdStyle}>{record.classroom}</td>
                    <td style={tdStyle}>{record.score ?? 'Boş'}</td>
                    <td style={{ ...tdStyle, color: isValid ? '#166534' : '#b91c1c', fontWeight: 600 }}>
                      {isValid ? 'Geçerli' : record.score === null ? 'Not girilmemiş' : 'Not 0–100 arasında olmalı'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: '10px', borderLeft: '3px solid #0f766e' }}>
        <h3 style={panelTitleStyle}>2. Geçerli notları sakla</h3>
        <p style={descriptionStyle}>
          Bu örnekte notu yalnızca 0 ile 100 arasındaysa kabul ediyoruz. 110 geçersiz, boş not ise eksik olduğu için rapora alınmıyor.
        </p>
        <div style={flowStyle}>
          <div style={flowStepStyle}><strong>Gelen veri</strong><span>5 not kaydı</span></div>
          <span aria-hidden="true" style={arrowStyle}>→</span>
          <div style={flowStepStyle}><strong>Kontrol</strong><span>Not 0–100 mü?</span></div>
          <span aria-hidden="true" style={arrowStyle}>→</span>
          <div style={flowStepStyle}><strong>Saklanan</strong><span>{validScores.length} geçerli not</span></div>
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: '10px' }}>
        <h3 style={panelTitleStyle}>3. Veriyi nerede saklayalım?</h3>
        <p style={descriptionStyle}>Aynı sınav örneğiyle üç depolama yaklaşımını karşılaştıralım:</p>
        <div style={buttonGroupStyle} role="group" aria-label="Depolama türü">
          {Object.entries(storageOptions).map(([key, option]) => (
            <button
              key={key}
              type="button"
              aria-pressed={storage === key}
              onClick={() => setStorage(key)}
              style={buttonStyle(storage === key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p style={storageDescriptionStyle} role="status">{selectedStorage.description}</p>
      </section>

      <section style={{ ...panelStyle, marginTop: '10px' }}>
        <div style={reportHeaderStyle}>
          <div>
            <h3 style={panelTitleStyle}>4. Sınıf ortalaması raporu</h3>
            <p style={descriptionStyle}>Rapor, yalnızca geçerli notları kullanır.</p>
          </div>
          <button type="button" onClick={() => setShowReport((shown) => !shown)} style={reportButtonStyle}>
            {showReport ? 'Raporu gizle' : 'Raporu göster'}
          </button>
        </div>
        {showReport ? (
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Sınıf</th><th style={thStyle}>Öğrenci sayısı</th><th style={thStyle}>Not ortalaması</th></tr></thead>
              <tbody>
                {classAverages.map((classroom) => (
                  <tr key={classroom.classroom}>
                    <td style={tdStyle}>{classroom.classroom}</td>
                    <td style={tdStyle}>{classroom.count}</td>
                    <td style={tdStyle}>{classroom.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={descriptionStyle}>Düğmeye basınca 9-A ve 9-B sınıflarının ortalamasını görebilirsin.</p>
        )}
      </section>
    </div>
  );
}

const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '14px' };
const panelStyle = { minWidth: 0, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' };
const panelTitleStyle = { margin: 0, color: '#111827', fontSize: '13px' };
const descriptionStyle = { margin: '5px 0 9px', color: '#475569', fontSize: '12px', lineHeight: 1.5 };
const tableScrollStyle = { overflowX: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' };
const thStyle = { padding: '7px', borderBottom: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' };
const tdStyle = { padding: '7px', borderBottom: '1px solid #f1f5f9', color: '#334155' };
const flowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' };
const flowStepStyle = { display: 'grid', gap: '3px', minWidth: '110px', padding: '9px', border: '1px solid #cbd5e1', borderRadius: '5px', color: '#334155', fontSize: '11px', textAlign: 'center' };
const arrowStyle = { color: '#64748b', fontSize: '18px' };
const buttonGroupStyle = { display: 'flex', gap: '7px', flexWrap: 'wrap' };
const buttonStyle = (active) => ({ padding: '7px 10px', border: `1px solid ${active ? '#0284c7' : '#cbd5e1'}`, borderRadius: '5px', backgroundColor: active ? '#e0f2fe' : '#fff', color: active ? '#075985' : '#334155', fontSize: '11px', fontWeight: active ? 600 : 400, cursor: 'pointer' });
const storageDescriptionStyle = { margin: '9px 0 0', padding: '9px', borderRadius: '5px', backgroundColor: '#f0f9ff', color: '#334155', fontSize: '12px', lineHeight: 1.5 };
const reportHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' };
const reportButtonStyle = { padding: '7px 10px', border: 'none', borderRadius: '5px', backgroundColor: '#0369a1', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' };
