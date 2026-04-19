import { Router } from 'express';
import { S3Storage, FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

// 初始化存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
});

// 解析文档API
router.post('/api/parse-document', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    // 尝试使用 FetchClient 解析文档
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    try {
      const response = await client.fetch(url);

      if (response.status_code === 0) {
        // 成功提取到文本内容
        const textContent = response.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
          .trim();

        res.json({
          success: true,
          title: response.title,
          content: textContent,
          url: response.url,
        });
        return;
      }
    } catch (fetchError) {
      console.log('FetchClient failed, trying to read file directly');
    }

    // 如果 FetchClient 失败，尝试直接读取文件
    // 从 URL 中提取 key (去掉签名参数)
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // 跳过存储桶名称，获取 key
    const key = pathParts.slice(3).join('/').split('?')[0];

    if (key) {
      try {
        const fileBuffer = await storage.readFile({ fileKey: key });
        const content = fileBuffer.toString('utf-8');
        
        res.json({
          success: true,
          title: '',
          content: content,
          url: url,
        });
        return;
      } catch (readError) {
        console.error('Read file error:', readError);
      }
    }

    // 两种方式都失败
    res.json({
      success: false,
      content: '',
      error: 'Unable to extract document content'
    });
  } catch (error) {
    console.error('Parse document error:', error);
    res.status(500).json({ error: 'Failed to parse document' });
  }
});

export default router;
