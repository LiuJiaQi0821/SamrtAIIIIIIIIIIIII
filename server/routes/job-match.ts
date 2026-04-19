import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const router = Router();

// 加载环境变量
function loadEnv(): void {
  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // Silently fail
  }
}

// 初始化Supabase客户端
loadEnv();

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';

// 延迟创建supabase客户端
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'Content-Type': 'application/json'
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabase;
}

// 人岗匹配分析API
router.post('/api/job-match', async (req, res) => {
  try {
    const { expectations, profile } = req.body;
    
    console.log('开始人岗匹配分析...');
    console.log('职业期望:', expectations);
    console.log('学生画像:', profile ? Object.keys(profile) : '无');
    
    const db = getSupabaseClient();
    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未配置' });
    }
    
    // 1. 先搜索符合条件的岗位
    let searchFilters: Record<string, string> = {};
    
    if (expectations.industry) {
      searchFilters.industry = expectations.industry;
    }
    if (expectations.jobType) {
      searchFilters.keyword = expectations.jobType;
    }
    if (expectations.city) {
      searchFilters.location = expectations.city;
    }
    
    console.log('岗位搜索条件:', searchFilters);
    
    // 调用岗位搜索API
    const searchResponse = await fetch('http://localhost:5000/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchFilters)
    });
    
    const searchData = await searchResponse.json();
    const matchedJobs = searchData.jobs?.slice(0, 5) || [];  // 取前5个岗位
    
    console.log(`找到 ${matchedJobs.length} 个匹配岗位`);
    
    // 2. 调用AI进行匹配度分析
    let matchAnalysis = null;
    if (matchedJobs.length > 0) {
      // 构建AI分析提示词
      const jobsSummary = matchedJobs.map((job: any, idx: number) => `
岗位${idx + 1}:
- 岗位名称: ${job.title}
- 公司: ${job.company}
- 薪资: ${job.salary}
- 地点: ${job.location}
- 行业: ${job.industry}
- 描述: ${job.description?.substring(0, 200) || '无'}
`).join('\n');
      
      const profileSummary = JSON.stringify(profile, null, 2);
      
      const analysisPrompt = `请进行人岗匹配度分析，输出以下内容：

【学生画像】
${profileSummary}

【匹配岗位】
${jobsSummary}

请为每个岗位分析：
1. 人岗匹配度（0-100分）
2. 专业技能契合度分析
3. 通用素质契合度分析
4. 差距与建议

请使用JSON格式输出，格式如下：
\`\`\`json
{
  "matches": [
    {
      "job_title": "岗位名称",
      "company": "公司名",
      "overall_score": 85,
      "skill_match": {
        "score": 80,
        "analysis": "专业技能分析..."
      },
      "quality_match": {
        "score": 90,
        "analysis": "通用素质分析..."
      },
      "gaps": "差距分析...",
      "suggestions": "建议..."
    }
  ]
}
\`\`\`

然后输出一句友好的提示语（单独一行，不含JSON）：
"岗位匹配分析已完成！请查看左侧卡片了解详细的匹配度分析结果。"
`;

      try {
        const chatResponse = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: analysisPrompt }]
          })
        });
        
        if (chatResponse.ok) {
          const reader = chatResponse.body?.getReader();
          const decoder = new TextDecoder();
          let aiResponse = '';
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') break;
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      aiResponse += parsed.content;
                    }
                  } catch {
                    // 忽略解析错误
                  }
                }
              }
            }
          }
          
          // 提取JSON分析结果
          const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              matchAnalysis = JSON.parse(jsonMatch[1]);
              console.log('匹配分析完成:', Object.keys(matchAnalysis));
            } catch {
              console.error('解析匹配分析JSON失败');
            }
          }
          
          // 提取友好提示语
          const messageMatch = aiResponse.replace(/```json[\s\S]*?```/g, '').trim();
          const friendlyMessage = messageMatch || '岗位匹配分析已完成！请查看左侧卡片了解详细结果。';
          
          // 保存分析结果到localStorage（通过前端完成，后端只返回数据）
          res.json({
            success: true,
            message: friendlyMessage,
            analysis: matchAnalysis,
            jobs: matchedJobs
          });
          return;
          
        }
      } catch (aiError) {
        console.error('AI分析失败:', aiError);
      }
    }
    
    // 如果没有AI分析结果，返回基本信息
    res.json({
      success: true,
      message: matchedJobs.length > 0 
        ? `已为您找到 ${matchedJobs.length} 个相关岗位！`
        : '暂未找到完全匹配的岗位，建议调整筛选条件。',
      jobs: matchedJobs
    });
    
  } catch (error) {
    console.error('人岗匹配分析失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
