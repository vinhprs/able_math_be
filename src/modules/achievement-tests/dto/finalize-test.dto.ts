import { IsInt, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class FinalizeTestDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty() // ✅ REQUIRED
  nationalAverage: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty() // ✅ REQUIRED
  maxScore: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty() // ✅ REQUIRED
  totalApplicants: number;
}
