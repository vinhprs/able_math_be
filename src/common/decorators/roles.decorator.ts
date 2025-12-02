import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@shared/types/enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * Usage: @Roles(UserRole.ADMIN, UserRole.TEACHER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

