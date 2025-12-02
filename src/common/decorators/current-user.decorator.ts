import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IJwtPayload } from '@shared/types/users.types';

/**
 * Decorator to get current authenticated user from request
 * Usage: @CurrentUser() user: IJwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: keyof IJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

