import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../../database/entities/user.entity';
import { IJwtPayload, IAuthResponse } from '@shared/types/users.types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { jwtConfig } from '../../config/jwt.config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    const user = await this.usersService.create(registerDto, currentUser.sub);

    // Generate tokens
    return await this.generateTokens(user);
  }

  /**
   * Login user and generate JWT tokens
   */
  async login(user: User): Promise<IAuthResponse> {
    return await this.generateTokens(user);
  }

  /**
   * Generate access and refresh tokens for a user
   * Saves refresh token to database with bcrypt hashing
   */
  async generateTokens(user: User): Promise<IAuthResponse> {
    const payload: IJwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    // Generate access token (2 hours)
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.accessTokenSecret,
      expiresIn: jwtConfig.accessTokenExpiry,
    });

    // Generate refresh token (7 days)
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.refreshTokenSecret,
      expiresIn: jwtConfig.refreshTokenExpiry,
    });

    // Hash and save refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
      refreshTokenExpiresAt: expiresAt,
    });

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
      expiresIn: 7200, // 2 hours in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation for security
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<IJwtPayload>(refreshToken, {
        secret: jwtConfig.refreshTokenSecret,
      });

      // Get user with refresh token fields
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'username', 'role', 'refreshToken', 'refreshTokenExpiresAt', 'isActive'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Check if refresh token exists and not expired
      if (!user.refreshToken || !user.refreshTokenExpiresAt) {
        throw new UnauthorizedException('No refresh token found');
      }

      if (new Date() > user.refreshTokenExpiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Verify stored refresh token matches
      const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshToken);

      if (!isValidRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens (token rotation)
      const tokens = await this.generateTokens(user);

      this.logger.log(`Access token refreshed for user ${user.username}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn || 7200,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token (backward compatibility)
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const result = await this.refreshAccessToken(refreshToken);
    return { accessToken: result.accessToken };
  }

  /**
   * Revoke refresh token for a user
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: undefined,
      refreshTokenExpiresAt: undefined,
    });
    this.logger.log(`Refresh token revoked for user ${userId}`);
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
