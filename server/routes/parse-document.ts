import { Router } from 'express';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { Buffer } from 'buffer';

const router = Router();

// 判断文件类型
function getFileType(filename: string): 'pdf' | 'txt' | 'doc' | 'unknown' {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.txt') || lower.endsWith('.text')) return 'txt';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'doc';
  return 'unknown';
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
    
    // 从路径中提取
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

// 检测并修复编码
function decodeWithDetection(data: Buffer): string {
  const content = data.toString('binary');
  const bytes: number[] = [];
  
  for (let i = 0; i < content.length; i++) {
    bytes.push(content.charCodeAt(i) & 0xFF);
  }
  
  const buf = Buffer.from(bytes);
  
  // 尝试多种编码
  const encodings = ['utf-8', 'gbk', 'gb2312', 'utf-16le', 'latin1'];
  
  for (const enc of encodings) {
    try {
      const decoded = buf.toString(enc);
      // 检查是否包含有效的中文字符
      if (/[\u4e00-\u9fa5]/.test(decoded)) {
        console.log('Decoded with:', enc);
        return decoded;
      }
    } catch (e) {
      // 忽略
    }
  }
  
  // 如果都没找到中文，返回原始内容
  return buf.toString('utf-8');
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

    // 提取文件路径
    const filePath = extractFilePath(url);
    if (!filePath) {
      res.json({ success: false, error: 'Unable to extract file path' });
      return;
    }

    console.log('File path:', filePath);
    const fileType = getFileType(filePath);
    console.log('File type:', fileType);

    // 对于文本文件，直接使用 fetch 下载
    if (fileType === 'txt') {
      try {
        console.log('Downloading text file directly...');
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('Download failed:', response.status);
          res.json({ success: false, error: 'Failed to download file' });
          return;
        }

        // 获取原始二进制数据
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('Downloaded buffer size:', buffer.length);
        
        // 检测编码并解码
        const content = decodeWithDetection(buffer);
        
        console.log('Decoded content length:', content.length);
        console.log('Decoded preview:', content.substring(0, 100));

        // 检查是否有有效内容
        if (content && content.trim().length > 0 && /[\u4e00-\u9fa5]/.test(content)) {
          const jsonResponse = {
            success: true,
            title: filePath,
            content: content,
            url: url,
          };
          
          // 使用 Buffer 确保 UTF-8 编码正确
          const buffer = Buffer.from(JSON.stringify(jsonResponse), 'utf8');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Length', buffer.length.toString());
          res.end(buffer);
          return;
        } else {
          console.log('No Chinese chars found in content');
        }
      } catch (fetchError) {
        console.error('Direct download error:', fetchError);
      }
    }

    // 对于其他文件类型，使用 FetchClient
    console.log('Trying FetchClient...');
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
        console.log('FetchClient preview:', textContent.substring(0, 100));

        if (textContent && textContent.trim().length > 0 && /[\u4e00-\u9fa5]/.test(textContent)) {
          const jsonResponse = {
            success: true,
            title: response.title || '',
            content: textContent,
            url: response.url || url,
          };
          
          // 使用 Buffer 确保 UTF-8 编码正确
          const buffer = Buffer.from(JSON.stringify(jsonResponse), 'utf8');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Length', buffer.length.toString());
          res.end(buffer);
          return;
        }
      }
    } catch (fetchError) {
      console.error('FetchClient error:', fetchError);
    }

    // 所有方法都失败
    res.json({
      success: false,
      error: 'Unable to extract content from file'
    });
  } catch (error) {
    console.error('Parse document error:', error);
    res.status(500).json({ error: 'Failed to parse document' });
  }
});

export default router;
