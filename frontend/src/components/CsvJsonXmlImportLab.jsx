import React, { useState } from 'react';

const sampleRecords = {
  csv: [
    { name: 'Ahmet Yılmaz', age: '24' },
    { name: 'Ayşe Kaya', age: '(20).' },
    { name: 'Mehmet Demir', age: '35' },
    { name: 'Fatma Şahin', age: 'yirmi iki' },
    { name: '', age: '28' }
  ],
  json: [
    { name: 'Ece Demir', age: 19 },
    { name: 'Mert Aydın', age: -5 },
    { name: 'Can Çelik', age: 22 },
    { name: '', age: 40 },
    { name: 'Deniz Aksoy', age: '(30)' }
  ],
  xml: [
    { name: 'Zeynep Arslan', age: '27' },
    { name: '', age: '16.' },
    { name: 'Burak Yıldız', age: '33' },
    { name: 'Elif Koç', age: '-10' },
    { name: 'Murat Çetin', age: '' }
  ]
};

const formats = {
  csv: {
    label: 'CSV',
    fileName: 'students.csv',
    source: 'ad,yaş\nAhmet Yılmaz,24\nAyşe Kaya,yirmi\nMehmet Demir,35\nFatma Şahin,yirmi iki\n,28',
    description: 'Virgülle ayrılan sütunları ve satırları okur.'
  },
  json: {
    label: 'JSON',
    fileName: 'students.json',
    source: '[\n  { "ad": "Ece Demir", "yaş": 19 },\n  { "ad": "Mert Aydın", "yaş": -5 },\n  { "ad": "Can Çelik", "yaş": 22 },\n  { "ad": "", "yaş": 40 },\n  { "ad": "Deniz Aksoy", "yaş": 30 }\n]',
    description: 'Nesne listesini okur; gerekli alanları ve veri tiplerini denetler.'
  },
  xml: {
    label: 'XML',
    fileName: 'students.xml',
    source: '<students>\n  <student><name>Zeynep Arslan</name><age>27</age></student>\n  <student><name></name><age>16</age></student>\n  <student><name>Burak Yıldız</name><age>33</age></student>\n  <student><name>Elif Koç</name><age>-10</age></student>\n  <student><name>Murat Çetin</name><age></age></student>\n</students>',
    description: 'Etiket ağacını okur; etiket adları ve hiyerarşisi önemlidir.'
  }
};

const sqliteExample = `import csv
import json
import sqlite3
import xml.etree.ElementTree as ET
from pathlib import Path

FILES = [Path("students.csv"), Path("students.json"), Path("students.xml")]

FIXES = {
    ("students.csv", 2): {"age": "20"},
    ("students.json", 2): {"age": "18"},
    ("students.xml", 2): {"name": "Mert Aydın"},
}

def read_records(path):
    if path.suffix == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as file:
            return [
                {"name": row.get("ad", ""), "age": row.get("yaş", "")}
                for row in csv.DictReader(file)
            ]
    if path.suffix == ".json":
        records = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(records, list):
            raise ValueError(f"{path.name}: JSON kök değeri bir liste olmalı.")
        if not all(isinstance(row, dict) for row in records):
            raise ValueError(f"{path.name}: her JSON kaydı bir nesne olmalı.")
        return [
            {"name": row.get("ad", ""), "age": row.get("yaş", "")}
            for row in records
        ]
    if path.suffix == ".xml":
        root = ET.parse(path).getroot()
        return [
            {"name": row.findtext("name", ""), "age": row.findtext("age", "")}
            for row in root.findall("student")
        ]
    raise ValueError(f"Desteklenmeyen dosya: {path.name}")

def validate(record, source, row_number):
    name = record.get("name")
    name_str = " ".join(str(name).split()) if name is not None else None
    
    age_val = record.get("age")
    if age_val is not None:
        try:
            age = int(age_val)
        except (TypeError, ValueError) as error:
            raise ValueError(f"{source} kayıt {row_number}: yaş tam sayı olmalı.") from error
        if not 0 <= age <= 120:
            raise ValueError(f"{source} kayıt {row_number}: yaş 0–120 arasında olmalı.")
    else:
        age = None

    return (name_str, age, source)`;

