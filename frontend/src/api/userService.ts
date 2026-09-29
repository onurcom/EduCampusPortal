import { api } from './axiosInstance';
import { z } from 'zod';

// 2. Hafta: Zod Şeması ve Transform İşlemi
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  // String gelen tarihi Date objesine dönüştürme
  createdAt: z.string().transform((val) => new Date(val)),
});

export type User = z.infer<typeof UserSchema>;

// Tip Güvenli ve Zod Doğrulamalı API Çağrısı
export async function getUserProfile(userId: string): Promise<User> {
  const response = await api.get(`/users/${userId}`);

  // Runtime Şema Doğrulaması
  const result = UserSchema.safeParse(response.data);

  if (!result.success) {
    console.error('Zod Şema Doğrulama Hatası:', result.error.format());
    throw new Error('Sunucudan gelen veri beklenen formatta değil.');
  }

  return result.data;
}