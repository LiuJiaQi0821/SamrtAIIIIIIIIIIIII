import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const router = Router();

// 生成职业规划报告
router.post('/api/career-report', async (req, res) => {
  try {
    const { profile, matchedJobs, userExpectations } = req.body;
    
    console.log('📄 开始生成职业规划报告...');
    console.log('学生画像:', profile ? '有' : '无');
    console.log('匹配岗位数:', matchedJobs?.length || 0);
    
    // TODO: 后续会填充完整的职业规划报告内容
    // 目前返回空状态的结构
    
    const reportData = {
      id: 'report_' + Date.now(),
      generatedAt: new Date().toISOString(),
      studentInfo: {
        name: profile?.basic_info?.name || '未知',
        education: profile?.education?.education_level || '未知',
        major: profile?.education?.major || '未知',
        school: profile?.education?.school || '未知'
      },
      summary: '',  // TODO: 填充报告摘要
      sections: [],   // TODO: 填充各章节内容
      careerPath: [], // TODO: 填充职业发展路径
      recommendations: [], // TODO: 填充具体建议
      matchedJobs: matchedJobs || [],
      status: 'empty' // 标记为空状态
    };
    
    console.log('✅ 职业规划报告生成完成（空状态）');
    
    res.json({
      success: true,
      report: reportData,
      message: '职业规划报告已生成'
    });
    
  } catch (error) {
    console.error('生成职业规划报告失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '生成职业规划报告失败' 
    });
  }
});

// 导出职业规划报告（不同格式）
router.post('/api/career-report/export', async (req, res) => {
  try {
    const { format, reportData } = req.body;
    
    console.log(`📥 导出职业规划报告，格式: ${format}`);
    
    let buffer: Buffer;
    let contentType = '';
    let filename = '';
    
    switch (format) {
      case 'markdown':
        buffer = Buffer.from(generateMarkdownReport(reportData), 'utf-8');
        contentType = 'text/markdown; charset=utf-8';
        filename = `职业规划报告_${reportData.studentInfo?.name || '用户'}_${formatDate()}.md`;
        break;
        
      case 'pdf':
        buffer = await generatePDFReport(reportData);
        contentType = 'application/pdf';
        filename = `职业规划报告_${reportData.studentInfo?.name || '用户'}_${formatDate()}.pdf`;
        break;
        
      case 'word':
        buffer = await generateWordReport(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `职业规划报告_${reportData.studentInfo?.name || '用户'}_${formatDate()}.docx`;
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: '不支持的格式' 
        });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
    
    console.log(`✅ ${format.toUpperCase()}格式报告导出成功`);
    
  } catch (error) {
    console.error('导出职业规划报告失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '导出失败' 
    });
  }
});

// 格式化日期
function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

// ========== Markdown格式生成 ==========
function generateMarkdownReport(reportData: any): string {
  if (!reportData) return '';
  
  const lines = [
    '# 职业规划报告',
    '',
    `**生成时间**: ${new Date(reportData.generatedAt).toLocaleString('zh-CN')}`,
    '',
    '---',
    '',
    '## 学生基本信息',
    '',
    `- **姓名**: ${reportData.studentInfo?.name || '未知'}`,
    `- **学历**: ${reportData.studentInfo?.education || '未知'}`,
    `- **专业**: ${reportData.studentInfo?.major || '未知'}`,
    `- **学校**: ${reportData.studentInfo?.school || '未知'}`,
    '',
    '---',
    '',
    '> 📌 **提示**: 报告详细内容将在后续版本中补充完整。',
    '',
    '*本报告由小职引职业规划助手自动生成*'
  ];
  
  return lines.join('\n');
}

