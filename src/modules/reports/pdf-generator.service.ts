import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AchievementReportData, AdtmReportData } from './interfaces/report-data.interface';
import { AchievementReportTemplate } from './templates/achievement-report.template';
import { AdtmReportTemplate } from './templates/adtm-report.template';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly pdfStoragePath: string;

  constructor() {
    // Set PDF storage path (create if doesn't exist)
    this.pdfStoragePath = path.join(process.cwd(), 'storage', 'pdfs');
    // Initialize directory asynchronously (will be created on first use if needed)
    this.ensureStorageDirectory().catch((error) => {
      this.logger.warn(`Failed to create PDF storage directory: ${error.message}`);
    });
  }

  /**
   * Generate PDF from report data
   * @param reportData - Report data (Achievement or A-DTM)
   * @param type - Report type
   * @returns URL/path to generated PDF
   */
  async generatePdf(
    reportData: AchievementReportData | AdtmReportData,
    type: 'ACHIEVEMENT' | 'ADTM',
  ): Promise<string> {
    this.logger.log(`Generating PDF for ${type} report`);

    try {
      // Generate HTML content
      const html =
        type === 'ACHIEVEMENT'
          ? AchievementReportTemplate.generate(reportData as AchievementReportData)
          : AdtmReportTemplate.generate(reportData as AdtmReportData);

      // Generate chart images (base64 encoded)
      const chartImages = await this.generateChartImages(reportData, type);

      // Replace chart placeholders with actual images
      let finalHtml = html;
      for (const [key, imageData] of Object.entries(chartImages)) {
        finalHtml = finalHtml.replace(`{{${key}}}`, imageData);
      }

      // Launch browser
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set content
      await page.setContent(finalHtml, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const submissionId =
        type === 'ACHIEVEMENT'
          ? (reportData as AchievementReportData).test.code
          : (reportData as AdtmReportData).test.testCode || 'adtm';

      const fileName = `${type.toLowerCase()}_${submissionId}_${Date.now()}.pdf`;
      const filePath = path.join(this.pdfStoragePath, fileName);

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      await browser.close();

      this.logger.log(`PDF generated: ${filePath}`);

      // Return relative path or URL
      return `/api/reports/pdf/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate chart images as base64 data URLs
   */
  private async generateChartImages(
    reportData: AchievementReportData | AdtmReportData,
    type: 'ACHIEVEMENT' | 'ADTM',
  ): Promise<Record<string, string>> {
    const images: Record<string, string> = {};

    if (type === 'ACHIEVEMENT') {
      const data = reportData as AchievementReportData;
      // For now, return placeholder. In production, use a chart library like Chart.js
      // to render charts and convert to images
      images['unitBarChart'] = await this.renderChartToBase64(data.charts.unitBar);
      images['difficultyPieChart'] = await this.renderChartToBase64(data.charts.difficultyPie);
    } else {
      const data = reportData as AdtmReportData;
      images['sectionBarChart'] = await this.renderChartToBase64(data.charts.sectionBar);
      images['unitRadarChart'] = await this.renderChartToBase64(data.charts.unitRadar);
    }

    return images;
  }

  /**
   * Render chart to base64 image
   * This is a simplified version. In production, use a proper chart rendering library
   */
  private async renderChartToBase64(chartData: any): Promise<string> {
    // Placeholder implementation
    // In production, you would:
    // 1. Use Chart.js or similar library
    // 2. Render chart to canvas
    // 3. Convert canvas to base64 image
    // For now, return a placeholder SVG

    const svg = this.generateSimpleChartSvg(chartData);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Generate simple SVG chart (placeholder)
   * In production, use a proper chart library
   */
  private generateSimpleChartSvg(chartData: any): string {
    const width = 600;
    const height = 400;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxValue = Math.max(...chartData.datasets[0].data, 100);
    const barWidth = chartData.type === 'bar' ? chartWidth / chartData.labels.length - 10 : 0;

    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    svgContent += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

    if (chartData.type === 'bar') {
      // Simple bar chart
      chartData.labels.forEach((label: string, index: number) => {
        const value = chartData.datasets[0].data[index];
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * (chartWidth / chartData.labels.length);
        const y = height - padding - barHeight;

        svgContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="rgba(54, 162, 235, 0.6)"/>`;
        svgContent += `<text x="${x + barWidth / 2}" y="${height - padding + 15}" font-size="10" text-anchor="middle">${label}</text>`;
        svgContent += `<text x="${x + barWidth / 2}" y="${y - 5}" font-size="10" text-anchor="middle">${value.toFixed(1)}%</text>`;
      });
    } else if (chartData.type === 'pie') {
      // Simple pie chart
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
      let currentAngle = -Math.PI / 2;

      const total = chartData.datasets[0].data.reduce((sum: number, val: number) => sum + val, 0);

      chartData.labels.forEach((label: string, index: number) => {
        const value = chartData.datasets[0].data[index];
        const sliceAngle = (value / total) * 2 * Math.PI;

        const x1 = centerX + radius * Math.cos(currentAngle);
        const y1 = centerY + radius * Math.sin(currentAngle);
        const x2 = centerX + radius * Math.cos(currentAngle + sliceAngle);
        const y2 = centerY + radius * Math.sin(currentAngle + sliceAngle);

        const largeArc = sliceAngle > Math.PI ? 1 : 0;

        svgContent += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="rgba(75, 192, 192, 0.6)" stroke="#fff" stroke-width="2"/>`;

        // Label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + radius * 0.7 * Math.cos(labelAngle);
        const labelY = centerY + radius * 0.7 * Math.sin(labelAngle);
        svgContent += `<text x="${labelX}" y="${labelY}" font-size="12" text-anchor="middle" fill="#333">${label}</text>`;

        currentAngle += sliceAngle;
      });
    } else if (chartData.type === 'radar') {
      // Simple radar chart (simplified as bar chart for now)
      chartData.labels.forEach((label: string, index: number) => {
        const value = chartData.datasets[0].data[index];
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * (chartWidth / chartData.labels.length);
        const y = height - padding - barHeight;

        svgContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="rgba(153, 102, 255, 0.6)"/>`;
        svgContent += `<text x="${x + barWidth / 2}" y="${height - padding + 15}" font-size="10" text-anchor="middle">${label}</text>`;
      });
    }

    svgContent += `</svg>`;
    return svgContent;
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.pdfStoragePath);
    } catch {
      await fs.mkdir(this.pdfStoragePath, { recursive: true });
      this.logger.log(`Created PDF storage directory: ${this.pdfStoragePath}`);
    }
  }

  /**
   * Get PDF file path
   */
  getPdfPath(fileName: string): string {
    return path.join(this.pdfStoragePath, fileName);
  }
}
