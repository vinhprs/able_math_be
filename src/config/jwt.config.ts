import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    signOptions: {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    },
  }),
);

export const jwtRefreshConfig = registerAs('jwt-refresh', () => ({
  secret:
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-refresh-key',
  expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
