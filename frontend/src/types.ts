// New post types for database-driven posts
export interface Post {
  id: string;
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

export interface PostImage {
  id: number;
  filename: string;
  image_url: string;
}

export interface DatabasePostDetail {
  id: string;
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
  hidden: boolean;
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
  station_email_notifications?: boolean;
  language?: string;
}

export interface PostComment {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  profile_picture_url?: string;
  has_profile_picture: boolean;
  content: string;
  parent_id?: string;
  replies?: PostComment[];
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: string;
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
  type:
    | "achievement"
    | "comment"
    | "like"
    | "station_down"
    | "station_online"
    | "station_low_uptime"
    | "report";
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

export interface UserActivity {
  id: string;
  type: "liked_post" | "liked_comment" | "commented" | "posted" | "achievement" | "station";
  timestamp: string;
  data: {
    post_id?: string;
    post_title?: string;
    comment_id?: string;
    post_title_for_comment?: string;
    achievement_id?: string;
    achievement_name?: string;
    station_id?: string;
    station_name?: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
