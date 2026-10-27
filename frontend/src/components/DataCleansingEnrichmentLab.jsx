import React, { useState } from 'react';

const rawCustomers = [
  { id: 'u-101', name: '  Ayşe Yılmaz  ', email: ' AYSE@example.com ', city: 'ISTANBUL', age: '29', monthlySpend: '4200' },
  { id: 'u-102', name: 'Mert Kaya', email: 'mert@example.com', city: 'Ankara', age: '34', monthlySpend: '3800' },
  { id: 'u-103', name: 'Ece Demir', email: 'ece@example.com', city: 'ankara', age: null, monthlySpend: '2600' },
  { id: 'u-104', name: 'Selin Arslan', email: 'selin@example.com', city: 'Izmir', age: '42', monthlySpend: '900000' },
  { id: 'u-105', name: 'Ayşe Yılmaz', email: 'ayse@example.com', city: 'İstanbul', age: '29', monthlySpend: '4200' },
  { id: 'u-106', name: 'Can Demir', email: 'can@example.com', city: 'izmir', age: '22', monthlySpend: null }
];

const cityCatalog = {
  istanbul: { region: 'Marmara', latitude: 41.01, longitude: 28.97, demoIndex: 82 },
  ankara: { region: 'İç Anadolu', latitude: 39.93, longitude: 32.86, demoIndex: 54 },
  izmir: { region: 'Ege', latitude: 38.42, longitude: 27.14, demoIndex: 76 }
};

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(sorted, percentileValue) {
  const position = (sorted.length - 1) * percentileValue;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) return sorted[lowerIndex];
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * (position - lowerIndex);
}

function normalizeCity(value) {
  const normalized = value.trim().toLocaleLowerCase('tr-TR');
  return normalized === 'ıstanbul' ? 'istanbul' : normalized;
}

function processCustomers({ missingStrategy, outlierStrategy, scalingStrategy }) {
  const parsed = rawCustomers.map((customer) => ({
    ...customer,
    name: customer.name.trim().replace(/\s+/g, ' '),
    email: customer.email.trim().toLowerCase(),
    city: normalizeCity(customer.city),
    age: customer.age === null || customer.age === '' ? null : Number(customer.age),
    monthlySpend: customer.monthlySpend === null || customer.monthlySpend === '' ? null : Number(customer.monthlySpend)
  }));

  const uniqueCustomers = [];
  const seenEmails = new Set();
  parsed.forEach((customer) => {
    if (seenEmails.has(customer.email)) return;
    seenEmails.add(customer.email);
    uniqueCustomers.push(customer);
  });
  const duplicatesRemoved = parsed.length - uniqueCustomers.length;

  const presentAges = uniqueCustomers.map((customer) => customer.age).filter(Number.isFinite);
  const presentSpend = uniqueCustomers.map((customer) => customer.monthlySpend).filter(Number.isFinite);
  const ageMedian = median(presentAges);
  const spendMedian = median(presentSpend);
  const missingCount = uniqueCustomers.reduce((count, customer) => (
    count + Number(customer.age === null) + Number(customer.monthlySpend === null)
  ), 0);

  let prepared = uniqueCustomers
    .filter((customer) => missingStrategy !== 'drop' || (customer.age !== null && customer.monthlySpend !== null))
    .map((customer) => ({
      ...customer,
      age: customer.age ?? ageMedian,
      monthlySpend: customer.monthlySpend ?? spendMedian
    }));

  const sortedSpend = prepared.map((customer) => customer.monthlySpend).sort((left, right) => left - right);
  const q1 = percentile(sortedSpend, 0.25);
  const q3 = percentile(sortedSpend, 0.75);
  const upperFence = q3 + 1.5 * (q3 - q1);
  const lowerFence = q1 - 1.5 * (q3 - q1);
  let outliersFound = 0;

  prepared = prepared.map((customer) => {
    const isOutlier = customer.monthlySpend < lowerFence || customer.monthlySpend > upperFence;
    if (isOutlier) outliersFound += 1;
    return {
      ...customer,
      outlier: isOutlier,
      monthlySpend: isOutlier && outlierStrategy === 'cap'
        ? Math.min(upperFence, Math.max(lowerFence, customer.monthlySpend))
        : customer.monthlySpend
    };
  });

  const minSpend = Math.min(...prepared.map((customer) => customer.monthlySpend));
  const maxSpend = Math.max(...prepared.map((customer) => customer.monthlySpend));
  const meanSpend = prepared.reduce((sum, customer) => sum + customer.monthlySpend, 0) / prepared.length;
  const standardDeviation = Math.sqrt(
    prepared.reduce((sum, customer) => sum + (customer.monthlySpend - meanSpend) ** 2, 0) / prepared.length
  );

  const enriched = prepared.map((customer) => {
    const cityData = cityCatalog[customer.city] ?? { region: 'Bilinmiyor', latitude: null, longitude: null, demoIndex: null };
    const scaledSpend = scalingStrategy === 'minmax'
      ? (maxSpend === minSpend ? 0 : (customer.monthlySpend - minSpend) / (maxSpend - minSpend))
      : (standardDeviation === 0 ? 0 : (customer.monthlySpend - meanSpend) / standardDeviation);

    return {
      ...customer,
      ageBand: customer.age < 30 ? '18–29' : customer.age < 45 ? '30–44' : '45+',
      spendScore: scaledSpend,
      ...cityData
    };
  });

  return {
    rows: enriched,
    duplicatesRemoved,
    missingCount,
    outliersFound,
    upperFence,
    validRows: enriched.length
  };
}

