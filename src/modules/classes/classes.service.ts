import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../../database/entities/class.entity';
import { User } from '../../database/entities/user.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AddStudentsDto } from './dto/add-students.dto';
import { ClassQueryDto } from './dto/class-query.dto';
import { UserRole } from '@shared/types/enum';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new class
   */
  async create(createClassDto: CreateClassDto, teacherId: string): Promise<Class> {
    const classEntity = this.classRepository.create({
      ...createClassDto,
      teacherId,
    });

    return this.classRepository.save(classEntity);
  }

  /**
   * Find all classes (with filters and pagination)
   */
  async findAll(query: ClassQueryDto, userId: string, userRole: UserRole) {
    const { page = 1, limit = 10, grade, term, isActive, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('class.students', 'students');

    // Teachers can only see their own classes
    if (userRole === UserRole.TEACHER) {
      queryBuilder.where('class.teacherId = :userId', { userId });
    }

    // Apply filters
    if (grade) {
      queryBuilder.andWhere('class.grade = :grade', { grade });
    }

    if (term) {
      queryBuilder.andWhere('class.term = :term', { term });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('class.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere('(class.name ILIKE :search OR class.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Pagination
    queryBuilder.skip(skip).take(limit);

    // Order by created date
    queryBuilder.orderBy('class.createdAt', 'DESC');

    const [classes, total] = await queryBuilder.getManyAndCount();

    // Add student count to each class
    const classesWithCount = classes.map((classEntity) => ({
      ...classEntity,
      studentCount: classEntity.students?.length || 0,
    }));

    return {
      data: classesWithCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find one class by ID
   */
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Class> {
    const classEntity = await this.classRepository.findOne({
      where: { id },
      relations: ['teacher', 'students'],
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    // Teachers can only access their own classes
    if (userRole === UserRole.TEACHER && classEntity.teacherId !== userId) {
      throw new ForbiddenException('You can only access your own classes');
    }

    return {
      ...classEntity,
      studentCount: classEntity.students?.length || 0,
    } as Class;
  }

  /**
   * Update class
   */
  async update(
    id: string,
    updateClassDto: UpdateClassDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Class> {
    const classEntity = await this.findOne(id, userId, userRole);

    Object.assign(classEntity, updateClassDto);

    return this.classRepository.save(classEntity);
  }

  /**
   * Delete class
   */
  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const classEntity = await this.findOne(id, userId, userRole);

    await this.classRepository.remove(classEntity);
  }

  /**
   * Add students to class
   */
  async addStudents(
    classId: string,
    addStudentsDto: AddStudentsDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Class> {
    const classEntity = await this.findOne(classId, userId, userRole);

    // Validate all students exist and have STUDENT role
    const students = await this.userRepository.find({
      where: addStudentsDto.studentIds.map((id) => ({ id })),
    });

    if (students.length !== addStudentsDto.studentIds.length) {
      throw new BadRequestException('Some student IDs are invalid');
    }

    const nonStudents = students.filter((s) => s.role !== UserRole.STUDENT);
    if (nonStudents.length > 0) {
      throw new BadRequestException('Some users are not students');
    }

    // Add students (avoid duplicates)
    const existingIds = new Set((classEntity.students || []).map((s) => s.id));
    const newStudents = students.filter((s) => !existingIds.has(s.id));

    if (!classEntity.students) {
      classEntity.students = [];
    }
    classEntity.students.push(...newStudents);

    return this.classRepository.save(classEntity);
  }

  /**
   * Remove student from class
   */
  async removeStudent(
    classId: string,
    studentId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Class> {
    const classEntity = await this.findOne(classId, userId, userRole);

    classEntity.students = (classEntity.students || []).filter((s) => s.id !== studentId);

    return this.classRepository.save(classEntity);
  }

  /**
   * Get class statistics
   */
  async getStatistics(classId: string, userId: string, userRole: UserRole) {
    const classEntity = await this.findOne(classId, userId, userRole);

    // TODO: Add more statistics (test completion rate, average scores, etc.)
    return {
      totalStudents: classEntity.students?.length || 0,
      activeStudents: classEntity.students?.filter((s) => s.isActive).length || 0,
      grade: classEntity.grade,
      term: classEntity.term,
    };
  }
}
