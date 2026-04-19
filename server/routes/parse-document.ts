import { Router } from 'express';
import { S3Storage, FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import pdfParse from 'pdf-parse';
import { Buffer } from 'buffer';

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
      return decodeURIComponent(filePath);
    }
    
    // 否则从路径中提取
    const pathParts = urlObj.pathname.split('/');
    if (pathParts.length < 4) {
      return null;
    }
    return pathParts.slice(3).join('/').split('?')[0];
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

// 修复双重编码问题
function fixUtf8DoubleEncoding(text: string): string {
  const hasDoubleEncoding = /[\u00e3\u00c3\u00a0-\u00ff\u0080-\u00ff]/.test(text);
  
  console.log('fixUtf8DoubleEncoding - hasDoubleEncoding:', hasDoubleEncoding);
  
  if (!hasDoubleEncoding) {
    return text;
  }
  
  try {
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      if (charCode > 127) {
        bytes.push(charCode & 0xFF);
      } else {
        bytes.push(charCode);
      }
    }
    
    console.log('Bytes array length:', bytes.length);
    const buffer = Buffer.from(bytes);
    console.log('Buffer length:', buffer.length);
    const fixed = buffer.toString('utf-8');
    console.log('Fixed string length:', fixed.length, 'Has Chinese:', /[\u4e00-\u9fa5]/.test(fixed));
    
    if (/[\u4e00-\u9fa5]/.test(fixed)) {
      console.log('Fixed double encoding, Chinese chars found');
      return fixed;
    }
  } catch (e) {
    console.error('Fix double encoding failed:', e);
  }
  
  return text;
}

// 尝试多种编码解码
function tryMultipleEncodings(buffer: Buffer): string {
  const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'latin1'];
  
  console.log('tryMultipleEncodings - buffer length:', buffer.length);
  
  for (const enc of encodings) {
    try {
      const decoded = buffer.toString(enc);
      const hasChinese = /[\u4e00-\u9fa5]/.test(decoded);
      console.log('  Trying', enc, '- length:', decoded.length, 'hasChinese:', hasChinese);
      if (hasChinese) {
        console.log('Successfully decoded with:', enc);
        return decoded;
      }
    } catch (e) {
      console.log('  Failed with', enc);
    }
  }
  
  return buffer.toString('utf-8');
}

// 检测并修复编码问题
function fixEncoding(text: string): string {
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return text;
  }
  
  const fixed = fixUtf8DoubleEncoding(text);
  if (/[\u4e00-\u9fa5]/.test(fixed)) {
    return fixed;
  }
  
  try {
    const tempBuffer = Buffer.from(text, 'latin1');
    return tryMultipleEncodings(tempBuffer);
  } catch (e) {
    // 忽略
  }
  
  return text;
}

// 直接从代理URL下载文件内容
async function downloadFromProxy(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Proxy fetch failed:', response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Proxy download error:', error);
    return null;
  }
}

// 检测并解码文件内容
function detectAndDecode(buffer: Buffer): string {
  // 检查 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf8').substring(1);
  }
  
  // 尝试多种编码
  return tryMultipleEncodings(buffer);
}

// 手动发送 JSON 响应，确保 UTF-8 编码正确
function sendJson(res: any, data: any): void {
  const jsonString = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(jsonString, 'utf8'));
  res.send(jsonString);
}

// 解析文档API
router.post('/api/parse-document', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      sendJson(res, { error: 'URL is required' });
      return;
    }

    console.log('=== Parse document request ===');
    console.log('URL:', url);

    // 从URL中提取文件路径
    const filePath = extractFilePath(url);
    if (!filePath) {
      sendJson(res, { success: false, error: 'Unable to extract file path' });
      return;
    }

    console.log('File path:', filePath);

    // 首先尝试使用 FetchClient 解析文档
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    try {
      const response = await client.fetch(url);
      console.log('FetchClient status:', response.status_code);

      if (response.status_code === 0) {
        let textContent = response.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
          .trim();

        console.log('FetchClient raw content length:', textContent.length);
        
        // 修复编码问题
        textContent = fixEncoding(textContent);
        
        console.log('FetchClient content length after fix:', textContent.length);
        console.log('FetchClient content preview:', textContent.substring(0, 100));

        if (textContent && textContent.trim().length > 0 && /[\u4e00-\u9fa5]/.test(textContent)) {
          sendJson(res, {
            success: true,
            title: response.title || '',
            content: textContent,
            url: response.url || url,
          });
          return;
        }
      }
    } catch (fetchError) {
      console.log('FetchClient failed:', fetchError instanceof Error ? fetchError.message : 'Unknown');
    }

    // 如果 FetchClient 失败，直接下载文件
    const fileBuffer = await downloadFromProxy(url);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      sendJson(res, { success: false, error: 'Unable to download file' });
      return;
    }

    console.log('Downloaded file size:', fileBuffer.length);

    // 根据文件类型解析
    const fileType = getFileType(filePath);
    let content = '';
    
    switch (fileType) {
      case 'pdf':
        content = await parsePdfContent(fileBuffer);
        break;
      case 'txt':
      case 'unknown':
      default:
        content = detectAndDecode(fileBuffer);
        break;
    }

    console.log('Final content length:', content.length);
    console.log('Final content preview:', content.substring(0, 200));

    if (content && content.trim().length > 0) {
      sendJson(res, {
        success: true,
        title: '',
        content: content,
        url: url,
      });
    } else {
      sendJson(res, {
        success: false,
        error: 'Unable to extract content from file'
      });
    }
  } catch (error) {
    console.error('Parse document error:', error);
    sendJson(res, { error: 'Failed to parse document' });
  }
});

export default router;
