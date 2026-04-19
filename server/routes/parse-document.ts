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

// 从URL中提取文件路径
function extractFilePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // 优先从 file_path 参数提取（代理接口格式）
    const filePath = urlObj.searchParams.get('file_path');
    if (filePath) {
      console.log('Extracted file_path param:', filePath);
      return decodeURIComponent(filePath);
    }
    
    // 否则从路径中提取
    const pathParts = urlObj.pathname.split('/');
    if (pathParts.length < 4) {
      console.error('Invalid URL path:', urlObj.pathname);
      return null;
    }
    const key = pathParts.slice(3).join('/').split('?')[0];
    console.log('Extracted key from path:', key);
    return key;
  } catch (error) {
    console.error('Extract path error:', error);
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

// 直接从代理URL下载文件内容
async function downloadFromProxy(url: string): Promise<Buffer | null> {
  try {
    console.log('Downloading from proxy URL...');
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Proxy fetch failed:', response.status, response.statusText);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log('Downloaded size:', arrayBuffer.byteLength, 'bytes');
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Proxy download error:', error);
    return null;
  }
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

    // 从URL中提取文件路径
    const filePath = extractFilePath(url);
    if (!filePath) {
      res.json({
        success: false,
        content: '',
        error: 'Unable to extract file path from URL'
      });
      return;
    }

    // 首先尝试使用 FetchClient 解析文档（支持多种格式）
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    try {
      console.log('Trying FetchClient...');
      const response = await client.fetch(url);

      if (response.status_code === 0) {
        // 成功提取到文本内容
        const textContent = response.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
          .trim();

        console.log('FetchClient extracted content length:', textContent.length);

        if (textContent && textContent.trim().length > 0) {
          res.json({
            success: true,
            title: response.title,
            content: textContent,
            url: response.url,
          });
          return;
        }
      }
    } catch (fetchError) {
      console.log('FetchClient failed:', fetchError instanceof Error ? fetchError.message : 'Unknown error');
    }

    // 如果 FetchClient 失败，尝试直接从代理URL下载
    const fileBuffer = await downloadFromProxy(url);
    
    if (fileBuffer && fileBuffer.length > 0) {
      // 根据文件扩展名判断文件类型
      const fileType = getFileType(filePath);
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
          // 检查是否是有效的文本
          if (!content || content.trim().length === 0) {
            console.log('UTF-8 result empty, trying GBK...');
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
          content = fileBuffer.toString('utf-8');
      }

      console.log('Extracted content length:', content.length);
      console.log('Content preview:', content.substring(0, 300));

      if (content && content.trim().length > 0) {
        res.json({
          success: true,
          title: '',
          content: content,
          url: url,
        });
        return;
      }
    }

    // 无法获取内容
    res.json({
      success: false,
      content: '',
      error: 'Unable to extract document content. The file may be empty or in an unsupported format.'
    });
  } catch (error) {
    console.error('Parse document error:', error);
    res.status(500).json({ error: 'Failed to parse document: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
});

export default router;
