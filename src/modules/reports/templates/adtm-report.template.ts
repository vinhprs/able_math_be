import { AdtmReportData } from '../interfaces/report-data.interface';

export class AdtmReportTemplate {
  static generate(data: AdtmReportData): string {
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
  <title>A-DTM Test Report - ${data.student.name}</title>
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
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #7c3aed;
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
      color: #5b21b6;
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
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
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
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 20px;
      color: #5b21b6;
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
    
    .sections-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    
    .section-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #7c3aed;
    }
    
    .section-card h3 {
      color: #5b21b6;
      font-size: 16px;
      margin-bottom: 10px;
    }
    
    .section-score {
      font-size: 32px;
      font-weight: bold;
      color: #7c3aed;
      margin: 10px 0;
    }
    
    .section-details {
      font-size: 14px;
      color: #666;
      margin-top: 10px;
    }
    
    .section-details div {
      margin: 5px 0;
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
      color: #5b21b6;
    }
    
    table tr:hover {
      background: #f8fafc;
    }
    
    .recommendations {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .recommendations h3 {
      color: #92400e;
      margin-bottom: 15px;
    }
    
    .recommendations ul {
      list-style: none;
      padding: 0;
    }
    
    .recommendations li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    
    .recommendations li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
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
      <h1>A-DTM Test Report</h1>
      <div class="subtitle">Entrance Level Diagnostic Test Results</div>
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
          <span class="info-label">Test Level</span>
          <span class="info-value">Level ${data.test.level}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Test Date</span>
          <span class="info-value">${testDate}</span>
        </div>
      </div>
    </div>
    
    <div class="score-summary">
      <h2>Overall Standard Score</h2>
      <div class="score-main">${data.overallScore.toFixed(1)}%</div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Section Performance</h2>
      <div class="chart-container">
        <img src="{{sectionBarChart}}" alt="Section Performance Chart" />
      </div>
      <div class="sections-grid">
        ${data.sections
          .map(
            (section) => `
        <div class="section-card">
          <h3>Section ${section.number}: ${section.name}</h3>
          <div class="section-score">${section.standardScore.toFixed(1)}%</div>
          <div class="section-details">
            <div>Raw Score: ${section.rawScore}/${section.maxScore}</div>
            ${section.correctCount !== undefined
              ? `<div>Correct: ${section.correctCount} | Mistake: ${section.mistakeCount || 0} | Unsolved: ${section.unsolvedCount || 0}</div>`
              : ''}
          </div>
          ${section.unitScores && section.unitScores.length > 0
            ? `
          <table style="margin-top: 15px; font-size: 12px;">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Score</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              ${section.unitScores
                .map(
                  (unit) => `
              <tr>
                <td>${unit.unitName}</td>
                <td>${unit.rawScore}/${unit.maxScore}</td>
                <td>${unit.standardScore.toFixed(1)}%</td>
              </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>
          `
            : ''}
        </div>
        `,
          )
          .join('')}
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Unit Balance Analysis</h2>
      <div class="chart-container">
        <img src="{{unitRadarChart}}" alt="Unit Balance Chart" />
      </div>
    </div>
    
    <div class="recommendations">
      <h3>Recommendations</h3>
      <ul>
        ${data.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
      </ul>
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

