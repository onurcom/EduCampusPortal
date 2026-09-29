// src/components/AnnouncementForm.jsx
import React, { useState } from 'react';

export function AnnouncementForm({ onAnnouncementAdded }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Genel');
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    onAnnouncementAdded({ title, category, content });
    setTitle('');
    setContent('');
  };

  return (
    <div>
      <h3 style={{ fontSize: '15px', margin: '0 0 12px 0' }}>Duyuru Ekle (Stored XSS)</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#374151' }}>Başlık</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Duyuru başlığı..."
            style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#374151' }}>Kategori</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', boxSizing: 'border-box', backgroundColor: '#fff' }}
          >
            <option value="Genel">Genel</option>
            <option value="Sınav">Sınav</option>
            <option value="Ders">Ders</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#374151' }}>İçerik</label>
          <textarea 
            rows={3} 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="Duyuru içeriği..."
            style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '4px', width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        <button 
          type="submit" 
          style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #d1d5db', background: '#fff', color: '#111827', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          Duyuru Yayınla
        </button>
      </form>
    </div>
  );
}