// New post types for database-driven posts
export interface Post {
  id: number;
  station_id: number;
  station_name: string;
  timestamp: string;
  satellite_name: string;
  metadata: string;
  images: PostImage[];
  likes_count: number;
  is_liked: boolean;
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
    id: string;
    username: string;
    display_name?: string;
    profile_picture_url?: string;
    has_profile_picture: boolean;
  };
  timestamp: string;
  satellite_name: string;
  metadata: string;
  images: PostImage[];
  likes_count: number;
  is_liked: boolean;
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
  id: string;
  username: string;
  email?: string;
  role: string;
  two_factor_enabled: boolean;
  display_name?: string;
  profile_picture_url?: string;
  has_profile_picture: boolean;
  email_notifications?: boolean;
}

export interface PostComment {
  id: number;
  user_id: string;
  username: string;
  display_name?: string;
  profile_picture_url?: string;
  has_profile_picture: boolean;
  content: string;
  parent_id?: number;
  replies?: PostComment[];
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: number;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface UserAchievement {
  achievement: Achievement;
  unlocked_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'achievement' | 'comment' | 'like';
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
