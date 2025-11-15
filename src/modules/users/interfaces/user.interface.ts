export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}

export interface IUser {
  id: string;
  username: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  coins: number;
  role: UserRole;
  authProvider: AuthProvider;
  googleId?: string;
  facebookId?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  authProvider?: AuthProvider;
}