export function DataCleansingEnrichmentLab() {
  const [missingStrategy, setMissingStrategy] = useState('median');
  const [outlierStrategy, setOutlierStrategy] = useState('cap');
  const [scalingStrategy, setScalingStrategy] = useState('minmax');
  const [result, setResult] = useState(null);

  const runPipeline = () => {
    setResult(processCustomers({ missingStrategy, outlierStrategy, scalingStrategy }));
  };

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Hafta 6: Veri Temizleme ve Dönüştürme</h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
          Kirli ham müşteri verisini temizleyin, ölçekleyin, özellik türetin ve yerel demo kaynağıyla zenginleştirin.
        </p>
      </div>

      <div style={controlsGridStyle}>
        <StrategyControl label="Eksik veri" value={missingStrategy} onChange={setMissingStrategy} options={[
          { value: 'median', label: 'Medyanla doldur' },
          { value: 'drop', label: 'Eksik satırı çıkar' }
        ]} />
        <StrategyControl label="Aykırı değer · IQR" value={outlierStrategy} onChange={setOutlierStrategy} options={[
          { value: 'cap', label: 'Winsorize / sınırla' },
          { value: 'flag', label: 'Yalnızca işaretle' }
        ]} />
        <StrategyControl label="Ölçekleme" value={scalingStrategy} onChange={setScalingStrategy} options={[
          { value: 'minmax', label: 'Min–Max · 0–1' },
          { value: 'zscore', label: 'Z-Score' }
        ]} />
      </div>

      <div style={buttonRowStyle}>
        <button type="button" onClick={runPipeline} style={primaryButtonStyle}>Dönüşüm hattını çalıştır</button>
        <span role="status" style={{ color: '#64748b', fontSize: '11px' }}>
          {result ? 'Dönüşüm tamamlandı · kaynaklar yerel demo verisidir.' : 'Hazır: 6 sentetik müşteri kaydı'}
        </span>
      </div>

      <div style={pipelineStyle} aria-label="Dönüşüm adımları">
        {['1. Ayrıştır & standartlaştır', '2. Tekilleştir & imputasyon', '3. IQR & feature engineering', '4. Yerel kaynakla zenginleştir'].map((step, index) => (
          <div key={step} style={pipelineStepStyle(index, Boolean(result))}>{step}</div>
        ))}
      </div>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={panelTitleStyle}>Ham veri · CSV benzeri kayıtlar</h3>
          <span style={badgeStyle}>6 satır · sentetik</span>
        </div>
        <div style={tableScrollStyle}>
          <table style={tableStyle}>
            <thead><tr>{['ID', 'Ad', 'E-posta', 'Şehir', 'Yaş', 'Aylık harcama'].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
            <tbody>
              {rawCustomers.map((customer, index) => (
                <tr key={`${customer.id}-${index}`}>
                  <td style={tdStyle}>{customer.id}</td>
                  <td style={tdStyle}>{customer.name}</td>
                  <td style={tdStyle}>{customer.email}</td>
                  <td style={tdStyle}>{customer.city}</td>
                  <td style={tdStyle}>{customer.age ?? 'NULL'}</td>
                  <td style={tdStyle}>{customer.monthlySpend ?? 'NULL'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result && (
        <>
          <div style={metricsStyle}>
            <Metric label="Tekilleştirilen" value={result.duplicatesRemoved} />
            <Metric label={missingStrategy === 'median' ? 'Impute edilen alan' : 'Eksik satır'} value={missingStrategy === 'median' ? result.missingCount : rawCustomers.length - result.validRows - result.duplicatesRemoved} />
            <Metric label="IQR aykırısı" value={result.outliersFound} />
            <Metric label="Çıktı satırı" value={result.validRows} />
          </div>

          <section style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={panelTitleStyle}>İşlenmiş veri + feature engineering + enrichment</h3>
              <span style={badgeStyle}>Demo enrichment · dış istek yok</span>
            </div>
            <div style={tableScrollStyle}>
              <table style={tableStyle}>
                <thead><tr>{['Ad', 'E-posta', 'Şehir', 'Yaş grubu', 'Harcama', scalingStrategy === 'minmax' ? 'Min–Max' : 'Z-Score', 'Bölge', 'Koordinat', 'Demo endeksi'].map((label) => <th key={label} style={thStyle}>{label}</th>)}</tr></thead>
                <tbody>
                  {result.rows.map((customer) => (
                    <tr key={customer.id}>
                      <td style={tdStyle}>{customer.name}</td>
                      <td style={tdStyle}>{customer.email}</td>
                      <td style={tdStyle}>{customer.city}</td>
                      <td style={tdStyle}>{customer.ageBand}</td>
                      <td style={tdStyle}>
                        {Math.round(customer.monthlySpend).toLocaleString('tr-TR')}
                        {outlierStrategy === 'flag' && customer.outlier && <span style={outlierBadgeStyle}>IQR</span>}
                      </td>
                      <td style={tdStyle}>{customer.spendScore.toFixed(2)}</td>
                      <td style={tdStyle}>{customer.region}</td>
                      <td style={tdStyle}>{customer.latitude === null ? '—' : `${customer.latitude}, ${customer.longitude}`}</td>
                      <td style={tdStyle}>{customer.demoIndex ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p style={noteStyle}>
            Harcama skoru seçilen tekniğe göre değişir. Şehir koordinatı, bölge ve endeks gerçek API’den değil, öğretim amaçlı yerel katalogdan gelir.
          </p>
        </>
      )}
    </div>
  );
}

function StrategyControl({ label, value, onChange, options }) {
  return (
    <label style={controlStyle}>
      <span style={{ color: '#475569', fontSize: '10px', fontWeight: 600 }}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={selectStyle}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div style={metricStyle}>
      <span style={{ color: '#64748b', fontSize: '10px' }}>{label}</span>
      <strong style={{ display: 'block', marginTop: '3px', color: '#0f172a', fontSize: '18px' }}>{value}</strong>
    </div>
  );
}

const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '14px' };
const controlsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', marginBottom: '10px' };
const controlStyle = { display: 'grid', gap: '5px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '5px', backgroundColor: '#f8fafc' };
const selectStyle = { width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#334155', fontSize: '11px' };
const buttonRowStyle = { display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginBottom: '10px' };
const primaryButtonStyle = { padding: '7px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#0369a1', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' };
const pipelineStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px', marginBottom: '10px' };
const pipelineStepStyle = (index, complete) => ({ padding: '7px', border: `1px solid ${complete ? '#86efac' : '#e2e8f0'}`, borderRadius: '4px', backgroundColor: complete ? '#f0fdf4' : '#f8fafc', color: complete ? '#166534' : '#64748b', fontSize: '10px', textAlign: 'center' });
const panelStyle = { minWidth: 0, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', marginBottom: '10px' };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' };
const panelTitleStyle = { margin: 0, color: '#111827', fontSize: '12px' };
const badgeStyle = { padding: '3px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '9px' };
const tableScrollStyle = { overflowX: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '10px', whiteSpace: 'nowrap' };
const thStyle = { padding: '6px', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, textAlign: 'left' };
const tdStyle = { padding: '6px', borderBottom: '1px solid #f1f5f9', color: '#334155' };
const metricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '7px' };
const metricStyle = { marginBottom: '10px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '5px', backgroundColor: '#f8fafc' };
const outlierBadgeStyle = { marginLeft: '4px', padding: '2px 4px', borderRadius: '3px', backgroundColor: '#ffedd5', color: '#9a3412', fontSize: '8px' };
const noteStyle = { margin: '0 0 10px', color: '#64748b', fontSize: '10px', lineHeight: 1.5 };