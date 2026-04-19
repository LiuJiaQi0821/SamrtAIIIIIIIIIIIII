import { Router } from 'express';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = Router();

// 初始化存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
});

// 文件上传API
router.post('/api/upload', async (req, res) => {
  try {
    if (!req.body || !req.body.fileContent || !req.body.fileName || !req.body.contentType) {
      res.status(400).json({ error: 'Missing required fields: fileContent, fileName, contentType' });
      return;
    }

    const { fileContent, fileName, contentType } = req.body;

    // 检查文件内容是否为空
    if (!fileContent || fileContent.trim() === '') {
      res.status(400).json({ error: 'Empty file content' });
      return;
    }

    // 验证文件名，替换特殊字符（包括空格、中文等）
    const validFileName = fileName.replace(/[\s\u4e00-\u9fa5]/g, '_').replace(/[^\w.\-]/g, '_');
    
    // 默认 contentType 处理
    const validContentType = contentType || 'application/octet-stream';
    
    // 上传文件
    const key = await storage.uploadFile({
      fileContent: Buffer.from(fileContent, 'base64'),
      fileName: `chat-files/${validFileName}`,
      contentType: validContentType,
    });

    // 生成签名URL
    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 7, // 7天有效期
    });

    res.json({
      success: true,
      key,
      url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
