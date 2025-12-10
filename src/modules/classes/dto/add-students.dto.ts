import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AddStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];
}
