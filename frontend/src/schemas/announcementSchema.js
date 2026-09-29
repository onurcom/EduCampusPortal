// src/schemas/announcementSchema.js
import { z } from 'zod';

// Tek bir duyurunun Runtime Şeması
export const announcementSchema = z.object({
  id: z.number({ required_error: 'ID zorunludur.' }),
  title: z.string().min(3, 'Başlık en az 3 karakter olmalıdır.'),
  category: z.enum(['Genel', 'Sınav', 'Ödev'], {
    errorMap: () => ({ message: 'Geçersiz kategori tipi.' })
  }),
  content: z.string().min(5, 'İçerik en az 5 karakter olmalıdır.')
});

// Sunucudan gelen DİZİ (Array) yanıtının doğrulanması
export const announcementListSchema = z.array(announcementSchema);