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
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}