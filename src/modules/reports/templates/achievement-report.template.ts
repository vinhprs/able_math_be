import { AchievementReportData } from '../interfaces/report-data.interface';

export class AchievementReportTemplate {
  static generate(data: AchievementReportData): string {
    const testDate = new Date(data.test.testDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Achievement Test Report - ${data.student.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      color: #333;
      line-height: 1.6;
      background: #f5f5f5;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      padding: 20mm;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #2563eb;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .student-info {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .student-info h2 {
      color: #1e40af;
      font-size: 18px;
      margin-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .score-summary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
    
    .score-summary h2 {
      font-size: 20px;
      margin-bottom: 20px;
    }
    
    .score-main {
      font-size: 48px;
      font-weight: bold;
      margin: 20px 0;
    }
    
    .score-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    
    .score-item {
      background: rgba(255, 255, 255, 0.2);
      padding: 15px;
      border-radius: 8px;
    }
    
    .score-item-label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    
    .score-item-value {
      font-size: 24px;
      font-weight: bold;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 20px;
      color: #1e40af;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .chart-container {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    
    .chart-container img {
      max-width: 100%;
      height: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    table th,
    table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    table th {
      background: #f8fafc;
      font-weight: 600;
      color: #1e40af;
    }
    
    table tr:hover {
      background: #f8fafc;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .badge-correct {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge-incorrect {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    @media print {
      body {
        background: white;
      }
      
      .container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Achievement Test Report</h1>
      <div class="subtitle">Level Maintenance Test Results</div>
    </div>
    
    <div class="student-info">
      <h2>Student Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Student Name</span>
          <span class="info-value">${data.student.name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Grade</span>
          <span class="info-value">${data.student.grade}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Test Code</span>
          <span class="info-value">${data.test.code}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Test Date</span>
          <span class="info-value">${testDate}</span>
        </div>
      </div>
    </div>
    
    <div class="score-summary">
      <h2>Overall Score</h2>
      <div class="score-main">${data.scores.standardScore.toFixed(1)}%</div>
      <div class="score-details">
        <div class="score-item">
          <div class="score-item-label">Raw Score</div>
          <div class="score-item-value">${data.scores.totalRaw}/${data.scores.totalMax}</div>
        </div>
        <div class="score-item">
          <div class="score-item-label">Correct</div>
          <div class="score-item-value">${data.scores.correctCount}</div>
        </div>
        <div class="score-item">
          <div class="score-item-label">Accuracy</div>
          <div class="score-item-value">${data.scores.accuracy.toFixed(1)}%</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Performance by Unit</h2>
      <div class="chart-container">
        <img src="{{unitBarChart}}" alt="Unit Performance Chart" />
      </div>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Score</th>
            <th>Max Score</th>
            <th>Percentage</th>
            <th>Questions</th>
          </tr>
        </thead>
        <tbody>
          ${data.unitScores
            .map(
              (unit) => `
          <tr>
            <td>${unit.unitName}</td>
            <td>${unit.rawScore}</td>
            <td>${unit.maxScore}</td>
            <td>${unit.standardScore.toFixed(1)}%</td>
            <td>${unit.questionCount}</td>
          </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2 class="section-title">Performance by Difficulty</h2>
      <div class="chart-container">
        <img src="{{difficultyPieChart}}" alt="Difficulty Performance Chart" />
      </div>
      <table>
        <thead>
          <tr>
            <th>Difficulty</th>
            <th>Score</th>
            <th>Max Score</th>
            <th>Percentage</th>
            <th>Correct</th>
            <th>Incorrect</th>
          </tr>
        </thead>
        <tbody>
          ${data.difficultyScores
            .map(
              (diff) => `
          <tr>
            <td>${diff.difficulty}</td>
            <td>${diff.rawScore}</td>
            <td>${diff.maxScore}</td>
            <td>${diff.standardScore.toFixed(1)}%</td>
            <td>${diff.correctCount}</td>
            <td>${diff.incorrectCount}</td>
          </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2 class="section-title">Question Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Unit</th>
            <th>Difficulty</th>
            <th>Result</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${data.questionBreakdown
            .map(
              (q) => `
          <tr>
            <td>${q.questionNumber}</td>
            <td>${q.unitName}</td>
            <td>${q.difficulty}</td>
            <td>
              <span class="badge ${q.isCorrect ? 'badge-correct' : 'badge-incorrect'}">
                ${q.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </td>
            <td>${q.scoreEarned}/${q.maxScore}</td>
          </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>Able Math Education System</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

