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

// 修复双重编码问题（UTF-8 字节被当作 Latin-1 解码）
function fixUtf8DoubleEncoding(text: string): string {
  // 检查是否包含可能是双重编码的字符
  // UTF-8 字符在 Latin-1 解码后会显示为特殊字符序列
  const hasDoubleEncoding = /[\u00e3\u00c3\u00a0-\u00ff]/.test(text);
  
  if (!hasDoubleEncoding) {
    return text;
  }
  
  // 将字符串的每个字符转换为字节，然后重新按 UTF-8 解码
  try {
    // 将 JavaScript 字符串（UTF-16）转换为字节数组（Latin-1 视角）
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i) & 0xFF);
    }
    
    // 将字节数组转换回 Buffer 并按 UTF-8 解码
    const buffer = Buffer.from(bytes);
    const fixed = buffer.toString('utf-8');
    
    // 检查修复后是否包含有效的中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(fixed);
    
    if (hasChinese) {
      console.log('Fixed double encoding, Chinese chars found');
      return fixed;
    }
  } catch (e) {
    console.error('Fix double encoding failed:', e);
  }
  
  return text;
}

// 检测并修复编码问题
function fixEncoding(text: string): string {
  // 首先检查是否是双重编码
  const fixed = fixUtf8DoubleEncoding(text);
  
  // 检查是否包含有效的中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(fixed);
  
  if (hasChinese) {
    return fixed;
  }
  
  // 如果没有中文，尝试其他修复方法
  // 检查是否包含乱码特征
  const hasGarbledChars = /[\uFFFD]/.test(fixed);
  const hasLatinExtended = /[\u0080-\u00FF]/.test(fixed);
  
  if (hasGarbledChars || (hasLatinExtended && !hasChinese)) {
    // 尝试将字符串按 Latin-1 解码为字节，再按 UTF-8 重新解码
    try {
      const bytes: number[] = [];
      for (let i = 0; i < text.length; i++) {
        bytes.push(text.charCodeAt(i) & 0xFF);
      }
      const buffer = Buffer.from(bytes);
      const result = buffer.toString('utf-8');
      
      if (/[\u4e00-\u9fa5]/.test(result)) {
        console.log('Applied Latin-1 -> UTF-8 fix');
        return result;
      }
    } catch (e) {
      // 忽略
    }
  }
  
  return fixed;
}

// 直接从代理URL下载文件内容
async function downloadFromProxy(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Proxy fetch failed:', response.status);
      return null;
    }
    
    // 获取原始二进制数据
    const arrayBuffer = await response.arrayBuffer();
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

    // 从URL中提取文件路径
    const filePath = extractFilePath(url);
    if (!filePath) {
      res.json({ success: false, error: 'Unable to extract file path' });
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
      console.log('FetchClient failed:', fetchError instanceof Error ? fetchError.message : 'Unknown');
    }

    // 如果 FetchClient 失败，直接下载文件
    const fileBuffer = await downloadFromProxy(url);
    
    if (!fileBuffer || fileBuffer.length === 0) {
      res.json({ success: false, error: 'Unable to download file' });
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
        // 尝试检测文件编码
        content = detectAndDecode(fileBuffer);
        break;
    }

    console.log('Final content length:', content.length);
    console.log('Final content preview:', content.substring(0, 200));

    if (content && content.trim().length > 0) {
      res.json({
        success: true,
        title: '',
        content: content,
        url: url,
      });
    } else {
      res.json({
        success: false,
        error: 'Unable to extract content from file'
      });
    }
  } catch (error) {
    console.error('Parse document error:', error);
    res.status(500).json({ error: 'Failed to parse document' });
  }
});

// 检测并解码文件内容
function detectAndDecode(buffer: Buffer): string {
  // 检查 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.toString('utf8').substring(1);
  }
  
  // 尝试 UTF-8
  const utf8 = buffer.toString('utf8');
  if (/[\u4e00-\u9fa5]/.test(utf8)) {
    return utf8;
  }
  
  // 尝试 Latin-1 -> UTF-8 修复
  const bytes: number[] = [];
  for (let i = 0; i < buffer.length; i++) {
    bytes.push(buffer[i]);
  }
  const fixed = Buffer.from(bytes).toString('utf8');
  if (/[\u4e00-\u9fa5]/.test(fixed)) {
    return fixed;
  }
  
  return utf8;
}

export default router;