function inspectRecord(record) {
  const nameVal = record.name;
  const name = nameVal === null ? null : String(nameVal ?? '').trim().replace(/\s+/g, ' ');
  
  const ageVal = record.age;
  const ageText = ageVal === null ? null : String(ageVal ?? '').trim();
  const age = ageText === null ? null : Number(ageText);
  
  const errors = [];

  if (nameVal !== null && !name) {
    errors.push('Ad alanı boş olamaz.');
  }

  if (ageVal !== null) {
    if (!/^-?\d+$/.test(ageText)) {
      errors.push('Yaş tam sayı olmalı.');
    } else if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.push('Yaş 0–120 arasında olmalı.');
    }
  }

  return { normalizedName: name, parsedAge: age, errors };
}

function getAutomaticCorrection(record) {
  const correction = {};
  const logs = [];

  const name = record.name;
  if (name === undefined || name === null || String(name).trim() === '') {
    if (name !== null) {
      correction.name = null;
      logs.push('ad alanı boş olduğundan null yapıldı');
    }
  } else {
    const normalizedName = String(name).trim().replace(/\s+/g, ' ');
    if (normalizedName !== name) {
      correction.name = normalizedName;
      logs.push(`ad alanı "${name}" -> "${normalizedName}" olarak düzeltildi`);
    }
  }

  const ageVal = record.age;
  if (ageVal === undefined || ageVal === null || String(ageVal).trim() === '') {
    if (ageVal !== null) {
      correction.age = null;
      logs.push('yaş alanı boş olduğundan null yapıldı');
    }
  } else {
    const ageText = String(ageVal).trim();
    const punctuationTrimmedAge = ageText.replace(/[.,]+$/, '');
    const unwrappedAge = punctuationTrimmedAge.startsWith('(') && punctuationTrimmedAge.endsWith(')')
      ? punctuationTrimmedAge.slice(1, -1).trim()
      : punctuationTrimmedAge;
    const normalizedAge = unwrappedAge.replace(/[.,]+$/, '');

    if (/^[+-]?\d+(?:[.,]0+)?$/.test(normalizedAge)) {
      const age = Math.abs(Number(normalizedAge.replace(',', '.')));
      if (Number.isSafeInteger(age) && age <= 120 && String(age) !== String(record.age)) {
        correction.age = String(age);
        logs.push(`yaş alanı "${record.age}" -> "${age}" olarak düzeltildi`);
      }
    }
  }

  return { correction, logs };
}

