import React, { useState } from 'react';
import { z } from 'zod';

const identitySchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin.').transform((email) => email.toLowerCase()),
  role: z.enum(['STUDENT', 'INSTRUCTOR'])
}).strict();

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Ad en az 2 karakter olmalı.').max(80),
  department: z.enum(['Bilgisayar', 'Matematik', 'Tasarım'])
}).strict();

const credentialsSchema = z.object({
  password: z.string().min(8, 'Parola en az 8 karakter olmalı.'),
  confirmPassword: z.string()
}).strict();

const createUserInputSchema = identitySchema
  .merge(profileSchema)
  .merge(credentialsSchema)
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Parolalar birbiriyle eşleşmiyor.'
      });
    }
  })
  .transform(({ confirmPassword, ...user }) => user);

const userResponseSchema = identitySchema.merge(profileSchema).extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime()
}).strict();

const inferTypesExample = `// Ortak, küçük şemalar: schemas/user.schema.ts
export const IdentitySchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  role: z.enum(['STUDENT', 'INSTRUCTOR'])
});

export const ProfileSchema = z.object({
  fullName: z.string().trim().min(2),
  department: z.enum(['Bilgisayar', 'Matematik', 'Tasarım'])
});

export const CreateUserInputSchema = IdentitySchema
  .merge(ProfileSchema)
  .extend({
    password: z.string().min(8),
    confirmPassword: z.string()
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Parolalar eşleşmiyor.'
      });
    }
  })
  .transform(({ confirmPassword, ...user }) => user);

// Input: API/formdan gelen ham şekil
export type CreateUserInput =
  z.input<typeof CreateUserInputSchema>;

// Output: doğrulanıp dönüştürülen güvenilir şekil
export type CreateUser =
  z.output<typeof CreateUserInputSchema>;`;

const interceptorExample = `// Axios yanıtını uygulama state'ine girmeden doğrula
api.interceptors.response.use((response) => {
  if (response.config.url === '/users') {
    const parsed = UserResponseSchema.safeParse(response.data);

    if (!parsed.success) {
      return Promise.reject(
        new ApiValidationError(parsed.error.issues)
      );
    }

    response.data = parsed.data;
  }

  return response;
});`;

const formPerformanceExample = `// Büyük form: bütün alanları her tuşta yeniden doğrulamayın.
const form = useForm({
  resolver: zodResolver(CreateUserInputSchema),
  mode: 'onBlur',
  reValidateMode: 'onChange'
});

// Bölümlere ayırın; alan bazında hata ve doğrulama gösterin.
const emailError = form.formState.errors.email?.message;`;

const initialValues = {
  email: 'ADA@EXAMPLE.EDU',
  role: 'STUDENT',
  fullName: ' Ada Yılmaz ',
  department: 'Bilgisayar',
  password: 'ogrenci123',
  confirmPassword: 'ogrenci123'
};

