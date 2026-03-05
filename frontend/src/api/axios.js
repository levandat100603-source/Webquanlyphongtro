import axios from 'axios';

const instance = axios.create({
    // Lấy URL từ biến môi trường Vercel (đã cài ở bước trước)
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Quan trọng để dùng Sanctum/Cookie
});

export default instance;