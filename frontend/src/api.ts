import axios from 'axios';
import type { PostOverview, PostDetail, User } from './types';

const API_BASE = '/api';

// Create axios instance with interceptors for token handling
const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
          const newToken = refreshRes.data.data.access_token; // Extract from nested structure
          localStorage.setItem('auth_token', newToken);
          // Retry original request
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getPosts = async (): Promise<PostOverview[]> => {
  const res = await api.get('/posts');
  return res.data;
};

export const getPostDetail = async (id: string): Promise<PostDetail> => {
  const res = await api.get(`/posts/${id}`);
  return res.data;
};

export const getImageUrl = (id: string, filename: string): string => {
  return `${API_BASE}/posts/${id}/image/${filename}`;
};

export const getImageBlob = async (id: string, filename: string): Promise<string> => {
  const res = await api.get(`/posts/${id}/image/${filename}`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

export const getStationPictureBlob = async (pictureUrl: string): Promise<string> => {
  const res = await api.get(pictureUrl, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
};

export const register = async (username: string, password: string): Promise<void> => {
  await api.post('/auth/register', { username, password });
};

export const login = async (username: string, password: string): Promise<{ token: string; refresh_token: string; user: User }> => {
  const res = await api.post('/auth/login', { username, password });
  const authData = res.data.data; // Extract from the nested data structure
  return {
    token: authData.access_token, // Map access_token to token
    refresh_token: authData.refresh_token,
    user: authData.user,
  };
};

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    try {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } catch (error) {
      // If logout API fails, we still want to clear local storage
      console.error('Logout API call failed:', error);
    }
  }
  // Always clear localStorage regardless of API call result
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
};

export const getProfile = async (): Promise<User> => {
  const res = await api.get('/auth/profile');
  return res.data.data; // Extract from the nested data structure
};

// Station types
export interface Station {
  id: number;
  name: string;
  location: string;
  picture_url?: string;
  has_picture?: boolean;
  equipment: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStationRequest {
  name: string;
  location: string;
  equipment?: string;
  is_public?: boolean;
}

export interface UpdateStationRequest extends CreateStationRequest {}

// Station API calls
export const getStations = async (): Promise<Station[]> => {
  const res = await api.get('/stations');
  return res.data.data;
};

export const getStation = async (id: number): Promise<Station> => {
  const res = await api.get(`/stations/${id}`);
  return res.data.data;
};

export const createStation = async (data: CreateStationRequest): Promise<Station> => {
  const res = await api.post('/stations', data);
  return res.data.data;
};

export const updateStation = async (id: number, data: UpdateStationRequest): Promise<Station> => {
  const res = await api.put(`/stations/${id}`, data);
  return res.data.data;
};

export const deleteStation = async (id: number): Promise<void> => {
  await api.delete(`/stations/${id}`);
};

export const getStationToken = async (id: number): Promise<string> => {
  const res = await api.get(`/stations/${id}/token`);
  return res.data.data.token;
};

export const regenerateStationToken = async (id: number): Promise<string> => {
  const res = await api.post(`/stations/${id}/regenerate-token`);
  return res.data.data.token;
};

export const uploadStationPicture = async (id: number, file: File): Promise<Station> => {
  const formData = new FormData();
  formData.append('picture', file);
  const res = await api.post(`/stations/${id}/upload-picture`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
};

// Public station API calls (no authentication required)
export const getGlobalStations = async (): Promise<Station[]> => {
  const res = await axios.get(`${API_BASE}/stations/global`);
  return res.data.data;
};

export const getUserStations = async (userId: number): Promise<Station[]> => {
  const res = await axios.get(`${API_BASE}/stations/user/${userId}`);
  return res.data.data;
};