export function SchemaArchitectureLab() {
  const [values, setValues] = useState(initialValues);
  const [serverScenario, setServerScenario] = useState('valid');
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

  const setField = (name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setResult(null);
  };

  const addLog = (message, type = 'info') => {
    setLogs((previous) => [
      { id: `${Date.now()}-${Math.random()}`, message, type },
      ...previous
    ]);
  };

  const submitRegistration = (event) => {
    event.preventDefault();
    setResult(null);

    const inputResult = createUserInputSchema.safeParse(values);
    if (!inputResult.success) {
      const fieldErrors = inputResult.error.issues.map((issue) => ({
        field: issue.path[0] || 'form',
        message: issue.message
      }));
      setResult({ kind: 'input-error', fieldErrors });
      addLog(`Form gönderilmedi: ${fieldErrors.length} doğrulama hatası var.`, 'danger');
      return;
    }

    setRequestCount((count) => count + 1);
    const parsedInput = inputResult.data;
    addLog(`POST /api/users · input doğrulandı; e-posta normalize edildi (${parsedInput.email}).`, 'info');
    const { email, role, fullName, department } = parsedInput;

    const rawResponse = serverScenario === 'invalid'
      ? {
        id: 'not-a-uuid',
        email,
        role,
        fullName,
        department,
        createdAt: 'bugün'
      }
      : {
        id: '4c5d0c40-a29f-4db7-9094-8e3d073e95dd',
        email,
        role,
        fullName,
        department,
        createdAt: new Date().toISOString()
      };

    const responseResult = userResponseSchema.safeParse(rawResponse);
    if (!responseResult.success) {
      const errors = responseResult.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'response',
        message: issue.message
      }));
      setResult({ kind: 'response-error', errors });
      addLog(`Sunucu yanıtı reddedildi: response şeması ${errors.length} hatayı yakaladı.`, 'danger');
      return;
    }

    setResult({
      kind: 'success',
      input: parsedInput,
      response: responseResult.data,
      requestCount: requestCount + 1
    });
    addLog('Yanıt interceptor doğrulamasından geçti; güvenilir veri arayüze aktarıldı.', 'success');
  };

  const loadInvalidInput = () => {
    setValues({
      ...initialValues,
      email: 'bu-bir-e-posta-degil',
      fullName: 'A',
      confirmPassword: 'farkli123'
    });
    setResult(null);
  };

  const fieldError = (field) => result?.kind === 'input-error'
    ? result.fieldErrors.find((error) => error.field === field)?.message
    : null;

  return (
    <div>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>
          Hafta 10: Büyük Projelerde Şema Yönetimi, z.infer ve Final Projesi
        </h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.55 }}>
          Modüler Zod şemalarını birleştirin; form girdisini doğrulayın ve dönüştürün;
          sunucu yanıtını arayüze almadan önce tekrar doğrulayın.
        </p>
      </div>

      <div style={conceptGridStyle}>
        <ConceptCard title="Atomik şemalar" text="Kimlik, profil ve kimlik bilgileri gibi alanları küçük, yeniden kullanılabilir dosya/modüllerde tanımlayın." />
        <ConceptCard title="Bileşim" text="merge/extend ile şemaları birleştirin; ortak kuralları kopyalamadan tek doğruluk kaynağı oluşturun." />
        <ConceptCard title="Input ≠ Output" text="z.input ham verinin, z.output doğrulanmış ve dönüştürülmüş verinin tipidir." />
        <ConceptCard title="Response guard" text="TypeScript tipi API yanıtını runtime'da doğrulamaz. Interceptor içinde safeParse kullanın." />
      </div>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={panelTitleStyle}>Uçtan uca kullanıcı kaydı</h3>
            <span style={smallTextStyle}>İstemci input → Zod → API → response schema → UI</span>
          </div>
          <label style={scenarioLabelStyle}>
            Sunucu yanıtı
            <select value={serverScenario} onChange={(event) => { setServerScenario(event.target.value); setResult(null); }} style={selectStyle}>
              <option value="valid">Geçerli</option>
              <option value="invalid">Bozuk / yanlış tipli</option>
            </select>
          </label>
        </div>

        <form onSubmit={submitRegistration} noValidate>
          <div style={formGridStyle}>
            <Field label="E-posta" error={fieldError('email')}>
              <input value={values.email} onChange={(event) => setField('email', event.target.value)} style={inputStyle} autoComplete="off" />
            </Field>
            <Field label="Rol" error={fieldError('role')}>
              <select value={values.role} onChange={(event) => setField('role', event.target.value)} style={selectStyle}>
                <option value="STUDENT">Öğrenci</option>
                <option value="INSTRUCTOR">Öğretmen</option>
              </select>
            </Field>
            <Field label="Ad Soyad" error={fieldError('fullName')}>
              <input value={values.fullName} onChange={(event) => setField('fullName', event.target.value)} style={inputStyle} autoComplete="off" />
            </Field>
            <Field label="Bölüm" error={fieldError('department')}>
              <select value={values.department} onChange={(event) => setField('department', event.target.value)} style={selectStyle}>
                <option value="Bilgisayar">Bilgisayar</option>
                <option value="Matematik">Matematik</option>
                <option value="Tasarım">Tasarım</option>
              </select>
            </Field>
            <Field label="Parola" error={fieldError('password')}>
              <input type="password" value={values.password} onChange={(event) => setField('password', event.target.value)} style={inputStyle} autoComplete="new-password" />
            </Field>
            <Field label="Parola tekrar" error={fieldError('confirmPassword')}>
              <input type="password" value={values.confirmPassword} onChange={(event) => setField('confirmPassword', event.target.value)} style={inputStyle} autoComplete="new-password" />
            </Field>
          </div>

          <div style={buttonRowStyle}>
            <button type="submit" style={buttonStyle('#0369a1')}>Formu doğrula ve demo API'ye gönder</button>
            <button type="button" onClick={loadInvalidInput} style={buttonStyle('#b45309')}>Hatalı giriş örneği yükle</button>
            <button type="button" onClick={() => { setValues(initialValues); setResult(null); }} style={buttonStyle('#475569')}>Formu sıfırla</button>
          </div>
        </form>

        {result?.kind === 'input-error' && (
          <ResultBox tone="error" title="İstek gönderilmedi · input doğrulaması başarısız">
            {result.fieldErrors.map((error, index) => <div key={`${error.field}-${index}`}>{error.field}: {error.message}</div>)}
          </ResultBox>
        )}
        {result?.kind === 'response-error' && (
          <ResultBox tone="error" title="Yanıt arayüze alınmadı · response şeması başarısız">
            {result.errors.map((error, index) => <div key={`${error.field}-${index}`}>{error.field}: {error.message}</div>)}
          </ResultBox>
        )}
        {result?.kind === 'success' && (
          <ResultBox tone="success" title="Başarılı · normalize edilmiş input ve doğrulanmış yanıt">
            <div>Gönderilen e-posta: <strong>{result.input.email}</strong></div>
            <div>Input'tan çıkarılan alan: <code>confirmPassword</code> (sunucuya gönderilmedi)</div>
            <div>Response: <strong>{result.response.fullName}</strong> · {result.response.role} · {result.response.id}</div>
          </ResultBox>
        )}
      </section>

      <section style={panelStyle}>
        <h3 style={panelTitleStyle}>Modüler şemalar + z.input / z.output</h3>
        <CodeBlock code={inferTypesExample} />
      </section>

      <section style={codeGridStyle}>
        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Axios response interceptor</h3>
          <p style={smallTextStyle}>Bozuk veya eksik API verisi uygulama state'ine girmeden doğrulama hatası üretir.</p>
          <CodeBlock code={interceptorExample} />
        </div>
        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Büyük form performansı</h3>
          <p style={smallTextStyle}>Her tuşta tüm formu çalıştırmak yerine blur ve alan bazlı doğrulamayı tercih edin.</p>
          <CodeBlock code={formPerformanceExample} />
        </div>
      </section>

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={panelTitleStyle}>Simüle edilmiş API yanıtı</h3>
          <span style={badgeStyle}>İstek sayısı: {requestCount}</span>
        </div>
        <pre style={responseStyle}>
          <code>{result?.kind === 'success'
            ? JSON.stringify(result.response, null, 2)
            : result?.kind === 'response-error'
              ? '{ "id": "not-a-uuid", "createdAt": "bugün", ... }'
              : 'Form başarıyla doğrulandıktan sonra yanıt burada görünür.'}</code>
        </pre>
        <p style={smallTextStyle}>
          Bu eğitim örneği yerel olarak çalışır; gerçek API isteği göndermez. Üretimde sunucu tarafında da
          bağımsız giriş doğrulaması ve yetkilendirme yapın.
        </p>
      </section>

      <section style={logPanelStyle}>
        <h3 style={{ margin: '0 0 7px', color: '#cbd5e1', fontSize: '11px' }}>Doğrulama akışı kayıtları</h3>
        {logs.length === 0
          ? <span style={{ color: '#64748b' }}>Formu göndererek akışı başlatın.</span>
          : logs.map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', color: log.type === 'danger' ? '#fca5a5' : log.type === 'success' ? '#86efac' : '#cbd5e1' }}>
              {log.message}
            </div>
          ))}
      </section>
    </div>
  );
}

