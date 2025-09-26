import axios from "axios";
import type { Post, PostOverview, PostDetail, User, PostImage } from "./types";

const API_BASE = "/api";

// Create axios instance with interceptors for token handling
const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
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
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const newToken = refreshRes.data.data.access_token; // Extract from nested structure
          localStorage.setItem("auth_token", newToken);
          // Retry original request
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export const getPosts = async (): Promise<PostOverview[]> => {
  const res = await api.get("/posts");
  return res.data;
};

export const getPostDetail = async (id: string): Promise<PostDetail> => {
  const res = await api.get(`/posts/${id}`);
  return res.data;
};

export const getImageUrl = (id: string, filename: string): string => {
  return `${API_BASE}/posts/${id}/image/${filename}`;
};

export const getImageBlob = async (
  id: string,
  filename: string,
): Promise<string> => {
  const res = await api.get(`/posts/${id}/image/${filename}`, {
    responseType: "blob",
  });
  return URL.createObjectURL(res.data);
};

export const getStationPictureBlob = async (
  pictureUrl: string,
): Promise<string> => {
  const res = await api.get(pictureUrl, { responseType: "blob" });
  return URL.createObjectURL(res.data);
};

export const register = async (
  email: string,
  username: string,
  password: string,
): Promise<void> => {
  await api.post("/auth/register", { email, username, password });
};

export const login = async (
  usernameOrEmail: string,
  password: string,
): Promise<{ token: string; refresh_token: string; user: User }> => {
  const res = await api.post("/auth/login", { username: usernameOrEmail, password });
  const authData = res.data.data; // Extract from the nested data structure
  return {
    token: authData.access_token, // Map access_token to token
    refresh_token: authData.refresh_token,
    user: authData.user,
  };
};

export const confirmEmail = async (token: string): Promise<void> => {
  await api.post("/auth/confirm-email", { token });
};

export const resendConfirmationEmail = async (email: string): Promise<void> => {
  await api.post("/auth/resend-confirmation", { email });
};

export const logout = async (): Promise<void> => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (refreshToken) {
    try {
      await api.post("/auth/logout", { refresh_token: refreshToken });
    } catch (error) {
      // If logout API fails, we still want to clear local storage
      console.error("Logout API call failed:", error);
    }
  }
  // Always clear localStorage regardless of API call result
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
};

export const getProfile = async (): Promise<User> => {
  const res = await api.get("/auth/profile");
  return res.data.data; // Extract from the nested data structure
};

export const updateProfile = async (data: {
  email?: string;
  password?: string;
}): Promise<User> => {
  const res = await api.put("/auth/profile", data);
  return res.data.data; // Extract from the nested data structure
};

export const forgotPassword = async (email: string): Promise<void> => {
  await axios.post(`${API_BASE}/auth/forgot-password`, { email });
};

export const resetPassword = async (
  token: string,
  password: string,
): Promise<void> => {
  await axios.post(`${API_BASE}/auth/reset-password`, { token, password });
};

// Station types
export interface Station {
  id: string;
  name: string;
  location: string;
  picture_url?: string;
  has_picture?: boolean;
  equipment: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    username: string;
  };
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
  const res = await api.get("/stations");
  return res.data.data;
};

export const getStation = async (id: string): Promise<Station> => {
  const res = await api.get(`/stations/${id}`);
  return res.data.data;
};

export const createStation = async (
  data: CreateStationRequest,
): Promise<Station> => {
  const res = await api.post("/stations", data);
  return res.data.data;
};

export const updateStation = async (
  id: string,
  data: UpdateStationRequest,
): Promise<Station> => {
  const res = await api.put(`/stations/${id}`, data);
  return res.data.data;
};

export const deleteStation = async (id: string): Promise<void> => {
  await api.delete(`/stations/${id}`);
};

export const getStationToken = async (id: string): Promise<string> => {
  const res = await api.get(`/stations/${id}/token`);
  return res.data.data.token;
};