export function CsvJsonXmlImportLab() {
  const [format, setFormat] = useState('csv');
  const [recordsByFormat, setRecordsByFormat] = useState(() => (
    Object.fromEntries(Object.entries(sampleRecords).map(([key, records]) => (
      [key, records.map((record) => ({ ...record }))]
    )))
  ));
  const [databaseRows, setDatabaseRows] = useState([]);
  const [status, setStatus] = useState('');
  const selectedFormat = formats[format];
  const records = recordsByFormat[format];
  const inspectedRecords = records.map((record) => ({
    ...record,
    ...inspectRecord(record)
  }));
  const invalidCount = inspectedRecords.filter((record) => record.errors.length > 0).length;
  
  const fixableRecordCount = records.filter((record) => {
    const { correction } = getAutomaticCorrection(record);
    return Object.keys(correction).length > 0;
  }).length;

  const automaticallyCorrectRecords = () => {
    let correctedFields = 0;
    const correctionLogs = [];
    let remainingInvalidRecords = 0;

    const correctedRecords = records.map((record, index) => {
      const { correction, logs } = getAutomaticCorrection(record);
      if (Object.keys(correction).length > 0) {
        correctedFields += Object.keys(correction).length;
        logs.forEach((log) => {
          correctionLogs.push(`Kayıt ${index + 1}: ${log}`);
        });
      }
      const correctedRecord = { ...record, ...correction };
      if (inspectRecord(correctedRecord).errors.length > 0) remainingInvalidRecords += 1;
      return correctedRecord;
    });

    if (correctedFields === 0) {
      setStatus('Otomatik düzeltilebilecek güvenli bir biçim hatası bulunamadı.');
      return;
    }

    setRecordsByFormat((current) => ({ ...current, [format]: correctedRecords }));
    setDatabaseRows((current) => current.filter((record) => record.format !== format));
    
    const summaryText = correctionLogs.join(' | ');
    setStatus(
      `${correctedFields} alan düzeltildi. [${summaryText}]. ${
        remainingInvalidRecords
          ? `${remainingInvalidRecords} kayıt hâlâ geçersiz.`
          : 'Tüm kayıtlar aktarım için geçerli.'
      }`
    );
  };

  const importToDatabase = () => {
    if (invalidCount > 0) {
      setStatus('Aktarım durduruldu. Önce hatalı kayıtları düzeltin.');
      return;
    }

    const rowsToImport = inspectedRecords.map((record, idx) => ({
      id: `${format}-${idx}`,
      name: record.name === null ? 'NULL' : record.normalizedName,
      age: record.age === null ? 'NULL' : record.parsedAge,
      source: selectedFormat.fileName,
      format
    }));
    setDatabaseRows((current) => [
      ...current.filter((record) => record.format !== format),
      ...rowsToImport
    ]);
    setStatus(`${rowsToImport.length} kayıt örnek veritabanına aktarıldı.`);
  };

  return (
    <section style={containerStyle}>
      <header style={headerStyle}>
        <h2 style={titleStyle}>Hafta 4: CSV, JSON ve XML Dosyalarını Veritabanına Yükleme</h2>
        <p style={descriptionStyle}>
          Dosyayı uygun ayrıştırıcıyla okuyun, kayıtları şemaya göre doğrulayın, hatalı veriyi düzeltin
          ve yalnızca geçerli kayıtları aktarın.
        </p>
      </header>

      <div style={stepRowStyle} aria-label="Veri aktarım adımları">
        {['Dosyayı ayrıştır', 'Şema ve tip denetimi', 'Hatalı veriyi düzelt', 'Veritabanına aktar'].map((step, index) => (
          <div key={step} style={stepStyle}>
            <span style={stepNumberStyle}>{index + 1}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}>1. Dosya biçimini seçin</h3>
        <div style={tabRowStyle} role="group" aria-label="Dosya biçimi">
          {Object.entries(formats).map(([key, item]) => (
            <button
              key={key}
              type="button"
              aria-pressed={format === key}
              onClick={() => {
                setFormat(key);
                setStatus('');
              }}
              style={tabStyle(format === key)}
            >
              {item.label} · {item.fileName}
            </button>
          ))}
        </div>
        <p style={smallTextStyle}>{selectedFormat.description}</p>
        <pre style={sourceStyle}><code>{selectedFormat.source}</code></pre>
      </section>

      <section style={panelStyle}>
        <div style={tableHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>2. Kayıtları doğrulayın ve düzeltin</h3>
            <p style={smallTextStyle}>Alanlar salt okunurdur (manuel değiştirilemez); düzeltmeler otomatik yapılır.</p>
          </div>
          <span style={countBadgeStyle(invalidCount > 0)}>
            {invalidCount ? `${invalidCount} hatalı kayıt` : 'Tüm kayıtlar geçerli'}
          </span>
        </div>
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Kayıt</th>
                <th style={thStyle}>Ad</th>
                <th style={thStyle}>Yaş</th>
                <th style={thStyle}>Doğrulama sonucu</th>
              </tr>
            </thead>
            <tbody>
              {inspectedRecords.map((record, index) => (
                <tr key={`${format}-${index}`}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>
                    <input
                      aria-label={`${index + 1}. kayıt adı`}
                      value={record.name === null || record.name === undefined ? '' : String(record.name)}
                      readOnly
                      style={readOnlyInputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      aria-label={`${index + 1}. kayıt yaşı`}
                      value={record.age === null || record.age === undefined ? '' : String(record.age)}
                      readOnly
                      style={readOnlyInputStyle}
                    />
                  </td>
                  <td style={{
                    ...tdStyle,
                    color: record.errors.length ? '#b91c1c' : '#166534',
                    whiteSpace: 'normal',
                    minWidth: 180
                  }}>
                    {record.errors.length ? record.errors.join(' ') : 'Geçerli · aktarılabilir'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={actionRowStyle}>
          <button
            type="button"
            onClick={automaticallyCorrectRecords}
            disabled={fixableRecordCount === 0}
            style={secondaryButtonStyle(fixableRecordCount > 0)}
          >
            Hataları otomatik düzelt
          </button>
          <button type="button" onClick={importToDatabase} style={primaryButtonStyle}>
            Geçerli kayıtları veritabanına aktar
          </button>
          <span role="status" style={statusStyle(invalidCount, status)}>
            {status || (invalidCount ? 'Hatalı kayıtları düzeltmeden aktarım yapılamaz.' : 'Aktarıma hazır.')}
          </span>
        </div>
        <p style={smallTextStyle}>
          Otomatik işlem boş alanları <code>null</code> yapar; parantez/noktalama,
          baştaki eksi işareti ve gereksiz boşlukları temizler.
        </p>
      </section>

      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}>3. Ortak veritabanı tablosu</h3>
        <p style={smallTextStyle}>
          Aktarılan geçerli kayıtların veritabanındaki son hali:
        </p>
        {databaseRows.length ? (
          <div style={tableScrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr><th style={thStyle}>Ad</th><th style={thStyle}>Yaş</th><th style={thStyle}>Kaynak dosya</th><th style={thStyle}>Durum</th></tr>
              </thead>
              <tbody>
                {databaseRows.map((record) => (
                  <tr key={record.id}>
                    <td style={tdStyle}>{record.name}</td>
                    <td style={tdStyle}>{record.age}</td>
                    <td style={tdStyle}>{record.source}</td>
                    <td style={{ ...tdStyle, color: '#166534' }}>Onaylandı</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={emptyStyle}>Henüz kayıt aktarılmadı. Hataları düzeltip aktarın.</p>
        )}
      </section>
    </section>
  );
}

const containerStyle = { display: 'grid', gap: 12, maxWidth: 1000, margin: '0 auto', color: '#111827' };
const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: 10 };
const titleStyle = { margin: 0, fontSize: 19, lineHeight: 1.4 };
const descriptionStyle = { margin: '6px 0 0', color: '#475569', fontSize: 13, lineHeight: 1.55 };
const stepRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 7 };
const stepStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', border: '1px solid #dbe3ec', borderRadius: 5, color: '#334155', fontSize: 11 };
const stepNumberStyle = { display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 };
const panelStyle = { minWidth: 0, padding: 12, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' };
const sectionTitleStyle = { margin: 0, fontSize: 14, color: '#111827' };
const tabRowStyle = { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 };
const tabStyle = (active) => ({ padding: '7px 10px', border: `1px solid ${active ? '#0284c7' : '#cbd5e1'}`, borderRadius: 5, background: active ? '#e0f2fe' : '#fff', color: active ? '#075985' : '#334155', cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400 });
const smallTextStyle = { margin: '6px 0 8px', color: '#64748b', fontSize: 12, lineHeight: 1.5 };
const sourceStyle = { margin: 0, padding: 10, overflowX: 'auto', borderRadius: 5, background: '#0f172a', color: '#dbeafe', fontSize: 11, lineHeight: 1.55 };
const tableHeaderStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' };
const countBadgeStyle = (hasErrors) => ({ padding: '4px 7px', borderRadius: 12, background: hasErrors ? '#fef2f2' : '#f0fdf4', color: hasErrors ? '#b91c1c' : '#166534', fontSize: 11 });
const tableScrollStyle = { overflowX: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle = { padding: 7, borderBottom: '1px solid #cbd5e1', color: '#475569', textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle = { padding: 7, borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'top' };
const readOnlyInputStyle = { width: '100%', minWidth: 100, boxSizing: 'border-box', padding: '6px 7px', border: '1px solid #cbd5e1', borderRadius: 4, color: '#111827', background: '#f8fafc', cursor: 'not-allowed', font: 'inherit' };
const actionRowStyle = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 };
const primaryButtonStyle = { padding: '8px 11px', border: 0, borderRadius: 5, background: '#0369a1', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const secondaryButtonStyle = (enabled) => ({ padding: '8px 11px', border: '1px solid #cbd5e1', borderRadius: 5, background: enabled ? '#f8fafc' : '#f1f5f9', color: enabled ? '#334155' : '#94a3b8', cursor: enabled ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 });
const statusStyle = (hasErrors, status) => ({ color: status && status.includes('durduruldu') ? '#b91c1c' : hasErrors ? '#b45309' : '#166534', fontSize: 12 });
const emptyStyle = { margin: '10px 0 0', padding: 10, borderRadius: 5, background: '#f8fafc', color: '#64748b', fontSize: 12 };