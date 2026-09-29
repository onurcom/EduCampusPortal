import React, { useState, useRef } from 'react';
import { z } from 'zod';

// ZOD ŞEMASI: Şifre eşleşmesi (custom refine) ve tip Kuralları
const registrationSchema = z.object({
  username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
  email: z.string().email('Geçersiz e-posta adresi formatı'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler birbiriyle eşleşmiyor!',
  path: ['confirmPassword'], // Hatanın ekleneceği alan
});

export function ZodFormValidationLab({ isSafeMode }) {
  // Unsafe Mode State'leri (Manuel spagetti yönetim)
  const [unsafeFormData, setUnsafeFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [unsafeErrors, setUnsafeErrors] = useState({});

  // Safe Mode State'leri (Zod Schema yönetim)
  const [safeFormData, setSafeFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [safeErrors, setSafeErrors] = useState({});
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [serverSuccess, setServerSuccess] = useState(null);

  // Performans İzleme (Re-render Sayacı)
  const renderCounter = useRef(0);
  renderCounter.current += 1;

  // --- UNSAFE FORM İŞLEYİCİSİ (Spagetti if/else doğrulaması) ---
  const handleUnsafeChange = (e) => {
    const { name, value } = e.target;
    setUnsafeFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnsafeSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!unsafeFormData.username) errors.username = 'Kullanıcı adı boş olamaz';
    if (!unsafeFormData.email.includes('@')) errors.email = 'E-posta hatalı';
    if (unsafeFormData.password !== unsafeFormData.confirmPassword) {
      errors.confirmPassword = 'Şifreler tutmuyor';
    }
    setUnsafeErrors(errors);
  };

  // --- SAFE FORM İŞLEYİCİSİ (Zod Schema Validation) ---
  const handleSafeChange = async (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...safeFormData, [name]: value };
    setSafeFormData(updatedForm);

    // Zod Şeması ile anlık doğrulama
    const result = registrationSchema.safeParse(updatedForm);
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setSafeErrors(fieldErrors);
    } else {
      setSafeErrors({});
    }
  };

  // Asenkron Kullanıcı Adı Müsaitlik Kontrolü (Async Refine Simülasyonu)
  const handleSafeSubmit = async (e) => {
    e.preventDefault();
    setServerSuccess(null);

    // 1. Zod Senkron Şema Doğrulaması
    const result = registrationSchema.safeParse(safeFormData);
    if (!result.success) {
      return;
    }

    // 2. Asenkron Doğrulama (Veritabanında var mı?)
    setIsCheckingUsername(true);
    setTimeout(() => {
      setIsCheckingUsername(false);
      if (safeFormData.username.toLowerCase() === 'admin') {
        setSafeErrors({ username: '❌ "admin" kullanıcı adı zaten alınmış! (Asenkron Zod Kontrolü)' });
      } else {
        setServerSuccess('🎉 Form Zod şemasından ve Asenkron kontrolden başarıyla geçti!');
      }
    }, 1000);
  };

  return (
    <div>
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          Hafta 3: İstemci Formları, Zod Refinements & Async Validasyon
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Çalışma Modu: <strong>{isSafeMode ? 'GÜVENLİ (Zod Schema & Refine & Async Check)' : 'GÜVENSİZ (Manuel Spagetti if/else Validasyonu)'}</strong>
        </div>
      </div>

      {/* Re-render ve Performans Göstergesi */}
      <div style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', fontSize: '12px', color: '#374151' }}>
        ⚡ Re-render Sayacı: <strong>{renderCounter.current}</strong> (Her klavye vuruşunda bileşenin kaç kez yeniden çizildiğini gösterir)
      </div>

      {!isSafeMode ? (
        /* GÜVENSİZ / MANUEL SPAGETTİ FORM */
        <div style={{ border: '1px solid #fca5a5', padding: '16px', borderRadius: '6px', backgroundColor: '#fff5f5' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '14px' }}>⚠️ Unsafe Mode: Manuel State & Manuel if/else Kontrolleri</h4>
          <form onSubmit={handleUnsafeSubmit}>
            <div style={fieldWrapper}>
              <label style={labelStyle}>Kullanıcı Adı:</label>
              <input type="text" name="username" value={unsafeFormData.username} onChange={handleUnsafeChange} style={inputStyle} />
              {unsafeErrors.username && <span style={errorText}>{unsafeErrors.username}</span>}
            </div>
            <div style={fieldWrapper}>
              <label style={labelStyle}>E-Posta:</label>
              <input type="text" name="email" value={unsafeFormData.email} onChange={handleUnsafeChange} style={inputStyle} />
              {unsafeErrors.email && <span style={errorText}>{unsafeErrors.email}</span>}
            </div>
            <div style={fieldWrapper}>
              <label style={labelStyle}>Şifre:</label>
              <input type="password" name="password" value={unsafeFormData.password} onChange={handleUnsafeChange} style={inputStyle} />
            </div>
            <div style={fieldWrapper}>
              <label style={labelStyle}>Şifre Tekrarı:</label>
              <input type="password" name="confirmPassword" value={unsafeFormData.confirmPassword} onChange={handleUnsafeChange} style={inputStyle} />
              {unsafeErrors.confirmPassword && <span style={errorText}>{unsafeErrors.confirmPassword}</span>}
            </div>
            <button type="submit" style={btnStyle('#991b1b')}>Klasik Yöntemle Kaydol</button>
          </form>
        </div>
      ) : (
        /* GÜVENLİ / ZOD SCHEMA & REFINE FORM */
        <div style={{ border: '1px solid #86efac', padding: '16px', borderRadius: '6px', backgroundColor: '#f0fdf4' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '14px' }}>🛡️ Safe Mode: Zod Declarative Schema & Refinement Engine</h4>
          <form onSubmit={handleSafeSubmit}>
            <div style={fieldWrapper}>
              <label style={labelStyle}>Kullanıcı Adı (İpucu: "admin" yazıp test edin):</label>
              <input type="text" name="username" value={safeFormData.username} onChange={handleSafeChange} style={inputStyle} />
              {safeErrors.username && <span style={errorText}>{safeErrors.username}</span>}
            </div>
            <div style={fieldWrapper}>
              <label style={labelStyle}>E-Posta:</label>
              <input type="text" name="email" value={safeFormData.email} onChange={handleSafeChange} style={inputStyle} />
              {safeErrors.email && <span style={errorText}>{safeErrors.email}</span>}
            </div>
            <div style={fieldWrapper}>
              <label style={labelStyle}>Şifre:</label>
              <input type="password" name="password" value={safeFormData.password} onChange={handleSafeChange} style={inputStyle} />
              {safeErrors.password && <span style={errorText}>{safeErrors.password}</span>}
            </div>
            <div style={fieldWrapper}>
              <label style={labelStyle}>Şifre Tekrarı (Zod .refine() Kontrolü):</label>
              <input type="password" name="confirmPassword" value={safeFormData.confirmPassword} onChange={handleSafeChange} style={inputStyle} />
              {safeErrors.confirmPassword && <span style={errorText}>{safeErrors.confirmPassword}</span>}
            </div>
            <button type="submit" disabled={isCheckingUsername} style={btnStyle('#166534')}>
              {isCheckingUsername ? 'Asenkron Kullanıcı Adı Denetleniyor...' : 'Zod Doğrulaması İle Kaydol'}
            </button>
          </form>

          {serverSuccess && (
            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '4px', fontSize: '12px', color: '#15803d' }}>
              {serverSuccess}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const fieldWrapper = { marginBottom: '10px' };
const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' };
const errorText = { fontSize: '11px', color: '#dc2626', marginTop: '2px', display: 'block' };
const btnStyle = (bg) => ({
  width: '100%',
  padding: '8px 12px',
  fontSize: '12px',
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginTop: '8px'
});