export const regenerateStationToken = async (id: string): Promise<string> => {
  const res = await api.post(`/stations/${id}/regenerate-token`);
  return res.data.data.token;
};

export const uploadStationPicture = async (
  id: string,
  file: File,
): Promise<Station> => {
  const formData = new FormData();
  formData.append("picture", file);
  const res = await api.post(`/stations/${id}/upload-picture`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data.data;
};

// Global station API calls (authentication required)
export const getGlobalStations = async (
  limit: number = 10,
  page: number = 1,
  sort: string = "created_at",
  order: string = "desc",
  search: string = ""
): Promise<Station[]> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    sort,
    order,
  });
  if (search.trim()) {
    params.set("search", search.trim());
  }
  const res = await api.get(`/stations/global?${params}`);
  return res.data.data;
};

export const getUserStations = async (userId: number): Promise<Station[]> => {
  const res = await axios.get(`${API_BASE}/stations/user/${userId}`);
  return res.data.data;
};

// Post API calls
export const getLatestPosts = async (limit: number = 10, page: number = 1): Promise<Post[]> => {
  const res = await axios.get(`${API_BASE}/posts/latest?limit=${limit}&page=${page}`);
  return res.data.data;
};

export const getUserPosts = async (userId: number): Promise<Post[]> => {
  const res = await axios.get(`${API_BASE}/posts/user/${userId}`);
  return res.data.data;
};

export const getStationPosts = async (
  stationId: string,
  page: number = 1,
  limit: number = 50,
): Promise<Post[]> => {
  const res = await api.get(
    `/posts/station/${stationId}?page=${page}&limit=${limit}`,
  );
  // For now, return the posts array directly (API returns {posts: [...], pagination: {...}})
  const data = res.data.data;
  return data.posts || data;
};

export const createPost = async (
  stationToken: string,
  data: {
    timestamp: string;
    satellite_name: string;
    metadata?: string;
    cbor?: Uint8Array;
  },
): Promise<Post> => {
  const res = await axios.post(`${API_BASE}/posts`, data, {
    headers: {
      Authorization: `Bearer ${stationToken}`,
    },
  });
  return res.data.data;
};

export const uploadPostImage = async (
  stationToken: string,
  postId: number,
  file: File,
): Promise<PostImage> => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await axios.post(`${API_BASE}/posts/${postId}/images`, formData, {
    headers: {
      Authorization: `Bearer ${stationToken}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data.data;
};

export const deletePost = async (postId: number): Promise<void> => {
  await api.delete(`/posts/${postId}`);
};

export const getPostImageUrl = (postId: number, imageId: number): string => {
  return `${API_BASE}/posts/${postId}/images/${imageId}`;
};

export const getPostImageBlob = async (
  postId: number,
  imageId: number,
): Promise<string> => {
  const res = await api.get(`/posts/${postId}/images/${imageId}`, {
    responseType: "blob",
  });
  return URL.createObjectURL(res.data);
};

export const getStationDetails = async (
  stationId: string,
): Promise<Station> => {
  const res = await api.get(`/stations/${stationId}/details`);
  return res.data.data;
};

// User types
export interface UserSummary {
  id: number;
  username: string;
  email?: string;
  role: string;
  public_stations: number;
  public_posts: number;
  created_at: string;
}

// Global user API calls (authentication required)
export const getGlobalUsers = async (
  limit: number = 10,
  page: number = 1,
  sort: string = "created_at",
  order: string = "desc",
  search: string = ""
): Promise<UserSummary[]> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    sort,
    order,
  });
  if (search.trim()) {
    params.set("search", search.trim());
  }
  const res = await api.get(`/users/global?${params}`);
  return res.data.data;
};

export const confirmEmailChange = async (token: string): Promise<void> => {
  await api.post("/auth/confirm-email-change", { token });
};
