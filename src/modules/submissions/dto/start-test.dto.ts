import { IsUUID } from 'class-validator';

export class StartTestDto {
  @IsUUID()
  assignmentId: string;
}
