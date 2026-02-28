import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// In development, use local backend so feature flags and data come from your .env
// Android emulator: use 10.0.2.2 instead of localhost; physical device: use your machine's IP
const LOCAL_API = __DEV__ ? 'http://localhost:5000/api/' : 'https://houseofjainz-o8g2v.ondigitalocean.app/api/';
const PRODUCTION_API = 'https://houseofjainz-o8g2v.ondigitalocean.app/api';

const API_URL = LOCAL_API;

const getApiUrl = () => API_URL;

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
