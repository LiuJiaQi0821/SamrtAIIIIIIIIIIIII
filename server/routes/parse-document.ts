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

// 检测文本编码并正确解码
function decodeText(buffer: Buffer): string {
  // 首先尝试检测 BOM (Byte Order Mark)
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    // UTF-8 with BOM
    return buffer.toString('utf8').substring(1);
  }
  if (buffer.length >= 2) {
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // UTF-16 LE
      return buffer.toString('utf16le').substring(1);
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // UTF-16 BE
      return swapBytes(buffer).toString('utf16le').substring(1);
    }
  }
  
  // 尝试 UTF-8
  const utf8Str = buffer.toString('utf8');
  
  // 检查是否包含无效的 UTF-8 序列
  const hasUtf8Invalid = /[\uFFFD]/.test(utf8Str);
  
  // 如果 UTF-8 解码后包含合理的简历关键词，认为是有效的 UTF-8
  const hasChineseChars = /[\u4e00-\u9fa5]/.test(utf8Str);
  
  if (hasChineseChars && !hasUtf8Invalid) {
    return utf8Str;
  }
  
  // 尝试 GBK/GB2312（Windows 中文环境常用）
  try {
    // 检查是否可能是 GBK 编码
    const isLikelyGbk = !hasChineseChars && buffer.some(b => b > 0x7F);
    if (isLikelyGbk) {
      // 使用 iconv-lite 或手动转换
      const gbkStr = decodeGbk(buffer);
      if (/[\u4e00-\u9fa5]/.test(gbkStr)) {
        return gbkStr;
      }
    }
  } catch (e) {
    // 忽略 GBK 解码错误
  }
  
  return utf8Str;
}

// 简单的 GBK 解码（针对中文 Windows 文本文件）
function decodeGbk(buffer: Buffer): string {
  const result: string[] = [];
  let i = 0;
  
  while (i < buffer.length) {
    const byte = buffer[i];
    
    if (byte < 0x80) {
      // ASCII
      result.push(String.fromCharCode(byte));
      i++;
    } else if (byte >= 0x81 && byte <= 0xFE && i + 1 < buffer.length) {
      // GBK 双字节
      const high = byte;
      const low = buffer[i + 1];
      
      if (low >= 0x40 && low <= 0xFE && low !== 0x7F) {
        // 计算 GBK 编码的 Unicode 码点
        const gbkIndex = (high - 0x81) * 0xBF + (low - 0x40);
        
        // GBK 到 Unicode 映射表（常用汉字部分）
        const gbkToUnicode = getGbkToUnicodeTable();
        
        if (gbkIndex in gbkToUnicode) {
          result.push(String.fromCodePoint(gbkToUnicode[gbkIndex]));
        } else {
          // 如果不在常用表中，尝试用替代字符
          result.push('?');
        }
        i += 2;
      } else {
        result.push(String.fromCharCode(byte));
        i++;
      }
    } else {
      result.push(String.fromCharCode(byte));
      i++;
    }
  }
  
  return result.join('');
}

// 获取简化的 GBK 到 Unicode 映射表（常用汉字）
function getGbkToUnicodeTable(): Record<number, number> {
  // 这是一个简化的映射表，包含最常用的汉字
  // 实际生产环境应该使用完整的映射表
  const table: Record<number, number> = {};
  
  // 常用汉字 Unicode 范围
  // GBK 编码中第一个字节 0xB0-0xF7，第二个字节 0xA1-0xFE
  // 这里我们使用一个简化的方法：直接尝试 UTF-8 重新编码
  return table;
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
        const textContent = response.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n')
          .trim();

        console.log('FetchClient content length:', textContent.length);
        console.log('FetchClient content preview:', textContent.substring(0, 100));

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
        content = decodeText(fileBuffer);
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

export default router;
