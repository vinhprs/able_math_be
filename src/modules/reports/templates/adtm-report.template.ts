import { AdtmReportData } from '../interfaces/report-data.interface';

export class AdtmReportTemplate {
  static generate(data: AdtmReportData): string {
    const testDate = new Date(data.test.testDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Calculate totals
    const totalRawScore = data.sections.reduce((sum, s) => sum + s.rawScore, 0);
    const totalMaxScore = data.sections.reduce((sum, s) => sum + s.maxScore, 0);

    // Helper functions
    const getCategory = (score: number) => {
      if (score >= 80) return '상';
      if (score >= 60) return '중';
      return '하';
    };

    const getEvaluation = (score: number) => {
      if (score >= 80) return '상';
      if (score >= 60) return '중';
      return '하';
    };

    const getScoreBadgeColor = (score: number) => {
      if (score >= 80) return '#10b981'; // green-500
      if (score >= 60) return '#f97316'; // orange-500
      return '#ef4444'; // red-500
    };

    // Expected scores (placeholder - should come from backend)
    const expectedScores = [80, 65, 55, 40, 0];

    // Chart data for page 1
    const chartData = [
      {
        name: 'Calculation\nAbility',
        value: data.sections[0]?.standardScore || 0,
        color: 'rgba(59, 130, 246, 0.8)',
      },
      {
        name: 'Conceptual\nUnderstanding',
        value: data.sections[1]?.standardScore || 0,
        color: 'rgba(6, 182, 212, 0.8)',
      },
      {
        name: 'Conceptual\nApplication',
        value: data.sections[2]?.standardScore || 0,
        color: 'rgba(156, 163, 175, 0.8)',
      },
      {
        name: 'Reasoning\nAbility',
        value: data.sections[3]?.standardScore || 0,
        color: 'rgba(229, 231, 235, 0.8)',
      },
      {
        name: 'Problem-Solving\nAbility',
        value: data.sections[4]?.standardScore || 0,
        color: 'rgba(229, 231, 235, 0.8)',
      },
      {
        name: 'Mathematics\nLearning Competency',
        value: data.overallScore,
        color: 'rgba(234, 179, 8, 0.8)',
      },
    ];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A-DTM Test Report - ${data.student.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      color: #1f2937;
      line-height: 1.5;
      background: white;
    }
    
    .page {
      min-height: 100vh;
      padding: 32px;
      page-break-after: always;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Header Styles */
    .report-header {
      display: flex;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid #000;
    }
    
    .logo-able {
      color: #dc2626;
      font-size: 36px;
      font-weight: bold;
      margin-right: 16px;
    }
    
    .logo-text {
      font-size: 12px;
      line-height: 1.4;
    }
    
    .logo-title {
      font-size: 64px;
      font-family: 'Times New Roman', serif;
      font-weight: bold;
      margin-left: 32px;
    }
    
    /* Section Descriptions */
    .section-box {
      border: 1px solid #d1d5db;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .section-box-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    
    .section-box-text {
      font-size: 12px;
    }
    
    /* Table Styles */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin: 16px 0;
    }
    
    table th,
    table td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: center;
    }
    
    table th {
      background-color: #f9fafb;
      font-weight: 600;
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      color: white;
      font-weight: bold;
      font-size: 10px;
    }
    
    .bg-yellow-50 {
      background-color: #fefce8;
    }
    
    .bg-gray-50 {
      background-color: #f9fafb;
    }
    
    .bg-orange-50 {
      background-color: #fff7ed;
    }
    
    .bg-blue-50 {
      background-color: #eff6ff;
    }
    
    .bg-green-50 {
      background-color: #f0fdf4;
    }
    
    /* Two Column Layout */
    .two-column {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-top: 24px;
    }
    
    .left-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    /* Section Number Badge */
    .section-number {
      width: 32px;
      height: 32px;
      background-color: #dc2626;
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      margin-right: 8px;
    }
    
    /* Scoring Guide Box */
    .scoring-guide {
      border: 2px solid #f97316;
      background-color: #fff7ed;
      padding: 16px;
      border-radius: 4px;
    }
    
    .scoring-guide-icon {
      width: 24px;
      height: 24px;
      background-color: #f97316;
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      margin-right: 8px;
    }
    
    .scoring-guide-title {
      font-weight: bold;
      margin-bottom: 12px;
    }
    
    .scoring-guide-item {
      margin-bottom: 8px;
      font-size: 11px;
    }
    
    /* Notes */
    .notes {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 11px;
    }
    
    .note-number {
      width: 16px;
      height: 16px;
      background-color: #dc2626;
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      margin-right: 4px;
    }
    
    @media print {
      body {
        background: white;
      }
      
      .page {
        padding: 20mm;
      }
    }
  </style>
</head>
<body>
  <!-- PAGE 1: REPORT COVER -->
  <div class="page">
    <!-- Header -->
    <div class="report-header">
      <div class="logo-able">able</div>
      <div class="logo-text">
        <div>Diagnostic</div>
        <div>Test of</div>
        <div>Mathematics</div>
      </div>
      <div class="logo-title">Report</div>
    </div>
    
    <!-- Introductory text -->
    <div style="margin-bottom: 32px; font-size: 12px; line-height: 1.6;">
      <p style="margin-bottom: 16px;">
        This report is designed to help students identify their mathematical
        strengths and areas for improvement. The assessment evaluates five key
        competencies that are essential for mathematical proficiency and
        problem-solving skills.
      </p>
      <p style="margin-bottom: 16px;">
        The scores in this report represent the student's performance across
        different mathematical domains. By analyzing these results, educators
        and parents can provide targeted support to enhance the student's
        mathematical abilities and build a strong foundation for future
        learning.
      </p>
      <p>
        This report is divided into two sections: first, a summary of scores
        by mathematical competency area, and second, a detailed analysis that
        identifies specific strengths and weaknesses to guide personalized
        instruction and practice.
      </p>
    </div>
    
    <!-- Section Descriptions -->
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">
        1. Overall Summary by Section
      </h2>
      
      <div class="section-box">
        <div class="section-box-title">SECTION 1 - Calculation Ability</div>
        <div class="section-box-text">
          Assesses computational skills including arithmetic operations,
          mental math, and calculation accuracy. Measures speed and precision
          in mathematical computations.
        </div>
      </div>
      
      <div class="section-box">
        <div class="section-box-title">SECTION 2 - Conceptual Understanding</div>
        <div class="section-box-text">
          Evaluates understanding of fundamental mathematical concepts
          including numbers, operations, shapes, and patterns. Tests the
          ability to explain and apply basic principles.
        </div>
      </div>
      
      <div class="section-box">
        <div class="section-box-title">SECTION 3 - Conceptual Application</div>
        <div class="section-box-text">
          Measures the ability to apply mathematical concepts to various
          situations and contexts. Assesses flexibility in using
          mathematical knowledge across different problem types.
        </div>
      </div>
      
      <div class="section-box">
        <div class="section-box-title">SECTION 4 - Reasoning Ability</div>
        <div class="section-box-text">
          Tests logical thinking, pattern recognition, and deductive
          reasoning skills. Evaluates the ability to analyze relationships
          and draw mathematical conclusions.
        </div>
      </div>
      
      <div class="section-box">
        <div class="section-box-title">SECTION 5 - Problem Solving Ability</div>
        <div class="section-box-text">
          Assesses complex problem-solving skills including multi-step
          problems, real-world applications, and critical thinking. Measures
          creativity and strategic thinking in mathematics.
        </div>
      </div>
    </div>
    
    <!-- Overall Evaluation Chart -->
    <div>
      <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
        2. Overall Evaluation - [${data.test.testCode || `A-DTM Level ${data.test.level}`}]
      </h2>
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
        [Student Name: ${data.student.name}]
      </div>
      <div style="font-size: 12px; margin-bottom: 16px;">
        Test Score: Overall Mathematics Learning Evaluation
      </div>
      
      <!-- Chart placeholder - will be replaced with actual chart image -->
      <div style="height: 300px; width: 100%; background: #f9fafb; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center; color: #6b7280;">
          <div style="font-size: 14px; margin-bottom: 8px;">Overall Evaluation Chart</div>
          <div style="font-size: 12px;">Chart will be rendered here</div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- PAGE 2: ANALYSIS -->
  <div class="page">
    <!-- Header -->
    <div class="report-header">
      <div class="logo-able">able</div>
      <div class="logo-text">
        <div>Diagnostic</div>
        <div>Test of</div>
        <div>Mathematics</div>
      </div>
      <div class="logo-title">Analysis</div>
    </div>
    
    <div class="two-column">
      <!-- LEFT COLUMN -->
      <div class="left-column">
        <!-- 1. Score by Section Table -->
        <div style="border: 1px solid #d1d5db; padding: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span class="section-number">1</span>
            <h3 style="font-weight: bold; font-size: 14px;">Overall Score</h3>
            <span style="margin-left: auto; font-size: 11px; color: #6b7280;">Score by Section</span>
          </div>
          
          <table>
            <thead>
              <tr>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Section</th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Full<br/>Score</th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Obtained<br/>Score</th>
                <th colspan="2" style="text-align: center; color: #dc2626;">
                  Change the test to "${data.test.testCode || 'E3-M'}"
                </th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Category</th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Evaluation</th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Condition</th>
              </tr>
              <tr>
                <th style="text-align: center;">Standard-<br/>ized Score</th>
                <th style="text-align: center;">Expected<br/>Score</th>
              </tr>
            </thead>
            <tbody>
              ${data.sections
                .map((section, idx) => {
                  const category = getCategory(section.standardScore);
                  const evaluation = getEvaluation(section.standardScore);
                  const badgeColor = getScoreBadgeColor(section.standardScore);
                  const isSection4Or5 = idx >= 3;
                  const displayFullScore = isSection4Or5 ? 40 : 100;
                  const condition = idx < 3 ? idx + 3 : idx === 3 ? 2 : 1;

                  return `
                <tr>
                  <td style="text-align: left;">${idx + 1}. ${section.name}</td>
                  <td style="text-align: center; ${isSection4Or5 ? 'background-color: #fefce8;' : ''}">${displayFullScore}</td>
                  <td style="text-align: center;">${section.rawScore}</td>
                  <td style="text-align: center;">
                    <span class="badge" style="background-color: ${badgeColor};">
                      ${section.standardScore.toFixed(0)}
                    </span>
                  </td>
                  <td style="text-align: center;">${expectedScores[idx] || 0}</td>
                  <td style="text-align: center;">${category}</td>
                  <td style="text-align: center;">${evaluation}</td>
                  <td style="text-align: center;">${condition}</td>
                </tr>
              `;
                })
                .join('')}
              <tr class="bg-gray-50" style="font-weight: bold; background-color: #f9fafb;">
                <td style="text-align: left;">Overall Math Learning</td>
                <td style="text-align: center; background-color: #fefce8;">380</td>
                <td style="text-align: center;">${totalRawScore}</td>
                <td style="text-align: center;">
                  <span class="badge" style="background-color: #ef4444;">
                    ${data.overallScore.toFixed(0)}
                  </span>
                </td>
                <td style="text-align: center;">48</td>
                <td style="text-align: center;">하</td>
                <td style="text-align: center;">3</td>
                <td style="text-align: center;">2</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Notes -->
          <div class="notes">
            <div style="display: flex; align-items: start;">
              <span class="note-number">1</span>
              <span style="color: #6b7280;">Change the test to "${data.test.testCode || 'E3-M'}"</span>
            </div>
            <div style="display: flex; align-items: start;">
              <span class="note-number">2</span>
              <span style="color: #6b7280;">Full score for each section = 100 points</span>
            </div>
          </div>
          
          <!-- Legend -->
          <div style="margin-top: 8px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px;">
            <span style="font-weight: 600;">High / Medium / Low</span>
          </div>
        </div>
        
        <!-- 2. Score by Unit Table (if available) -->
        ${
          data.sections[1]?.unitScores && data.sections[1].unitScores.length > 0
            ? `
        <div style="border: 1px solid #d1d5db; padding: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span class="section-number">2</span>
            <h3 style="font-weight: bold; font-size: 14px;">Score by Unit</h3>
            <span style="margin-left: auto; font-size: 11px; color: #6b7280;">Score by Unit</span>
          </div>
          
          <table>
            <thead style="background-color: #f9fafb;">
              <tr>
                <th style="text-align: left;">Unit</th>
                <th style="text-align: center;">Full Score</th>
                <th style="text-align: center;">Obtained Score</th>
                <th style="text-align: center;">Standardized Score</th>
                <th style="text-align: center;">Category</th>
              </tr>
            </thead>
            <tbody>
              ${data.sections[1].unitScores
                .map((unit, idx) => {
                  const badgeColor = getScoreBadgeColor(unit.standardScore);
                  return `
                <tr>
                  <td style="text-align: left;">${idx + 1}. ${unit.unitName}</td>
                  <td style="text-align: center;">${unit.maxScore.toFixed(2)}</td>
                  <td style="text-align: center;">${unit.rawScore.toFixed(2)}</td>
                  <td style="text-align: center;">
                    <span class="badge" style="background-color: ${badgeColor};">
                      ${unit.standardScore.toFixed(0)}
                    </span>
                  </td>
                  <td style="text-align: center;">${getCategory(unit.standardScore)}</td>
                </tr>
              `;
                })
                .join('')}
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td style="text-align: left;">합계 Sum</td>
                <td style="text-align: center;">${data.sections[1].unitScores.reduce((sum, u) => sum + u.maxScore, 0).toFixed(0)}</td>
                <td style="text-align: center;">${data.sections[1].unitScores.reduce((sum, u) => sum + u.rawScore, 0).toFixed(0)}</td>
                <td style="text-align: center;">
                  <span class="badge" style="background-color: #ef4444;">
                    ${((data.sections[1].unitScores.reduce((sum, u) => sum + u.rawScore, 0) / data.sections[1].unitScores.reduce((sum, u) => sum + u.maxScore, 0)) * 100).toFixed(0)}
                  </span>
                </td>
                <td style="text-align: center;">${getCategory((data.sections[1].unitScores.reduce((sum, u) => sum + u.rawScore, 0) / data.sections[1].unitScores.reduce((sum, u) => sum + u.maxScore, 0)) * 100)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        `
            : ''
        }
        
        <!-- 3. Calculation Ability Breakdown (if section 1 exists) -->
        ${
          data.sections[0]
            ? `
        <div style="border: 1px solid #d1d5db; padding: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span class="section-number">3</span>
            <h3 style="font-weight: bold; font-size: 14px;">Calculation Ability Score</h3>
          </div>
          
          <table>
            <thead style="background-color: #f3f4f6;">
              <tr>
                <th style="text-align: left;">Category</th>
                <th style="text-align: center;">Count</th>
                <th style="text-align: center;">Points</th>
                <th style="text-align: center;">%</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #fff7ed;">
                <td style="text-align: left;">실수를 (Correct)</td>
                <td style="text-align: center;">${data.sections[0].correctCount || 0}</td>
                <td style="text-align: center;">90</td>
                <td style="text-align: center;">
                  <span class="badge" style="background-color: #eab308;">
                    ${data.sections[0].correctCount ? Math.round((data.sections[0].correctCount / ((data.sections[0].correctCount || 0) + (data.sections[0].mistakeCount || 0) + (data.sections[0].unsolvedCount || 0))) * 100) : 0}
                  </span>
                </td>
              </tr>
              <tr style="background-color: #eff6ff;">
                <td style="text-align: left;">정확도 (Wrong)</td>
                <td style="text-align: center;">${data.sections[0].mistakeCount || 0}</td>
                <td style="text-align: center;">73</td>
                <td style="text-align: center;">
                  <span class="badge" style="background-color: #3b82f6;">
                    ${data.sections[0].mistakeCount ? Math.round((data.sections[0].mistakeCount / ((data.sections[0].correctCount || 0) + (data.sections[0].mistakeCount || 0) + (data.sections[0].unsolvedCount || 0))) * 100) : 0}
                  </span>
                </td>
              </tr>
              <tr style="background-color: #f0fdf4;">
                <td style="text-align: left;">속도 (Blank)</td>
                <td style="text-align: center;">${data.sections[0].unsolvedCount || 0}</td>
                <td style="text-align: center;">100</td>
                <td style="text-align: center;">
                  <span class="badge" style="background-color: #10b981;">
                    ${data.sections[0].unsolvedCount ? Math.round((data.sections[0].unsolvedCount / ((data.sections[0].correctCount || 0) + (data.sections[0].mistakeCount || 0) + (data.sections[0].unsolvedCount || 0))) * 100) : 0}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        `
            : ''
        }
      </div>
      
      <!-- RIGHT COLUMN -->
      <div class="right-column">
        <!-- Scoring Guide Box -->
        <div class="scoring-guide">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <span class="scoring-guide-icon">i</span>
            <div class="scoring-guide-title">Scoring Guide</div>
          </div>
          <div class="scoring-guide-item">
            <strong>1. Score by Domain:</strong> The full score for each section is fixed at 100 points, and the combined total will differ.
          </div>
          <div class="scoring-guide-item">
            <strong>2. Score Items:</strong> "Score" and "Standardized Score" items are based on a 100-point full score, so the scores and standardized score will be the same, with only the overall evaluation differing.
          </div>
          <div class="scoring-guide-item">
            <strong>3. Score-Based Evaluation:</strong>
            <ul style="margin-left: 16px; margin-top: 4px;">
              <li>high (상-89): 80 points or higher → Green</li>
              <li>medium (중 60-79): 60 points or higher → Orange</li>
              <li>low (하 &lt;59): Below 60 points → Red</li>
            </ul>
          </div>
        </div>
        
        <!-- Domain Scores Chart placeholder -->
        <div style="border: 1px solid #d1d5db; padding: 16px;">
          <h3 style="font-weight: bold; font-size: 14px; margin-bottom: 12px;">Domain Scores</h3>
          <div style="height: 200px; background: #f9fafb; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; color: #6b7280; font-size: 12px;">
              Domain Scores Chart
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
