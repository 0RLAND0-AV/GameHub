export interface AuthResponse {
  token: string;
  user: {
    userId: string;
    username: string;
    email: string;
    role: 'USER' | 'ADMIN';
    coins: number;
  };
}

export interface UserSession {
  userId: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}