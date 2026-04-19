import { Router } from 'express';
import { S3Storage, FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import pdfParse from 'pdf-parse';

const router = Router();

// 初始化存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
});

// 解析PDF文件内容
async function parsePdfContent(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error) {
    console.error('PDF parse error:', error);
    return '';
  }
}

// 从URL中提取文件key
function extractFileKey(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // 路径格式: /bucket-name/path/to/file.txt?signature=xxx
    const pathParts = urlObj.pathname.split('/');
    // 跳过存储桶名称，获取 key
    if (pathParts.length < 4) {
      console.error('Invalid URL path:', urlObj.pathname);
      return null;
    }
    const key = pathParts.slice(3).join('/').split('?')[0];
    console.log('Extracted key:', key, 'from URL:', url);
    return key;
  } catch (error) {
    console.error('Extract key error:', error);
    return null;
  }
}

// 判断文件类型
function getFileType(filename: string): 'pdf' | 'txt' | 'doc' | 'unknown' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.txt') || lower.endsWith('.text')) return 'txt';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'doc';
  return 'unknown';
}

// 解析文档API
router.post('/api/parse-document', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    console.log('=== Parse document request ===');
    console.log('URL:', url);

    // 首先尝试使用 FetchClient 解析文档（支持多种格式）
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    try {
      const response = await client.fetch(url);
      console.log('FetchClient response status:', response.status_code);

      if (response.status_code === 0) {
        // 成功提取到文本内容
        const textContent = response.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
          .trim();

        console.log('FetchClient extracted content length:', textContent.length);

        res.json({
          success: true,
          title: response.title,
          content: textContent,
          url: response.url,
        });
        return;
      }
    } catch (fetchError) {
      console.log('FetchClient failed, trying direct file read:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
    }

    // 如果 FetchClient 失败，尝试直接读取并解析文件
    const key = extractFileKey(url);

    if (key) {
      try {
        console.log('Reading file from storage with key:', key);
        const fileBuffer = await storage.readFile({ fileKey: key });
        console.log('File buffer size:', fileBuffer.length, 'bytes');

        // 根据文件扩展名判断文件类型
        const fileType = getFileType(key);
        let content = '';
        
        switch (fileType) {
          case 'pdf':
            console.log('Parsing as PDF...');
            content = await parsePdfContent(fileBuffer);
            break;
          case 'txt':
            console.log('Parsing as TXT...');
            // 尝试多种编码
            content = fileBuffer.toString('utf-8');
            // 如果内容为空或全是乱码，尝试其他编码
            if (!content || content.trim().length === 0) {
              console.log('UTF-8 failed, trying GBK...');
              try {
                content = fileBuffer.toString('gbk');
              } catch {
                console.log('GBK failed, trying UTF-16...');
                content = fileBuffer.toString('utf16le');
              }
            }
            break;
          case 'doc':
            console.log('Word document parsing not supported yet');
            res.json({
              success: false,
              content: '',
              error: 'Word document parsing is not supported yet. Please convert to PDF or TXT format.'
            });
            return;
          default:
            console.log('Unknown file type, treating as text...');
            // 尝试作为文本读取
            content = fileBuffer.toString('utf-8');
        }

        console.log('Extracted content length:', content.length);
        console.log('Content preview:', content.substring(0, 200));

        if (content && content.trim().length > 0) {
          res.json({
            success: true,
            title: '',
            content: content,
            url: url,
          });
          return;
        } else {
          // 内容为空或解析失败
          res.json({
            success: false,
            content: '',
            error: 'Unable to extract document content. File may be empty, encrypted, or in an unsupported format.'
          });
          return;
        }
      } catch (readError) {
        console.error('Read file error:', readError);
        res.json({
          success: false,
          content: '',
          error: 'Failed to read file from storage: ' + (readError instanceof Error ? readError.message : 'Unknown error')
        });
        return;
      }
    }

    // 无法提取key
    res.json({
      success: false,
      content: '',
      error: 'Unable to extract file key from URL'
    });
  } catch (error) {
    console.error('Parse document error:', error);
    res.status(500).json({ error: 'Failed to parse document: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
});

export default router;
