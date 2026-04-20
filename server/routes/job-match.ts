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
    
    // 记录用户原始的筛选条件，用于后续提示
    const originalFilters: string[] = [];
    if (expectations.industry) originalFilters.push(`行业: ${expectations.industry}`);
    if (expectations.jobType) originalFilters.push(`岗位类型: ${expectations.jobType}`);
    if (expectations.city) originalFilters.push(`城市: ${expectations.city}`);
    if (expectations.salary) originalFilters.push(`薪资: ${expectations.salary}`);
    if (expectations.other) originalFilters.push(`其他要求: ${expectations.other}`);
    
    console.log('用户原始筛选条件:', originalFilters);
    
    // 智能放宽策略 - 确保至少找到5个岗位
    // 按照优先级排序：先放宽影响最小的条件
    const relaxOrder = [
      { key: 'other', label: '其他要求', filterKey: null },
      { key: 'salary', label: '薪资', filterKey: null },
      { key: 'city', label: '城市', filterKey: 'location' },
      { key: 'jobType', label: '岗位类型', filterKey: 'keyword' },
      { key: 'industry', label: '行业', filterKey: 'industry' }
    ];
    
    let matchedJobs: any[] = [];
    let finalDroppedConditions: string[] = [];
    let currentFilters = {
      industry: expectations.industry,
      keyword: expectations.jobType,
      location: expectations.city
    };
    let currentDropped: string[] = [];
    
    console.log('开始智能放宽策略，目标：至少找到5个岗位');
    console.log('初始条件:', currentFilters);
    
    // 第一轮：用所有条件搜索
    let searchFilters: Record<string, string> = {};
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value) searchFilters[key] = value;
    });
    
    console.log('第1轮搜索（使用所有条件）:', searchFilters);
    
    const firstResponse = await fetch('http://localhost:5000/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchFilters)
    });
    
    const firstData = await firstResponse.json();
    let jobs = firstData.jobs || [];
    
    if (jobs.length >= 5) {
      matchedJobs = jobs.slice(0, 5);
      finalDroppedConditions = [];
      console.log(`✅ 第1轮成功，找到 ${jobs.length} 个岗位`);
    } else {
      console.log(`⚠️ 第1轮只找到 ${jobs.length} 个岗位，开始逐步放宽条件`);
      
      // 逐步放宽条件
      for (let i = 0; i < relaxOrder.length; i++) {
        const relaxItem = relaxOrder[i];
        
        // 跳过没有filterKey的项（薪资和其他要求本来就没在搜索条件里）
        if (!relaxItem.filterKey) {
          currentDropped.push(relaxItem.label);
          continue;
        }
        
        // 放宽这个条件
        console.log(`🔄 第${i + 2}轮：放宽条件 - 去掉${relaxItem.label}`);
        delete (currentFilters as any)[relaxItem.filterKey];
        currentDropped.push(relaxItem.label);
        
        // 构建新的搜索条件
        searchFilters = {};
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value) searchFilters[key] = value;
        });
        
        console.log('当前搜索条件:', searchFilters);
        console.log('已放宽条件:', currentDropped);
        
        // 搜索
        const response = await fetch('http://localhost:5000/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchFilters)
        });
        
        const data = await response.json();
        jobs = data.jobs || [];
        
        console.log(`本轮找到 ${jobs.length} 个岗位`);
        
        // 如果找到足够的岗位，就停止
        if (jobs.length >= 5) {
          matchedJobs = jobs.slice(0, 5);
          finalDroppedConditions = [...currentDropped];
          console.log(`✅ 成功！找到 ${jobs.length} 个岗位，已放宽条件:`, finalDroppedConditions);
          break;
        }
      }
      
      // 如果所有条件都放宽了还是不够5个，就用现有的，或者获取推荐岗位
      if (matchedJobs.length === 0) {
        console.log('⚠️ 所有条件都放宽了，尝试获取推荐岗位');
        
        // 获取一些推荐岗位（不设任何条件）
        const allResponse = await fetch('http://localhost:5000/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        const allData = await allResponse.json();
        const allJobs = allData.jobs || [];
        
        if (allJobs.length > 0) {
          // 如果有岗位，取前5个
          matchedJobs = allJobs.slice(0, 5);
          finalDroppedConditions = ['行业', '岗位类型', '城市', '其他要求', '薪资'];
          console.log(`🎯 使用推荐岗位: ${matchedJobs.length} 个`);
        } else {
          console.log('❌ 没有找到任何岗位');
        }
      }
    }
    
    // 构建提示信息
    let friendlyMessage = '';
    if (matchedJobs.length === 0) {
      friendlyMessage = '抱歉，暂时没有找到合适的岗位。请稍后再试或调整您的期望条件。';
    } else if (finalDroppedConditions.length === 0) {
      friendlyMessage = `岗位匹配分析已完成！为您找到了${matchedJobs.length}个最匹配的岗位，请查看左侧卡片了解详细分析结果。`;
    } else if (finalDroppedConditions.length < 5) {
      friendlyMessage = `为了给您找到${matchedJobs.length}个合适的岗位，我们放宽了以下条件：${finalDroppedConditions.join('、')}。以下是基于您的学生画像推荐的岗位，请查看左侧卡片！`;
    } else {
      friendlyMessage = `根据您的具体条件没有找到足够的匹配岗位。我们已基于您的简历背景为您推荐了${matchedJobs.length}个岗位，放宽了条件：${finalDroppedConditions.join('、')}。请查看左侧卡片！`;
    }
    
    console.log('最终匹配岗位数:', matchedJobs.length);
    console.log('最终提示语:', friendlyMessage);
    
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
      
      const analysisPrompt = `请进行人岗匹配度分析，严格按照以下要求输出：

【学生画像】
${profileSummary}

【匹配岗位】
${jobsSummary}

【输出要求 - 必须严格遵守】
1. 只输出JSON格式的匹配分析结果 + 一句友好提示语
2. **严禁**输出任何表格、Markdown格式的岗位列表
3. **严禁**输出"### 岗位匹配结果"、"| 岗位名称 |..."这类内容
4. **严禁**输出任何额外的解释说明文字

请为每个岗位从以下四个维度进行详细分析和打分：

## 评分原则 - 请仔细阅读
1. **鼓励为主**：即使不是100%完美匹配，只要有相关经验和技能，就给予较高分数
2. **看重潜力**：应届生或经验较少的候选人，看重学习能力和潜力
3. **相关即可**：技能和经验相关即可，不需要完全一致
4. **转移价值**：过往经验即使不是完全匹配，也有转移价值

## 评分维度说明
1. **基础要求匹配** (权重自适应): 学历、专业、工作年限等岗位硬性要求
   - 学历相近、专业相关即可给高分
   - 工作经验不足但有相关实习/项目经验也给高分
2. **职业技能匹配** (权重自适应): 技术栈、工具、证书等专业技能
   - 技能相关即可，不需要完全一致
   - 有同类工具使用经验可给高分
3. **职业素养匹配** (权重自适应): 沟通能力、抗压能力、团队协作等软技能
   - 从简历描述中推断，只要有相关经历就给高分
4. **发展潜力匹配** (权重自适应): 学习能力、创新能力、领导力等发展潜力
   - 应届生这一项权重可以提高，看重学习能力和潜力

## 权重自适应规则
- 如果岗位对技术要求高，职业技能匹配权重增加
- 如果岗位对经验要求高，基础要求匹配权重增加
- 如果岗位是管理岗，职业素养和发展潜力权重增加
- 如果是应届生或经验较少，发展潜力权重增加
- 四个维度权重总和必须为100%

## 打分标准（0-100分）
每个维度单独打分，然后计算加权总分。
- 80-100分：非常匹配，强烈推荐
- 60-79分：比较匹配，可以推荐
- 40-59分：一般匹配，需要考量
- 0-39分：不太匹配

**注意**：我们放宽了条件为用户找到的岗位，请尽量给合理的分数，鼓励用户！

## 输出格式要求
请使用JSON格式输出，格式如下：
\`\`\`json
{
  "matches": [
    {
      "job_title": "岗位名称",
      "company": "公司名",
      "salary": "薪资",
      "location": "地点",
      "industry": "行业",
      "overall_score": 85,
      "match_percentage": "85%",
      "dimensions": {
        "basic_requirements": {
          "score": 80,
          "weight": 25,
          "analysis": "基础要求分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        },
        "professional_skills": {
          "score": 90,
          "weight": 35,
          "analysis": "职业技能分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        },
        "professional_quality": {
          "score": 85,
          "weight": 20,
          "analysis": "职业素养分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        },
        "development_potential": {
          "score": 88,
          "weight": 20,
          "analysis": "发展潜力分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        }
      },
      "key_strengths": ["核心优势1", "核心优势2", "核心优势3"],
      "key_gaps": ["关键差距1", "关键差距2"],
      "suggestions": "改进建议..."
    }
  ]
}
\`\`\`

注意：
- 每个维度必须包含 strengths（优势项）和 gaps（差距项）
- key_gaps 中的差距项需要在前端高亮显示
- 权重必须根据岗位特点自适应调整
- overall_score 是加权总分：(basic_score×basic_weight + skill_score×skill_weight + quality_score×quality_weight + potential_score×potential_weight) / 100
- **不要输出任何友好提示语，只输出JSON代码块**
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
          
          // 提取友好提示语 - 使用我们自定义的 friendlyMessage
          const messageMatch = aiResponse.replace(/```json[\s\S]*?```/g, '').trim();
          
          // 保存分析结果到localStorage（通过前端完成，后端只返回数据）
          res.json({
            success: true,
            message: friendlyMessage,  // 使用我们自定义的友好提示语
            analysis: matchAnalysis,
            jobs: matchedJobs
          });
          return;
          
        }
      } catch (aiError) {
        console.error('AI分析失败:', aiError);
      }
    }
    
    // 如果没有AI分析结果，返回基本信息（使用我们的friendlyMessage）
    res.json({
      success: true,
      message: friendlyMessage,
      jobs: matchedJobs
    });
    
  } catch (error) {
    console.error('人岗匹配分析失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
