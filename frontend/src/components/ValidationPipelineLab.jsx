import React, { useState } from 'react';
import { z } from 'zod';

const eventSchema = z.object({
  eventId: z.string().min(1, 'eventId boş olamaz.'),
  email: z.string().email('E-posta biçimi geçersiz.'),
  age: z.number().int('Yaş tam sayı olmalıdır.'),
  customerId: z.string().min(1, 'customerId boş olamaz.')
});

const knownCustomers = new Set(['C-100', 'C-101', 'C-102', 'C-103']);

const initialEvents = [
  { eventId: 'evt-101', email: 'ayse@example.com', age: 26, customerId: 'C-100' },
  { eventId: 'evt-102', email: 'gecersiz-email', age: 31, customerId: 'C-101' },
  { eventId: 'evt-103', email: 'mert@example.com', age: 148, customerId: 'C-102' },
  { eventId: 'evt-104', email: 'ece@example.com', age: 35, customerId: 'C-999' },
  { eventId: 'evt-101', email: 'can@example.com', age: 22, customerId: 'C-103' }
];

function validateEvents(events) {
  const seenIds = new Set();
  const results = events.map((event) => {
    const issues = [];
    const syntax = eventSchema.safeParse(event);

    if (!syntax.success) {
      syntax.error.issues.forEach((issue) => {
        issues.push({ category: 'Sözdizimsel', message: `${issue.path.join('.')}: ${issue.message}` });
      });
    } else {
      if (event.age < 13 || event.age > 120) {
        issues.push({ category: 'Anlamsal', message: 'age 13 ile 120 arasında olmalıdır.' });
      }
      if (!knownCustomers.has(event.customerId)) {
        issues.push({ category: 'Referans', message: `${event.customerId} müşteri tablosunda bulunamadı.` });
      }
    }

    if (seenIds.has(event.eventId)) {
      issues.push({ category: 'Bütünlük', message: `${event.eventId} yinelenen eventId.` });
    }
    seenIds.add(event.eventId);

    return { event, valid: issues.length === 0, issues };
  });

  return {
    results,
    accepted: results.filter((item) => item.valid),
    quarantined: results.filter((item) => !item.valid)
  };
}

