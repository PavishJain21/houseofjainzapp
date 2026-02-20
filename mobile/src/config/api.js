import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this with your backend URL
// For physical devices, use your computer's IP address instead of localhost
// Example: 'http://192.168.1.100:5000/api'
// For web, localhost works fine
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Running on web
    return __DEV__ 
      ? 'http://192.168.1.2:5000/api' 
      : 'https://your-production-url.com/api';
  }
  // Running on mobile
  return __DEV__ 
    ? 'http://192.168.1.2:5000/api' 
    : 'https://your-production-url.com/api';
};

export const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // For FormData, remove Content-Type header to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
