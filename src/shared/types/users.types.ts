import { UserRole } from './enum';

/**
 * Base user interface
 */
export interface IUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User creation payload
 */
export interface ICreateUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

/**
 * User update payload
 */
export interface IUpdateUser {
  email?: string;
  fullName?: string;
  isActive?: boolean;
}

/**
 * Login credentials
 */
export interface ILoginCredentials {
  username: string;
  password: string;
}

/**
 * JWT payload
 */
export interface IJwtPayload {
  sub: string; // user id
  username: string;
  role: UserRole;
}

/**
 * Auth response
 */
export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<IUser, 'password'>;
}
