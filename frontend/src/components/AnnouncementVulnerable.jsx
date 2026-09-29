// src/components/AnnouncementVulnerable.jsx
import React, { useState } from 'react';

export function AnnouncementVulnerable() {
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Bahar Dönemi Vize Takvimi', content: 'Sınavlar 15 Nisan tarihinde başlayacaktır.' }
  ]);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleAddAnnouncement = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    const newAnnouncement = {
      id: Date.now(),
      title,
      content
    };

    setAnnouncements([...announcements, newAnnouncement]);
    setTitle('');
    setContent('');
  };

  return (
    <div>
      <h3 style={{ fontSize: '15px', margin: '0 0 12px 0' }}>Stored XSS (Kontrolsüz)</h3>
      
      <form onSubmit={handleAddAnnouncement} style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <input 
            type="text" 
            placeholder="Duyuru Başlığı" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '8px' }}>
          <textarea 
            placeholder="Duyuru İçeriği" 
            value={content} 
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
        <button type="submit" style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #d1d5db', background: '#fff', color: '#111827', borderRadius: '4px', cursor: 'pointer' }}>
          Duyuru Yayınla
        </button>
      </form>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
        <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#374151' }}>Yayınlanan Duyurular</h4>
        {announcements.map((item) => (
          <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '10px', marginBottom: '8px', fontSize: '13px' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>{item.title}</strong>
            {/* HTML olarak DOM'a aktarılır, Stored XSS tetiklenir */}
            <div dangerouslySetInnerHTML={{ __html: item.content }} style={{ color: '#374151' }} />
          </div>
        ))}
      </div>
    </div>
  );
}