// scripts/constants/unit-names.ts

/**
 * Complete Unit Names Database
 * Total: 91 curriculum units from Elementary Grade 4 to Middle School Grade 3
 * Source: Unit Database sheet from Excel
 */

export interface UnitInfo {
  korean: string;
  english: string;
}

export const UNIT_NAMES: { [key: number]: UnitInfo } = {
  // ========================================
  // Elementary Grade 4 - Semester 1
  // ========================================
  1: { korean: '1. 큰수', english: '1. Large numbers' },
  2: { korean: '2. 각도', english: '2. Angle' },
  3: { korean: '3. 곱셈과 나눗셈', english: '3. Multiplication and Division' },
  4: { korean: '4. 평면도형의 이동', english: '4. Movement of plane figures' },
  5: { korean: '5. 막대그래프', english: '5. Bar graph' },
  6: { korean: '6. 규칙찾기', english: '6. Finding the Rule' },

  // ========================================
  // Elementary Grade 4 - Semester 2
  // ========================================
  7: { korean: '1. 분수의 덧셈과 뺄셈', english: '1. Addition and subtraction of fractions' },
  8: { korean: '2. 삼각형', english: '2. Triangle' },
  9: { korean: '3. 소수의 덧셈과 뺄셈', english: '3. Addition and subtraction of decimals' },
  10: { korean: '4. 사각형', english: '4. Square' },
  11: { korean: '5. 꺾은선 그래프', english: '5. Broken line graph' },
  12: { korean: '6. 다각형', english: '6. Polygon' },

  // ========================================
  // Elementary Grade 5 - Semester 1
  // ========================================
  13: { korean: '1. 자연수와 혼합계산', english: '1. Natural numbers and mixed calculations' },
  14: { korean: '2. 약수와 배수', english: '2. Divisors and multiples' },
  15: { korean: '3. 규칙과 대응', english: '3. Rules and Responses' },
  16: { korean: '4. 약분과 통분', english: '4. Reduction and common denominator' },
  17: { korean: '5. 분수의 덧셈과 뺄셈', english: '5. Addition and subtraction of fractions' },
  18: { korean: '6. 다각형의 둘레와 넓이', english: '6. Perimeter and area of polygons' },

  // ========================================
  // Elementary Grade 5 - Semester 2
  // ========================================
  19: { korean: '1.수의 범위와 어림하기', english: '1. Range and estimation of numbers' },
  20: { korean: '2.분수의 곱셈', english: '2. Multiplication of fractions' },
  21: { korean: '3.합동과 대칭', english: '3. Congruence and symmetry' },
  22: { korean: '4.소수의 곱셈', english: '4. Multiplication of decimals' },
  23: { korean: '5.직육면체', english: '5. Rectangular solid' },
  24: { korean: '6.평균과 가능성', english: '6. Average and probability' },

  // ========================================
  // Elementary Grade 6 - Semester 1
  // ========================================
  25: { korean: '1. 분수의 나눗셈', english: '1. Division of fractions' },
  26: { korean: '2. 각기둥과 각뿔', english: '2. Pyramids and pyramids' },
  27: { korean: '3. 소수의 나눗셈', english: '3. Division of decimals' },
  28: { korean: '4. 비와 비율', english: '4. Rain and ratio' },
  29: { korean: '5. 여러 가지 그래프', english: '5. Various graphs' },
  30: {
    korean: '6. 직육면체의 부피와 겉넓이',
    english: '6. Volume and surface area of a rectangular solid',
  },

  // ========================================
  // Elementary Grade 6 - Semester 2
  // ========================================
  31: { korean: '1.분수의 나눗셈', english: '1. Division of fractions' },
  32: { korean: '2.소수의 나눗셈', english: '2. Division of decimals' },
  33: { korean: '3.공간과 입체', english: '3. Space and three-dimensionality' },
  34: {
    korean: '4.비례식과 비례배분',
    english: '4. Proportionality and proportional distribution',
  },
  35: { korean: '5.원의 넓이', english: '5. Area of a circle' },
  36: { korean: '6.원기둥, 원뿔, 구', english: '6. Cylinder, cone, sphere' },

  // ========================================
  // Middle School Grade 1 - Semester 1
  // ========================================
  37: { korean: '1. 소인수 분해', english: '1. Factorization' },
  38: {
    korean: '2. 최대공약수와 최소공배수',
    english: '2. Greatest common divisor and least common multiple',
  },
  39: { korean: '3. 정수와 유리수', english: '3. Integers and rational numbers' },
  40: { korean: '4. 유리수의 계산', english: '4. Calculation of rational numbers' },
  41: { korean: '5. 문자와 식', english: '5. Characters and Expressions' },
  42: { korean: '6. 일차방정식의 풀이', english: '6. Solving linear equations' },
  43: { korean: '7. 일차방정식의 활용', english: '7. Application of linear equations' },
  44: { korean: '8. 순서쌍과 좌표평면', english: '8. Ordered pairs and coordinate planes' },
  45: {
    korean: '9. 정비례 관계와 반비례 관계의 그래프',
    english: '9. Graphs of proportional and inverse relationships',
  },

  // ========================================
  // Middle School Grade 1 - Semester 2
  // ========================================
  46: { korean: '1. 기본도형', english: '1. Basic shapes' },
  47: { korean: '2. 위치관계', english: '2. Positional relationship' },
  48: { korean: '3. 평행선', english: '3. Parallel lines' },
  49: { korean: '4. 작도와 합동', english: '4. Construction and Congruence' },
  50: { korean: '5. 다각형', english: '5. Polygon' },
  51: { korean: '6. 원과 부채꼴', english: '6. Circles and sectors' },
  52: { korean: '7. 다면체', english: '7. Polyhedron' },
  53: { korean: '8. 회전체', english: '8. Rotating body' },
  54: {
    korean: '9. 입체도형의 부피와 겉넓이',
    english: '9. Volume and surface area of solid figures',
  },
  55: { korean: '10. 자료의 정리', english: '10. Organizing the data' },
  56: { korean: '11. 자료의 분석', english: '11. Data Analysis' },

  // ========================================
  // Middle School Grade 2 - Semester 1
  // ========================================
  57: { korean: '1. 유리수와 순환소수', english: '1. Rational numbers and recurring decimals' },
  58: { korean: '2. 단항식의 계산', english: '2. Calculating monomials' },
  59: { korean: '3. 다항식의 계산', english: '3. Calculating polynomials' },
  60: { korean: '4. 일차부등식', english: '4. Linear inequality' },
  61: { korean: '5. 일차부등식의 활용', english: '5. Application of linear inequalities' },
  62: { korean: '6. 연립방정식', english: '6. Simultaneous equations' },
  63: { korean: '7. 연립방정식의 활용', english: '7. Application of simultaneous equations' },
  64: { korean: '8. 일차함수와 그 그래프', english: '8. Linear functions and their graphs' },
  65: {
    korean: '9. 일차함수와 일차방정식의 관계',
    english: '9. Relationship between linear functions and linear equations',
  },

  // ========================================
  // Middle School Grade 2 - Semester 2
  // ========================================
  66: { korean: '1. 삼각형의 성질', english: '1. Properties of triangles' },
  67: { korean: '2. 삼각형의 내심과 외심', english: '2. Incenter and circumcenter of a triangle' },
  68: { korean: '3. 평행사변형', english: '3. Parallelogram' },
  69: { korean: '4. 여러 가지 사각형', english: '4. Various squares' },
  70: { korean: '5. 도형의 닮음', english: '5. Similarity of shapes' },
  71: {
    korean: '6. 평행선과 선분의 길이의 비',
    english: '6. Ratio of the length of parallel lines and line segments',
  },
  72: { korean: '7. 경우의 수', english: '7. Number of cases' },
  73: { korean: '8. 확률', english: '8. Probability' },

  // ========================================
  // Middle School Grade 3 - Semester 1
  // ========================================
  74: { korean: '1. 제곱근의 뜻과 성질', english: '1. Meaning and properties of square roots' },
  75: { korean: '2. 무리수와 실수', english: '2. Irrational numbers and real numbers' },
  76: {
    korean: '3. 근호를 포함한 식의 계산',
    english: '3. Calculating expressions including radicals',
  },
  77: { korean: '4. 다항삭의 곱셈', english: '4. Multiplication of polynomials' },
  78: { korean: '5. 다항식의 인수분해', english: '5. Factoring polynomials' },
  79: { korean: '6. 인수분해 공식의 활용', english: '6. Application of the factoring formula' },
  80: { korean: '7. 이차방정식 풀이', english: '7. Solving quadratic equations' },
  81: { korean: '8. 이차방정식 활용', english: '8. Using quadratic equations' },
  82: {
    korean: '9. 이차함수 표준형의 그래프',
    english: '9. Graph of the standard form of a quadratic function',
  },
  83: {
    korean: '10. 이차함수 일반형의 그래프',
    english: '10. Graph of the general form of a quadratic function',
  },

  // ========================================
  // Middle School Grade 3 - Semester 2
  // ========================================
  84: { korean: '1. 삼각비', english: '1. Trigonometric ratios' },
  85: { korean: '2. 삼각비의 활용', english: '2. Application of trigonometric functions' },
  86: { korean: '3. 원과 직선', english: '3. Circles and lines' },
  87: { korean: '4. 원주각(1)', english: '4. Central angle (1)' },
  88: { korean: '5. 원주각(2)', english: '5. Circular angle (2)' },
  89: { korean: '6. 원주각의 활용', english: '6. Utilization of central angles' },
  90: { korean: '7. 대푯값과 산포도', english: '7. Representative values and scatter plots' },
  91: { korean: '8. 상관관계', english: '8. Correlation' },
};

