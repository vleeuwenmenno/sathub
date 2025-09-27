// New post types for database-driven posts
export interface Post {
  id: number;
  station_id: number;
  station_name: string;
  timestamp: string;
  satellite_name: string;
  metadata: string;
  images: PostImage[];
  created_at: string;
  updated_at: string;
}

export interface PostImage {
  id: number;
  filename: string;
  image_url: string;
}

export interface DatabasePostDetail {
  id: number;
  station_id: string;
  station_name: string;
  station_user?: {
    id: number;
    username: string;
  };
  timestamp: string;
  satellite_name: string;
  metadata: string;
  images: PostImage[];
  created_at: string;
  updated_at: string;
}

// Legacy types (kept for backward compatibility if needed)
export interface PostOverview {
  id: string;
  description: string;
  location: string;
  user: string;
  uploaded_at: string;
  cover_image: string;
  satellite: string;
  timestamp: number;
  computed_at: string;
}

export interface ImageGroup {
  type: string;
  images: string[];
}

export interface PostDetail {
  id: string;
  info: Record<string, any>;
  metadata: Record<string, any>;
  cbor: any;
  images: string[];
  imageGroups: ImageGroup[];
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  two_factor_enabled: boolean;
  display_name?: string;
  profile_picture_url?: string;
  has_profile_picture: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
