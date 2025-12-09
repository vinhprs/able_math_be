import { IsArray, IsUUID } from 'class-validator';

export class SelectUnitsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  selectedUnitIds: string[];
}
