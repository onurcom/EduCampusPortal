import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const workshopSchema = z.object({
  name: z.string().trim().min(2, 'Adını en az 2 harfle yaz.'),
  email: z.string().trim().email('E-posta biçimini kontrol et.'),
  seats: z.number()
    .int('Kişi sayısı tam sayı olmalı.')
    .min(1, 'En az 1 kişilik yer ayırt.')
    .max(3, 'Bu atölyede en fazla 3 kişilik yer ayırtabilirsin.'),
});

const initialValues = { name: '', email: '', seats: 1 };

export function ReactHookFormZodLab({ isSafeMode }) {
  return (
    <section style={{ maxWidth: 760, margin: '0 auto', color: '#111827', fontFamily: 'inherit' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 19 }}>Hafta 4: React Hook Form + Zod</h2>
        <p style={{ margin: '7px 0 0', color: '#4b5563', fontSize: 14, lineHeight: 1.55 }}>
          Örnek: kampüs atölyesine yer ayırt. Form verisini bir “kapı görevlisi” gibi kontrol et:
          ad, e-posta ve kişi sayısı kurallara uyuyorsa başvuruyu kabul et.
        </p>
      </header>

      <div style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 6,
        background: isSafeMode ? '#f0fdf4' : '#fff7ed',
        color: isSafeMode ? '#166534' : '#9a3412',
        fontSize: 13,
      }}>
        <strong>{isSafeMode ? 'Güvenli örnek: React Hook Form + Zod' : 'Karşılaştırma: elle yazılmış kontroller'}</strong>
        <span> — Formu göndererek doğrulamayı dene.</span>
      </div>

      {isSafeMode ? <ValidatedWorkshopForm /> : <ManualWorkshopForm />}

      <section style={{ ...panelStyle, marginTop: 14 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Kodda ne oluyor?</h3>
        <ol style={{ margin: '0 0 10px', paddingLeft: 20, color: '#374151', fontSize: 13, lineHeight: 1.65 }}>
          <li><code>register</code>, input alanlarını React Hook Form’a bağlar.</li>
          <li>Zod şeması hangi değerlerin geçerli olduğunu tarif eder.</li>
          <li><code>zodResolver</code>, şemayı forma bağlar; hataları alanların altında gösterir.</li>
          <li><code>handleSubmit</code>, yalnızca doğrulama başarılıysa başvuruyu kabul eder.</li>
        </ol>
        <pre style={codeStyle}><code>{`const schema = z.object({
  name: z.string().trim().min(2, 'Ad en az 2 harf olmalı'),
  email: z.string().email('E-posta geçerli olmalı'),
  seats: z.number().int().min(1).max(3),
});

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '', seats: 1 },
});

<form onSubmit={form.handleSubmit(onValidSubmit)}>
  <input {...form.register('name')} />
</form>`}</code></pre>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
          Tarayıcıdaki doğrulama kullanıcıya yardımcı olur; sunucu da gelen veriyi ayrıca doğrulamalıdır.
        </p>
      </section>
    </section>
  );
}

function ValidatedWorkshopForm() {
  const [confirmed, setConfirmed] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(workshopSchema),
    defaultValues: initialValues,
  });

  const onValidSubmit = (values) => {
    setConfirmed(values);
  };

  const onReset = () => {
    reset(initialValues);
    setConfirmed(null);
  };

  return (
    <form onSubmit={handleSubmit(onValidSubmit)} noValidate style={panelStyle}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Kampüs atölyesi için yer ayırt</h3>
      <FormField label="Ad soyad" error={errors.name?.message}>
        <input {...register('name')} autoComplete="name" placeholder="Örnek: Deniz Yılmaz" style={inputStyle} />
      </FormField>
      <FormField label="E-posta" error={errors.email?.message}>
        <input {...register('email')} type="email" autoComplete="email" placeholder="deniz@okul.edu" style={inputStyle} />
      </FormField>
      <FormField label="Kaç kişilik yer? (1–3)" error={errors.seats?.message}>
        <input
          {...register('seats', { valueAsNumber: true })}
          type="number"
          min="1"
          max="3"
          step="1"
          style={inputStyle}
        />
      </FormField>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="submit" disabled={isSubmitting} style={buttonStyle('#166534')}>Başvuruyu doğrula</button>
        <button type="button" onClick={onReset} style={buttonStyle('#4b5563')}>Temizle</button>
      </div>
      {confirmed && (
        <div role="status" style={{ marginTop: 12, padding: 10, borderRadius: 5, background: '#dcfce7', color: '#166534', fontSize: 13 }}>
          <strong>Başvuru kabul edildi!</strong>
          <div>{confirmed.name} için {confirmed.seats} kişilik yer ayrıldı. Onay e-postası: {confirmed.email}</div>
        </div>
      )}
    </form>
  );
}

function ManualWorkshopForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({
      ...previous,
      [name]: name === 'seats' ? Number(value) : value,
    }));
    setConfirmed(null);
  };

  const submitManually = (event) => {
    event.preventDefault();
    const parsed = workshopSchema.safeParse(values);

    if (!parsed.success) {
      const nextErrors = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[issue.path[0]] = issue.message;
      });
      setErrors(nextErrors);
      setConfirmed(null);
      return;
    }

    setErrors({});
    setConfirmed(parsed.data);
  };

  return (
    <form onSubmit={submitManually} noValidate style={panelStyle}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Kampüs atölyesi için yer ayırt</h3>
      <FormField label="Ad soyad" error={errors.name}>
        <input name="name" value={values.name} onChange={updateField} placeholder="Örnek: Deniz Yılmaz" style={inputStyle} />
      </FormField>
      <FormField label="E-posta" error={errors.email}>
        <input name="email" type="email" value={values.email} onChange={updateField} placeholder="deniz@okul.edu" style={inputStyle} />
      </FormField>
      <FormField label="Kaç kişilik yer? (1–3)" error={errors.seats}>
        <input name="seats" type="number" min="1" max="3" step="1" value={values.seats} onChange={updateField} style={inputStyle} />
      </FormField>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="submit" style={buttonStyle('#9a3412')}>Elle doğrula ve gönder</button>
        <button type="button" onClick={() => { setValues(initialValues); setErrors({}); setConfirmed(null); }} style={buttonStyle('#4b5563')}>Temizle</button>
      </div>
      {confirmed && (
        <div role="status" style={{ marginTop: 12, padding: 10, borderRadius: 5, background: '#dcfce7', color: '#166534', fontSize: 13 }}>
          Başvuru kabul edildi: {confirmed.name} · {confirmed.seats} kişilik yer · {confirmed.email}
        </div>
      )}
    </form>
  );
}

function FormField({ label, error, children }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <label style={{ display: 'block', marginBottom: 5, color: '#374151', fontSize: 13, fontWeight: 600 }}>
        {label}
        {children}
      </label>
      {error && <span role="alert" style={{ display: 'block', marginTop: 4, color: '#b91c1c', fontSize: 12 }}>{error}</span>}
    </div>
  );
}

const panelStyle = {
  padding: 14,
  border: '1px solid #e5e7eb',
  borderRadius: 7,
  background: '#fff',
};

const inputStyle = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  marginTop: 5,
  padding: 9,
  border: '1px solid #9ca3af',
  borderRadius: 5,
  fontSize: 14,
};

const codeStyle = {
  margin: 0,
  padding: 12,
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
});