/**
 * Get unit name by ID
 */
export function getUnitName(unitId: number): string {
  return UNIT_NAMES[unitId]?.korean || `Unit ${unitId}`;
}

/**
 * Get unit English name by ID
 */
export function getUnitEnglishName(unitId: number): string {
  return UNIT_NAMES[unitId]?.english || `Unit ${unitId}`;
}

/**
 * Get both Korean and English names
 */
export function getUnitInfo(unitId: number): UnitInfo | null {
  return UNIT_NAMES[unitId] || null;
}

/**
 * Get all unit IDs
 */
export function getAllUnitIds(): number[] {
  return Object.keys(UNIT_NAMES)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Check if unit ID exists
 */
export function isValidUnitId(unitId: number): boolean {
  return unitId in UNIT_NAMES;
}

/**
 * Get units by grade level
 */
export function getUnitsByGrade(grade: string): number[] {
  // Rough mapping based on unit IDs
  const ranges: { [key: string]: [number, number] } = {
    E4: [1, 12], // Elementary 4: units 1-12
    E5: [13, 24], // Elementary 5: units 13-24
    E6: [25, 36], // Elementary 6: units 25-36
    M1: [37, 56], // Middle School 1: units 37-56
    M2: [57, 73], // Middle School 2: units 57-73
    M3: [74, 91], // Middle School 3: units 74-91
  };

  const [start, end] = ranges[grade] || [0, 0];
  if (start === 0) return [];

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