export function ValidationPipelineLab() {
  const [strategy, setStrategy] = useState('inline');
  const [events, setEvents] = useState(initialEvents);
  const [pipeline, setPipeline] = useState(null);
  const [status, setStatus] = useState('Örnek event’ler doğrulanmaya hazır.');

  const runPipeline = () => {
    const nextPipeline = validateEvents(events);
    setPipeline(nextPipeline);
    setStatus(strategy === 'inline'
      ? 'Inline: event’ler geldikçe denetlendi; geçersiz kayıtlar akıştan ayrıldı.'
      : 'Batch staging: kayıtlar staging alanında birlikte denetlendi; hatalılar DLQ’ya ayrıldı.');
  };

  const fixAndReprocess = (eventId, index) => {
    const nextEvents = events.map((event, eventIndex) => {
      if (eventIndex !== index) return event;
      return {
        eventId: pipeline?.results.filter((result) => result.event.eventId === event.eventId).length > 1
          ? `${event.eventId}-retry`
          : event.eventId,
        email: event.email.includes('@') && event.email.split('@')[1]?.includes('.')
          ? event.email
          : 'ogrenci@example.com',
        age: event.age >= 13 && event.age <= 120 ? event.age : 30,
        customerId: knownCustomers.has(event.customerId) ? event.customerId : 'C-100'
      };
    });

    setEvents(nextEvents);
    setPipeline(validateEvents(nextEvents));
    setStatus(`${eventId} düzeltildi ve yeniden işlendi; diğer kayıtlar da tekrar doğrulandı.`);
  };

  const resetPipeline = () => {
    setEvents(initialEvents);
    setPipeline(null);
    setStatus('Örnek event’ler doğrulanmaya hazır.');
  };

  const completeness = pipeline
    ? Math.round((pipeline.results.filter((result) => result.event.email && result.event.customerId != null).length / pipeline.results.length) * 100)
    : 100;
  const uniqueness = pipeline
    ? Math.round(((pipeline.results.length - pipeline.quarantined.filter((result) => result.issues.some((issue) => issue.category === 'Bütünlük')).length) / pipeline.results.length) * 100)
    : 100;
  const validRate = pipeline ? Math.round((pipeline.accepted.length / pipeline.results.length) * 100) : 0;

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Hafta 5: Veri Geçerleme Mimarileri ve Hata Yönetimi</h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
          Ham event’leri doğrulayın, geçerli kayıtları akışa alın ve sorunluları karantinadan düzeltip yeniden işleyin.
        </p>
      </div>

      <div style={strategyBarStyle} role="group" aria-label="Doğrulama mimarisi">
        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>Mimari</span>
        <button type="button" aria-pressed={strategy === 'inline'} onClick={() => setStrategy('inline')} style={strategyButtonStyle(strategy === 'inline')}>
          Inline validation
        </button>
        <button type="button" aria-pressed={strategy === 'batch'} onClick={() => setStrategy('batch')} style={strategyButtonStyle(strategy === 'batch')}>
          Batch staging
        </button>
        <span style={{ flexBasis: '100%', fontSize: '11px', color: '#64748b' }}>
          {strategy === 'inline'
            ? 'Düşük gecikme; API ve event akışlarında veriyi kaynağa yakın reddet.'
            : 'Bütüncül analiz; staging alanında toplu kuralları çalıştır ve DLQ’ya yönlendir.'}
        </span>
      </div>

      <div style={actionBarStyle}>
        <button type="button" onClick={runPipeline} style={primaryButtonStyle}>Pipeline’ı çalıştır</button>
        <button type="button" onClick={resetPipeline} style={secondaryButtonStyle}>Örnek veriyi sıfırla</button>
        <span role="status" style={{ flex: '1 1 220px', color: '#475569', fontSize: '12px' }}>{status}</span>
      </div>

      <div style={metricsGridStyle}>
        <Metric label="Completeness" value={`${completeness}%`} detail="Zorunlu alan doluluğu" />
        <Metric label="Uniqueness" value={`${uniqueness}%`} detail="eventId tekilliği" />
        <Metric label="Valid rate" value={`${validRate}%`} detail={pipeline ? `${pipeline.accepted.length}/${pipeline.results.length} kayıt geçti` : 'Henüz çalıştırılmadı'} />
      </div>

      <div style={pipelineGridStyle}>
        <section style={panelStyle}>
          <div style={sectionHeadingStyle}>
            <h3 style={panelTitleStyle}>Gelen veri → doğrulama</h3>
            <span style={countBadgeStyle}>{events.length} event</span>
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {events.map((event, index) => {
              const result = pipeline?.results[index];
              return (
                <div key={`${event.eventId}-${index}`} style={eventCardStyle(result?.valid)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>{event.eventId}</strong>
                    {result && <span style={resultBadgeStyle(result.valid)}>{result.valid ? 'VALID' : 'QUARANTINE'}</span>}
                  </div>
                  <div style={eventDataStyle}>{event.email} · age {String(event.age)} · {event.customerId}</div>
                  {result?.issues.map((issue, issueIndex) => (
                    <div key={`${issue.category}-${issueIndex}`} style={issueStyle}>
                      <strong>{issue.category}:</strong> {issue.message}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <section style={panelStyle}>
          <div style={sectionHeadingStyle}>
            <h3 style={panelTitleStyle}>Routing & karantina</h3>
            <span style={countBadgeStyle}>{pipeline?.quarantined.length ?? 0} DLQ</span>
          </div>
          {!pipeline && <p style={emptyStyle}>Pipeline’ı çalıştırınca geçerli veri ve DLQ sonuçları burada görünür.</p>}
          {pipeline?.accepted.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={listHeadingStyle}>Geçerli veri deposu</div>
              {pipeline.accepted.map(({ event }, index) => (
                <div key={`${event.eventId}-${index}`} style={acceptedRowStyle}>
                  {event.eventId} <span style={{ color: '#64748b' }}>→ {event.customerId}</span>
                </div>
              ))}
            </div>
          )}
          {pipeline?.quarantined.length > 0 && (
            <div>
              <div style={listHeadingStyle}>Dead Letter Queue (DLQ)</div>
              {pipeline.quarantined.map(({ event }, index) => (
                <div key={`${event.eventId}-${index}`} style={quarantineRowStyle}>
                  <span style={{ fontSize: '12px', color: '#7f1d1d' }}>{event.eventId}</span>
                  <button type="button" onClick={() => fixAndReprocess(event.eventId, events.indexOf(event))} style={retryButtonStyle}>
                    Düzelt & yeniden işle
                  </button>
                </div>
              ))}
            </div>
          )}
          {pipeline?.quarantined.length === 0 && pipeline && <div style={acceptedRowStyle}>Karantinada kayıt yok.</div>}
        </section>
      </div>

      <section style={{ ...panelStyle, marginTop: '12px' }}>
        <h3 style={panelTitleStyle}>Kural katmanları</h3>
        <div style={ruleGridStyle}>
          <Rule title="Sözdizimsel" detail="Zod şeması: tip, zorunluluk ve e-posta biçimi." />
          <Rule title="Anlamsal" detail="İş kuralı: yaş 13–120 aralığında olmalı." />
          <Rule title="Referans & bütünlük" detail="customerId referans tablosunda bulunmalı; eventId tekil olmalı." />
        </div>
      </section>

      <p style={noteStyle}>
        Demo verileri yereldir ve gerçek bir veri ambarına gönderilmez. Üretim sisteminde şema doğrulaması, yetki ve veri yönlendirme kontrolleri sunucu tarafında uygulanmalıdır.
      </p>
    </div>
  );
}

function Metric({ label, value, detail }) {
  return (
    <div style={metricStyle}>
      <div style={{ color: '#64748b', fontSize: '11px' }}>{label}</div>
      <strong style={{ display: 'block', color: '#0f172a', fontSize: '20px', margin: '3px 0' }}>{value}</strong>
      <div style={{ color: '#64748b', fontSize: '10px' }}>{detail}</div>
    </div>
  );
}

function Rule({ title, detail }) {
  return (
    <div style={ruleStyle}>
      <strong style={{ display: 'block', color: '#0f172a', fontSize: '12px', marginBottom: '3px' }}>{title}</strong>
      <span style={{ color: '#64748b', fontSize: '11px', lineHeight: 1.4 }}>{detail}</span>
    </div>
  );
}

const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '14px' };
const strategyBarStyle = { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '10px' };
const strategyButtonStyle = (active) => ({ padding: '6px 9px', border: `1px solid ${active ? '#0284c7' : '#cbd5e1'}`, borderRadius: '4px', backgroundColor: active ? '#e0f2fe' : '#fff', color: active ? '#075985' : '#334155', fontSize: '11px', fontWeight: active ? 600 : 400, cursor: 'pointer' });
const actionBarStyle = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' };
const primaryButtonStyle = { padding: '7px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#0369a1', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' };
const secondaryButtonStyle = { ...primaryButtonStyle, border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#334155' };
const metricsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '8px', marginBottom: '10px' };
const metricStyle = { padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' };
const pipelineGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'start', gap: '10px' };
const panelStyle = { minWidth: 0, padding: '11px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' };
const panelTitleStyle = { margin: 0, color: '#111827', fontSize: '13px' };
const sectionHeadingStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '9px' };
const countBadgeStyle = { padding: '3px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px' };
const eventCardStyle = (valid) => ({ padding: '8px', border: `1px solid ${valid === undefined ? '#e2e8f0' : valid ? '#86efac' : '#fca5a5'}`, borderRadius: '4px', backgroundColor: valid === undefined ? '#fff' : valid ? '#f0fdf4' : '#fff7f7' });
const resultBadgeStyle = (valid) => ({ padding: '2px 5px', borderRadius: '3px', backgroundColor: valid ? '#dcfce7' : '#fee2e2', color: valid ? '#166534' : '#991b1b', fontSize: '9px', fontWeight: 700 });
const eventDataStyle = { marginTop: '4px', color: '#475569', fontFamily: 'monospace', fontSize: '10px', overflowWrap: 'anywhere' };
const issueStyle = { marginTop: '4px', color: '#991b1b', fontSize: '10px', lineHeight: 1.4 };
const emptyStyle = { margin: 0, color: '#64748b', fontSize: '11px', lineHeight: 1.5 };
const listHeadingStyle = { marginBottom: '6px', color: '#334155', fontSize: '11px', fontWeight: 700 };
const acceptedRowStyle = { marginBottom: '5px', padding: '7px', borderRadius: '4px', backgroundColor: '#f0fdf4', color: '#166534', fontFamily: 'monospace', fontSize: '10px', overflowWrap: 'anywhere' };
const quarantineRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px', padding: '7px', border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: '#fff7f7' };
const retryButtonStyle = { padding: '4px 6px', border: '1px solid #fca5a5', borderRadius: '4px', backgroundColor: '#fff', color: '#991b1b', fontSize: '10px', cursor: 'pointer' };
const ruleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '8px' };
const ruleStyle = { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#f8fafc' };
const noteStyle = { margin: '9px 0 0', color: '#64748b', fontSize: '10px', lineHeight: 1.5 };