function ConceptCard({ title, text }) {
  return (
    <div style={conceptCardStyle}>
      <strong style={{ display: 'block', color: '#111827', fontSize: '11px', marginBottom: '4px' }}>{title}</strong>
      <span style={{ color: '#475569', fontSize: '10px', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={fieldStyle}>
      {label}
      {children}
      {error && <span role="alert" style={{ color: '#b91c1c', fontSize: '9px' }}>{error}</span>}
    </label>
  );
}

function CodeBlock({ code }) {
  return <pre style={codeStyle}><code>{code}</code></pre>;
}

function ResultBox({ tone, title, children }) {
  const success = tone === 'success';
  return (
    <div role="status" style={{
      marginTop: '11px',
      padding: '9px',
      borderRadius: '4px',
      backgroundColor: success ? '#f0fdf4' : '#fef2f2',
      color: success ? '#166534' : '#991b1b',
      fontSize: '10px',
      lineHeight: 1.6
    }}>
      <strong>{title}</strong>
      <div style={{ marginTop: '4px' }}>{children}</div>
    </div>
  );
}

const headerStyle = { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '12px' };
const conceptGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '7px', marginBottom: '12px' };
const conceptCardStyle = { padding: '9px', border: '1px solid #e2e8f0', borderRadius: '5px', backgroundColor: '#f8fafc' };
const panelStyle = { border: '1px solid #e5e7eb', borderRadius: '6px', padding: '11px', marginBottom: '10px' };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '9px' };
const panelTitleStyle = { margin: 0, color: '#111827', fontSize: '12px' };
const smallTextStyle = { margin: '4px 0 7px', color: '#64748b', fontSize: '9px', lineHeight: 1.5 };
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '9px' };
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155', fontSize: '10px', fontWeight: 600 };
const fieldInputStyle = { minHeight: '31px', boxSizing: 'border-box', padding: '5px 7px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', color: '#111827', fontSize: '10px' };
const inputStyle = fieldInputStyle;
const selectStyle = fieldInputStyle;
const scenarioLabelStyle = { display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569', fontSize: '9px' };
const buttonRowStyle = { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' };
const codeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' };
const codeStyle = { margin: '7px 0 0', padding: '9px', overflowX: 'auto', borderRadius: '4px', backgroundColor: '#0f172a', color: '#e2e8f0', fontSize: '9px', lineHeight: 1.5 };
const responseStyle = { margin: 0, padding: '9px', overflowX: 'auto', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#334155', fontSize: '10px', lineHeight: 1.5 };
const badgeStyle = { padding: '3px 6px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '9px' };
const logPanelStyle = { border: '1px solid #111827', borderRadius: '6px', backgroundColor: '#0f172a', padding: '11px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '10px' };
const buttonStyle = (backgroundColor) => ({ minHeight: '30px', padding: '6px 9px', border: 'none', borderRadius: '4px', backgroundColor, color: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 600 });
