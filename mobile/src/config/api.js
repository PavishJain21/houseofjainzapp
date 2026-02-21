import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API URL (Netlify deployment)
const API_URL = 'https://devserver-main--unique-crostata-cb0a3f.netlify.app/api';

const getApiUrl = () => {
  return API_URL;
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
