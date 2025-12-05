import { IAuthResponse, IUser } from '@shared/types/users.types';

export class AuthResponseDto implements IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<IUser, 'password'> & {
    school?: string;
    grade?: string;
    parentName?: string;
    parentContact?: string;
  };
}
