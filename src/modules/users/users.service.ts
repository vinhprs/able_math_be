import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../../../frontend/src/shared/types/enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Find user by ID (internal method)
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Create a new user with RBAC
   */
  async create(createUserDto: CreateUserDto, creatorId: string): Promise<User> {
    const creator = await this.findById(creatorId);

    // Permission check
    if (creator.role === UserRole.TEACHER && createUserDto.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Teachers can only create student accounts');
    }
    if (creator.role === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot create accounts');
    }

    // Check uniqueness
    const existing = await this.userRepository.findOne({
      where: [{ username: createUserDto.username }, { email: createUserDto.email }],
    });
    if (existing) {
      if (existing.username === createUserDto.username) {
        throw new ConflictException('Username already exists');
      }
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const saltRounds = this.configService.get<number>('app.bcryptSaltRounds', 10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      createdBy: creatorId,
    });

    const saved = await this.userRepository.save(user);
    // Remove password from response
    return saved;
  }

  /**
   * Find all users with pagination, filters, and RBAC
   */
  async findAll(
    queryDto: UserQueryDto,
    requesterId: string,
  ): Promise<{
    data: User[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const requester = await this.findById(requesterId);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.creator', 'creator');

    // RBAC filtering
    if (requester.role === UserRole.TEACHER) {
      qb.where('user.createdBy = :requesterId', { requesterId }).andWhere('user.role = :role', {
        role: UserRole.STUDENT,
      });
    } else if (requester.role === UserRole.STUDENT) {
      qb.where('user.id = :requesterId', { requesterId });
    }

    // Apply filters (only for ADMIN)
    if (requester.role === UserRole.ADMIN) {
      if (queryDto.role) {
        qb.andWhere('user.role = :role', { role: queryDto.role });
      }
    }

    if (queryDto.search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.school) {
      qb.andWhere('user.school = :school', { school: queryDto.school });
    }

    if (queryDto.grade) {
      qb.andWhere('user.grade = :grade', { grade: queryDto.grade });
    }

    if (queryDto.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: queryDto.isActive });
    }

    if (queryDto.createdBy && requester.role === UserRole.ADMIN) {
      qb.andWhere('user.createdBy = :createdBy', { createdBy: queryDto.createdBy });
    }

    // Pagination
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    qb.skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    const [users, total] = await qb.getManyAndCount();

    // Remove passwords
    const sanitizedUsers = users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      data: sanitizedUsers as User[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by ID with optional permission check
   */
  async findOne(id: string, requesterId?: string): Promise<User> {
    // Load user with creator relation
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If requesterId is provided, check permissions
    if (requesterId) {
      const requester = await this.findById(requesterId);

      if (requester.role === UserRole.TEACHER) {
        if (user.createdBy !== requesterId || user.role !== UserRole.STUDENT) {
          throw new ForbiddenException('You can only view students you created');
        }
      } else if (requester.role === UserRole.STUDENT) {
        if (id !== requesterId) {
          throw new ForbiddenException('You can only view your own profile');
        }
      }
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Update user with RBAC
   */
  async update(id: string, updateDto: UpdateUserDto, requesterId: string): Promise<User> {
    const requester = await this.findById(requesterId);
    const user = await this.findById(id);

    // Permission check
    if (requester.role === UserRole.TEACHER) {
      if (user.createdBy !== requesterId || user.role !== UserRole.STUDENT) {
        throw new ForbiddenException('You can only update students you created');
      }
      if (updateDto.role) {
        throw new ForbiddenException('Cannot change role');
      }
    } else if (requester.role === UserRole.STUDENT) {
      if (id !== requesterId) {
        throw new ForbiddenException('Can only update own profile');
      }
      if (updateDto.role || updateDto.email) {
        throw new ForbiddenException('Cannot change sensitive fields');
      }
    }

    // Check email uniqueness
    if (updateDto.email && updateDto.email !== user.email) {
      const existing = await this.findByEmail(updateDto.email);
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password if changing
    if (updateDto.password) {
      const saltRounds = this.configService.get<number>('app.bcryptSaltRounds', 10);
      updateDto.password = await bcrypt.hash(updateDto.password, saltRounds);
    }

    Object.assign(user, updateDto);
    const updated = await this.userRepository.save(user);
    // Remove password from response
    return updated;
  }

  /**
   * Delete user with RBAC (soft delete)
   */
  async delete(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new BadRequestException('Cannot delete own account');
    }

    const requester = await this.findById(requesterId);
    const user = await this.findById(id);

    if (requester.role === UserRole.TEACHER) {
      if (user.createdBy !== requesterId || user.role !== UserRole.STUDENT) {
        throw new ForbiddenException('You can only delete students you created');
      }
    } else if (requester.role === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot delete accounts');
    }

    // Soft delete
    user.isActive = false;
    await this.userRepository.save(user);
  }

  /**
   * Validate user password
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
