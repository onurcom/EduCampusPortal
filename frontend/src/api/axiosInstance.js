import axios from 'axios';

// Veri Alma Dersi: Merkezi Axios Konfigürasyonu
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true // Web Güvenliği Dersi: HttpOnly Cookie'lerin API istekleriyle gönderilmesi için şart
});

// Veri Alma & Güvenlik Dersi: Response Interceptor ile Global Hata Yakalama
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Yetkisiz İletişim: Kullanıcının oturumu geçersiz veya süresi dolmuş.');
    }
    return Promise.reject(error);
  }
);