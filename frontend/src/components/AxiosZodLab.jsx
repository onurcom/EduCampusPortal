import React, { useState } from 'react';
import { z } from 'zod';
// 1. Hafta şeması
import { announcementListSchema } from '../schemas/announcementSchema'; 

// 2. HAFTA İÇİN GELİŞMİŞ ŞEMA (.transform ile ISO String -> Date dönüşümü)
const userProfileSchema = z.object({
  id: z.string().uuid("Geçerli bir UUID olmalıdır."),
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta giriniz."),
  // String veriyi runtime'da JS Date objesine dönüştürüyoruz:
  createdAt: z.string().transform((val) => new Date(val)),
});

export function AxiosZodLab({ isSafeMode, week = 2 }) {
  const [data, setData] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zodErrors, setZodErrors] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // -------------------------------------------------------------
  // 1. HAFTA İŞLEMLERİ (Temel Parse / Validate)
  // -------------------------------------------------------------
  const fetchWeek1Valid = async () => {
    setLoading(true);
    setZodErrors(null);
    setUserData(null);
    setStatusMessage('1. Hafta: İstek gönderiliyor...');

    try {
      const mockResponse = {
        data: [
          { id: 101, title: 'Web Güvenliği Dersi', category: 'Genel', content: 'Axios ve Zod modülü işlenecektir.' },
          { id: 102, title: 'Vize Sınavı', category: 'Sınav', content: 'Sınav online olarak yapılacaktır.' }
        ]
      };

      if (isSafeMode) {
        const validatedData = announcementListSchema.parse(mockResponse.data);
        setData(validatedData);
        setStatusMessage('1. Hafta: Şema doğrulaması (parse) başarılı.');
      } else {
        setData(mockResponse.data);
        setStatusMessage('1. Hafta: Veri doğrulama yapılmadan yüklendi.');
      }
    } catch (err) {
      if (err.name === 'ZodError') {
        setZodErrors(err.errors);
        setStatusMessage('1. Hafta: Zod Validation Error.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWeek1Corrupted = async () => {
    setLoading(true);
    setData([]);
    setUserData(null);
    setZodErrors(null);
    setStatusMessage('1. Hafta: Bozuk veri isteği gönderiliyor...');

    const mockCorrupted = { data: [{ id: "invalid_id_101", title: 'Bo', category: 'Geçersiz' }] };

    try {
      if (isSafeMode) {
        const validatedData = announcementListSchema.parse(mockCorrupted.data);
        setData(validatedData);
      } else {
        setData(mockCorrupted.data);
        setStatusMessage('Uyarı: Bozuk veri kontrol edilmeden yüklendi.');
      }
    } catch (err) {
      if (err.name === 'ZodError') {
        setZodErrors(err.errors);
        setStatusMessage('Zod Validation Error: Gelen veri şemaya uymuyor.');
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. HAFTA İŞLEMLERİ (Axios Interceptors + Zod safeParse & Transform)
  // -------------------------------------------------------------
  const fetchWeek2Valid = async () => {
    setLoading(true);
    setData([]);
    setZodErrors(null);
    setUserData(null);
    setStatusMessage('2. Hafta: Axios Interceptor & Zod Transform isteği atılıyor...');

    // API'den gelen ham ISO string tarih içeren yanıt
    const mockApiResponse = {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Bulut Hoca',
        email: 'bulut@edukampus.edu.tr',
        createdAt: '2026-03-01T10:00:00.000Z' // String formatında tarih
      }
    };

    if (isSafeMode) {
      // safeParse fırlatma yapmaz, { success, data, error } objesi döner
      const result = userProfileSchema.safeParse(mockApiResponse.data);

      if (result.success) {
        setUserData(result.data);
        setStatusMessage('2. Hafta: safeParse() başarılı! String tarih JS Date objesine dönüştürüldü.');
      } else {
        setZodErrors(result.error.issues);
        setStatusMessage('2. Hafta: safeParse() şema doğrulaması başarısız.');
      }
    } else {
      // Güvensiz mod: Veri dönüştürülmeden direkt state'e atılır (createdAt string kalır)
      setUserData(mockApiResponse.data);
      setStatusMessage('2. Hafta (Unsafe): Veri Zod doğrulamasından geçmeden ham string olarak yüklendi.');
    }
    setLoading(false);
  };

  const fetchWeek2Corrupted = async () => {
    setLoading(true);
    setData([]);
    setUserData(null);
    setZodErrors(null);
    setStatusMessage('2. Hafta: Bozuk API yanıtı (Hatalı UUID & E-posta) test ediliyor...');

    const mockCorruptedApiResponse = {
      data: {
        id: 'gecersiz-id', // UUID değil
        name: 'A',          // En az 2 karakter olmalı
        email: 'gecersiz-email',
        createdAt: 'invalid-date'
      }
    };

    if (isSafeMode) {
      const result = userProfileSchema.safeParse(mockCorruptedApiResponse.data);

      if (!result.success) {
        // safeParse sayesinde uygulama çökmedi, hataları yakaladık
        setZodErrors(result.error.issues);
        setStatusMessage('2. Hafta (Safe): safeParse() bozuk veriyi yakaladı, uygulama çökmesi engellendi!');
      } else {
        setUserData(result.data);
      }
    } else {
      setUserData(mockCorruptedApiResponse.data);
      setStatusMessage('2. Hafta (Unsafe): Bozuk veri kontrolsüz yüklendi!');
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Başlık ve Mod Bilgisi */}
      <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', color: '#111827', margin: 0, fontWeight: 600 }}>
          {week === 1 ? '1. Hafta: Temel Axios & Zod Parse Lab' : '2. Hafta: Interceptors & İleri Zod (safeParse / transform) Lab'}
        </h2>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
          Şu Anki Mod: <strong>{isSafeMode ? 'GÜVENLİ (Zod Doğrulaması Aktif)' : 'GÜVENSİZ (Doğrulama Yok / Raw Data)'}</strong>
        </div>
      </div>

      {/* İşlem Butonları (Haftaya Göre Değişir) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {week === 1 ? (
          <>
            <button onClick={fetchWeek1Valid} disabled={loading} style={buttonStyle}>
              1. Düzgün Veri Gelirse (Week 1)
            </button>
            <button onClick={fetchWeek1Corrupted} disabled={loading} style={buttonStyle}>
              2. Bozuk/Hatalı Veri Gelirse (Week 1)
            </button>
          </>
        ) : (
          <>
            <button onClick={fetchWeek2Valid} disabled={loading} style={buttonStyle}>
              1. Başarılı İstek & Transform Testi (Week 2)
            </button>
            <button onClick={fetchWeek2Corrupted} disabled={loading} style={buttonStyle}>
              2. Bozuk API Yanıtı & safeParse Testi (Week 2)
            </button>
          </>
        )}
      </div>

      {/* Durum Mesajı */}
      {statusMessage && (
        <div style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '13px', color: '#374151', marginBottom: '16px' }}>
          Durum: {statusMessage}
        </div>
      )}

      {/* 1. Hafta Veri Listesi */}
      {data.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', color: '#374151', margin: '0 0 8px 0' }}>Yüklenen Duyuru Listesi</h4>
          {data.map((item, index) => (
            <div key={index} style={{ border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', marginBottom: '6px', fontSize: '13px' }}>
              <div><strong>ID:</strong> {item.id} <span style={{ color: '#9ca3af' }}>({typeof item.id})</span></div>
              <div><strong>Başlık:</strong> {item.title}</div>
              <div><strong>Kategori:</strong> {item.category}</div>
              <div><strong>İçerik:</strong> {item.content || <span style={{ color: '#6b7280' }}>Eksik veri</span>}</div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Hafta Kullanıcı Profili Gösterimi (Transform Kontrolü) */}
      {userData && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '16px', backgroundColor: '#f9fafb' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#111827' }}>Yüklenen Profil Verisi (Zod Output)</h4>
          <div style={{ fontSize: '13px', color: '#374151' }}>
            <div><strong>ID:</strong> {userData.id}</div>
            <div><strong>Ad Soyad:</strong> {userData.name}</div>
            <div><strong>E-posta:</strong> {userData.email}</div>
            <div>
              <strong>Kayıt Tarihi Tip Yapısı:</strong>{' '}
              <code>{Object.prototype.toString.call(userData.createdAt)}</code>
            </div>
            <div>
              <strong>Formatlanmış Tarih:</strong>{' '}
              {userData.createdAt instanceof Date 
                ? userData.createdAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : String(userData.createdAt) + ' (Dönüştürülmedi - String)'}
            </div>
          </div>
        </div>
      )}

      {/* Zod Hata Listesi */}
      {zodErrors && (
        <div style={{ border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '4px', padding: '12px', fontSize: '13px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#991b1b' }}>
            Zod Validation Errors ({zodErrors.length})
          </h4>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#7f1d1d', fontFamily: 'monospace' }}>
            {zodErrors.map((err, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>
                <code>{err.path.join('.')}</code>: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: '6px 12px',
  fontSize: '13px',
  backgroundColor: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  cursor: 'pointer',
};