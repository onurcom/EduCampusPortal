import axios from 'axios';

// Veri Alma Dersi: Merkezi Axios Konfigürasyonu
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Web Güvenliği: HttpOnly Cookie ile iletim
  timeout: 5000,
});

// 2. HAFTA EKLEMESİ: Request Interceptor (Auth Token Ekleme)
api.interceptors.request.use(
  (config) => {
    // Varsa Bearer Token'ı LocalStorage/SessionStorage'dan alıp header'a ekler
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Veri Alma & Güvenlik Dersi: Response Interceptor ile Global Hata Yakalama
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Yetkisiz İletişim: Kullanıcının oturumu geçersiz veya süresi dolmuş.');
      // 2. HAFTA EKLEMESİ: Oturum süresi bittiğinde token'ı silme ve yönlendirme
      localStorage.removeItem('access_token');
    }
    return Promise.reject(error);
  }
);