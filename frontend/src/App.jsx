import React, { useState } from 'react';

// Web Güvenliği Bileşenleri
import { SearchVulnerable } from './components/SearchVulnerable';
import { SearchSafe } from './components/SearchSafe';
import { AnnouncementForm } from './components/AnnouncementForm';
import { DomVulnerable } from './components/DomVulnerable';
import { DomSafe } from './components/DomSafe';

// Veri Doğrulama Bileşenleri
import { AxiosZodLab } from './components/AxiosZodLab';

export default function App() {
  const [selectedCourse, setSelectedCourse] = useState('web-security');
  const [isSafeMode, setIsSafeMode] = useState(true);
  
  // Web Güvenliği Ders içi Hafta ve Tab yönetimleri
  const [securityWeek, setSecurityWeek] = useState(1);
  const [securityTab, setSecurityTab] = useState('reflected');

  // Veri Doğrulama Dersi Hafta Yönetimi
  const [validationWeek, setValidationWeek] = useState(1);

  // Stored XSS için Ortak State
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Vize Sınav Takvimi', category: 'Sınav', content: 'Vize sınavları haftaya başlayacaktır.' }
  ]);

  const handleAnnouncementAdded = (data) => {
    setAnnouncements((prev) => [{ id: Date.now(), ...data }, ...prev]);
  };

  // --- AKTİF SAYFA VE COMPONENT TESPİT MANTIĞI ---
  const getActiveComponentInfo = () => {
    if (selectedCourse === 'web-security') {
      const courseName = 'Web Güvenliği';
      const weekText = `Hafta ${securityWeek}`;

      if (securityWeek === 1) {
        if (securityTab === 'reflected') {
          return {
            courseName,
            weekText: `${weekText} - Reflected XSS`,
            componentName: isSafeMode ? 'SearchSafe' : 'SearchVulnerable',
            filePath: isSafeMode ? 'src/components/SearchSafe.jsx' : 'src/components/SearchVulnerable.jsx'
          };
        }
        if (securityTab === 'stored') {
          return {
            courseName,
            weekText: `${weekText} - Stored XSS`,
            componentName: 'AnnouncementForm & StoredXSSRender',
            filePath: 'src/components/AnnouncementForm.jsx'
          };
        }
        if (securityTab === 'dom') {
          return {
            courseName,
            weekText: `${weekText} - DOM-based XSS`,
            componentName: isSafeMode ? 'DomSafe' : 'DomVulnerable',
            filePath: isSafeMode ? 'src/components/DomSafe.jsx' : 'src/components/DomVulnerable.jsx'
          };
        }
      }

     
    }

    if (selectedCourse === 'data-validation') {
      const courseName = 'Veri Doğrulama ve Geçerleme';

      if (validationWeek === 1) {
        return {
          courseName,
          weekText: 'Hafta 1 - Temel Axios & Zod Parse',
          componentName: 'AxiosZodLab (props: week=1)',
          filePath: 'src/components/AxiosZodLab.jsx'
        };
      }
     
     
    }

    return { courseName: 'Bilinmiyor', weekText: '-', componentName: '-', filePath: '-' };
  };

  const activeInfo = getActiveComponentInfo();

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#fff', minHeight: '100vh', color: '#111827' }}>
      
      {/* Top Navbar */}
      <header style={{ borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: '15px', color: '#111827' }}>
          EduCampus Lab Portal
        </div>
        
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setSelectedCourse('web-security')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              backgroundColor: selectedCourse === 'web-security' ? '#111827' : '#fff',
              color: selectedCourse === 'web-security' ? '#fff' : '#374151'
            }}
          >
            Web Güvenliği
          </button>
          
          <button 
            onClick={() => setSelectedCourse('data-validation')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              backgroundColor: selectedCourse === 'data-validation' ? '#111827' : '#fff',
              color: selectedCourse === 'data-validation' ? '#fff' : '#374151'
            }}
          >
            Veri Doğrulama ve Geçerleme
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '850px', margin: '20px auto', padding: '0 16px' }}>
        
        {/* Güvenlik Modu Switcher */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fafafa' }}>
          <span style={{ fontSize: '13px', color: '#374151' }}>
            Çalışma Modu: <strong>{isSafeMode ? '🟢 Safe Mode (Korumalı / Validated)' : '🔴 Unsafe Mode (Zafiyetli / Raw)'}</strong>
          </span>
          <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
            <input 
              type="checkbox" 
              checked={isSafeMode} 
              onChange={(e) => setIsSafeMode(e.target.checked)} 
            />
            Güvenli Modu Aktif Et
          </label>
        </div>

        {/* --- AKTİF BİLEŞEN İZLEYİCİ PANELSİ (COMPONENT INSPECTOR BAR) --- */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#0369a1'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📍</span> <span>SAYFA & BİLEŞEN İZLEYİCİ (COMPONENT INSPECTOR)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div><strong>Aktif Ders:</strong> {activeInfo.courseName}</div>
            <div><strong>Aktif Hafta / Konu:</strong> {activeInfo.weekText}</div>
            <div>
              <strong>Çağrılan Bileşen:</strong>{' '}
              <code style={{ backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', color: '#0369a1', fontWeight: 'bold' }}>
                &lt;{activeInfo.componentName} /&gt;
              </code>
            </div>
            <div><strong>Dosya Yolu:</strong> <code>{activeInfo.filePath}</code></div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1. DERS: WEB GÜVENLİĞİ */}
        {/* ========================================================= */}
        {selectedCourse === 'web-security' && (
          <div>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Web Güvenliği</h2>
              
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSecurityWeek(1)}
                  style={navButtonStyle(securityWeek === 1)}
                >
                  Hafta 1: XSS (Reflected/Stored/DOM)
                </button>
                
                
              </div>
            </div>

            {/* HAFTA 1 LABS */}
            {securityWeek === 1 && (
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {['reflected', 'stored', 'dom'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSecurityTab(tab)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: securityTab === tab ? '#f3f4f6' : '#fff',
                        color: '#111827',
                        cursor: 'pointer',
                        fontWeight: securityTab === tab ? '600' : 'normal'
                      }}
                    >
                      {tab === 'reflected' && '1. Reflected XSS'}
                      {tab === 'stored' && '2. Stored XSS'}
                      {tab === 'dom' && '3. DOM-based XSS'}
                    </button>
                  ))}
                </div>

                {securityTab === 'reflected' && (isSafeMode ? <SearchSafe /> : <SearchVulnerable />)}

                {securityTab === 'stored' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <AnnouncementForm onAnnouncementAdded={handleAnnouncementAdded} />
                    <div>
                      <h4 style={{ fontSize: '13px', margin: '0 0 8px 0' }}>Duyuru Listesi</h4>
                      {announcements.map((item) => (
                        <div key={item.id} style={{ border: '1px solid #e5e7eb', padding: '8px', borderRadius: '4px', marginBottom: '6px', fontSize: '12px' }}>
                          <span style={{ color: '#6b7280' }}>[{item.category}]</span> <strong>{item.title}</strong>
                          {isSafeMode ? (
                            <p style={{ margin: '4px 0 0 0', color: '#374151' }}>{item.content}</p>
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: item.content }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {securityTab === 'dom' && (isSafeMode ? <DomSafe /> : <DomVulnerable />)}
              </div>
            )}

        
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. DERS: VERİ DOĞRULAMA VE GEÇERLEME */}
        {/* ========================================================= */}
        {selectedCourse === 'data-validation' && (
          <div>
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Veri Doğrulama ve Geçerleme</h2>
              
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setValidationWeek(1)}
                  style={navButtonStyle(validationWeek === 1)}
                >
                  Hafta 1: Temel Axios & Zod Şemaları
                </button>
                
              </div>
            </div>

            {/* Seçili Haftaya Göre İlgili Lab Bileşeninin Yüklenmesi */}
            {(validationWeek === 1 || validationWeek === 2) && (
              <AxiosZodLab isSafeMode={isSafeMode} week={validationWeek} />
            )}

            
          </div>
        )}

      </main>
    </div>
  );
}

// Navigasyon Buton Stili
const navButtonStyle = (isActive) => ({
  padding: '4px 8px',
  fontSize: '12px',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
  backgroundColor: isActive ? '#111827' : '#fff',
  color: isActive ? '#fff' : '#374151',
  cursor: 'pointer'
});