// ========== PDF格式生成 ==========
async function generatePDFReport(reportData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: '职业规划报告',
          Author: '小职引职业规划助手',
          Subject: `${reportData.studentInfo?.name || '用户'}的职业规划报告`,
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 注册中文字体（使用文泉驿微米黑）
      doc.registerFont('ChineseFont', '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc');

      // 设置字体
      doc.font('ChineseFont').fontSize(24);

      // 标题
      doc.fillColor('#2c3e50')
         .text('职业规划报告', { align: 'center' })
         .moveDown(0.5);

      // 分隔线
      doc.moveTo(60, doc.y)
         .lineTo(535, doc.y)
         .strokeColor('#3498db')
         .lineWidth(2)
         .stroke()
         .moveDown(1);

      // 基本信息
      doc.fontSize(16).fillColor('#2980b9').text('基本信息', { continued: false }).moveDown(0.5);
      
      doc.fontSize(12).fillColor('#333333');
      doc.text(`姓名：${reportData.studentInfo?.name || '未知'}`, { indent: 20 });
      doc.text(`学历：${reportData.studentInfo?.education || '未知'}`, { indent: 20 });
      doc.text(`专业：${reportData.studentInfo?.major || '未知'}`, { indent: 20 });
      doc.text(`学校：${reportData.studentInfo?.school || '未知'}`, { indent: 20 });
      doc.moveDown(1);

      // 生成时间
      doc.fontSize(10).fillColor('#7f8c8d')
         .text(`生成时间：${new Date(reportData.generatedAt).toLocaleString('zh-CN')}`, { align: 'right' })
         .moveDown(1);

      // 提示信息框
      const boxY = doc.y;
      doc.rect(60, boxY, 475, 80)
         .fill('#ecf0f1')
         .stroke();
      
      doc.fontSize(11).fillColor('#7f8c8d')
         .text('📌 提示：报告详细内容将在后续版本中补充完整。', 80, boxY + 15, { width: 435 });
      doc.text('本报告由小职引职业规划助手自动生成', 80, boxY + 40, { width: 435 });

      // 页脚
      doc.fontSize(9).fillColor('#95a5a6')
         .text('小职引职业规划助手 - 您的专业职业规划伙伴', 60, 750, { 
           align: 'center', 
           width: 475 
         });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// ========== Word格式生成 ==========
async function generateWordReport(reportData: any): Promise<Buffer> {
  const doc = new Document({
    creator: '小职引职业规划助手',
    title: '职业规划报告',
    description: `${reportData.studentInfo?.name || '用户'}的职业规划报告`,
    sections: [{
      properties: {},
      children: [
        // 标题
        new Paragraph({
          children: [
            new TextRun({
              text: '职业规划报告',
              bold: true,
              size: 48,
              color: '2c3e50',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // 分隔线效果（用段落模拟）
        new Paragraph({
          children: [
            new TextRun({
              text: '━'.repeat(40),
              color: '3498db',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // 基本信息标题
        new Paragraph({
          children: [
            new TextRun({
              text: '基本信息',
              bold: true,
              size: 28,
              color: '2980b9',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),

        // 基本信息内容
        new Paragraph({
          children: [
            new TextRun({ text: '姓名：', bold: true }),
            new TextRun({ text: reportData.studentInfo?.name || '未知' }),
          ],
          spacing: { after: 100 },
          indent: { left: 720 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: '学历：', bold: true }),
            new TextRun({ text: reportData.studentInfo?.education || '未知' }),
          ],
          spacing: { after: 100 },
          indent: { left: 720 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: '专业：', bold: true }),
            new TextRun({ text: reportData.studentInfo?.major || '未知' }),
          ],
          spacing: { after: 100 },
          indent: { left: 720 },
        }),

        new Paragraph({
          children: [
            new TextRun({ text: '学校：', bold: true }),
            new TextRun({ text: reportData.studentInfo?.school || '未知' }),
          ],
          spacing: { after: 200 },
          indent: { left: 720 },
        }),

        // 生成时间
        new Paragraph({
          children: [
            new TextRun({
              text: `生成时间：${new Date(reportData.generatedAt).toLocaleString('zh-CN')}`,
              size: 20,
              color: '7f8c8d',
              italics: true,
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 },
        }),

        // 提示信息
        new Paragraph({
          children: [
            new TextRun({
              text: '📌 提示：报告详细内容将在后续版本中补充完整。',
              size: 22,
              color: '7f8c8d',
            }),
          ],
          spacing: { before: 200, after: 100 },
          shading: { fill: 'ecf0f1' },
        }),

        // 页脚
        new Paragraph({
          children: [
            new TextRun({
              text: '小职引职业规划助手 - 您的专业职业规划伙伴',
              size: 18,
              color: '95a5a6',
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export default router;
