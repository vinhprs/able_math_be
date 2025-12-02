import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../../database/entities/user.entity';
import { IJwtPayload, IAuthResponse } from '@shared/types/users.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate user credentials
   * Supports login with username or email
   */
  async validateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    // Try to find by username first
    let user = await this.usersService.findByUsername(usernameOrEmail);

    // If not found, try to find by email
    if (!user) {
      user = await this.usersService.findByEmail(usernameOrEmail);
    }

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await this.usersService.validatePassword(user, password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Register a new user (Admin only)
   */
  async register(registerDto: RegisterDto, currentUser: IJwtPayload): Promise<IAuthResponse> {
    // Only ADMIN can create accounts
    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can create user accounts');
    }

    // Create user (UsersService handles password hashing and validation)
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Login user and generate JWT tokens
   */
  async login(user: User): Promise<IAuthResponse> {
    return this.generateTokens(user);
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private generateTokens(user: User): IAuthResponse {
    const payload: IJwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.signOptions.expiresIn') || '15m',
    });

    // Generate refresh token (7 days)
    const refreshTokenSecret =
      this.configService.get<string>('jwt-refresh.secret') ||
      this.configService.get<string>('jwt.secret');
    const refreshTokenExpiresIn = this.configService.get<string>('jwt-refresh.expiresIn') || '7d';

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshTokenSecret,
      expiresIn: refreshTokenExpiresIn,
    });

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const refreshTokenSecret =
        this.configService.get<string>('jwt-refresh.secret') ||
        this.configService.get<string>('jwt.secret');

      // Verify refresh token
      const payload = this.jwtService.verify<IJwtPayload>(refreshToken, {
        secret: refreshTokenSecret,
      });

      // Verify user still exists and is active
      const user = await this.usersService.findOne(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const newPayload: IJwtPayload = {
        sub: user.id,
        username: user.username,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('jwt.signOptions.expiresIn') || '15m',
      });

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.usersService.findOne(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<IJwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
