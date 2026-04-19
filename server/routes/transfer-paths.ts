import { Router } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Supabase 客户端（延迟初始化）
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    loadEnv();
    const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
    const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase not configured: COZE_SUPABASE_URL and COZE_SUPABASE_SERVICE_ROLE_KEY are required');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// 获取所有换岗路径图谱
router.get('/api/transfer-paths', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('job_transfer_graph')
      .select(`
        id,
        from_job_id,
        to_job_id,
        path_type,
        intermediate_job_id,
        transfer_difficulty,
        steps_required,
        additional_skills,
        additional_certificates,
        transfer_conditions,
        salary_impact,
        transfer_tips,
        blood_relationship,
        is_recommended,
        from_job:job_profiles!from_job_id(id, profile_name, category),
        to_job:job_profiles!to_job_id(id, profile_name, category),
        intermediate_job:job_profiles!intermediate_job_id(id, profile_name, category)
      `)
      .order('from_job_id');

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error('获取换岗路径失败:', err);
    res.status(500).json({ success: false, error: '获取换岗路径失败' });
  }
});

// 根据岗位获取换岗路径
router.get('/api/transfer-paths/:jobId', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { jobId } = req.params;

    const { data, error } = await supabase
      .from('job_transfer_graph')
      .select(`
        id,
        from_job_id,
        to_job_id,
        path_type,
        intermediate_job_id,
        transfer_difficulty,
        steps_required,
        additional_skills,
        additional_certificates,
        transfer_conditions,
        salary_impact,
        transfer_tips,
        blood_relationship,
        is_recommended,
        from_job:job_profiles!from_job_id(id, profile_name, category),
        to_job:job_profiles!to_job_id(id, profile_name, category),
        intermediate_job:job_profiles!intermediate_job_id(id, profile_name, category)
      `)
      .eq('from_job_id', jobId)
      .order('is_recommended', { ascending: false })
      .order('steps_required');

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error('获取换岗路径失败:', err);
    res.status(500).json({ success: false, error: '获取换岗路径失败' });
  }
});

// 获取换岗路径统计
router.get('/api/transfer-paths/stats/summary', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    // 获取每个起点岗位的路径统计
    const { data: statsData, error: statsError } = await supabase
      .from('job_transfer_graph')
      .select(`
        from_job_id,
        is_recommended,
        path_type,
        from_job:job_profiles!from_job_id(id, profile_name, category)
      `);

    if (statsError) throw statsError;

    // 统计
    const stats = statsData.reduce((acc: Record<string, unknown>, item: Record<string, unknown>) => {
      const jobName = (item.from_job as Record<string, unknown>)?.profile_name || 'Unknown';
      if (!acc[jobName]) {
        acc[jobName] = {
          job_name: jobName,
          category: (item.from_job as Record<string, unknown>)?.category,
          total_paths: 0,
          recommended_paths: 0,
          direct_paths: 0,
          multi_step_paths: 0
        };
      }
      (acc[jobName] as Record<string, number>).total_paths++;
      if (item.is_recommended) (acc[jobName] as Record<string, number>).recommended_paths++;
      if (item.path_type === 'direct') (acc[jobName] as Record<string, number>).direct_paths++;
      if (item.path_type === 'through') (acc[jobName] as Record<string, number>).multi_step_paths++;
      return acc;
    }, {} as Record<string, unknown>);

    const statsList = Object.values(stats);

    // 获取总体统计
    const { count: totalPaths } = await supabase
      .from('job_transfer_graph')
      .select('*', { count: 'exact', head: true });

    const { count: recommendedPaths } = await supabase
      .from('job_transfer_graph')
      .select('*', { count: 'exact', head: true })
      .eq('is_recommended', true);

    res.json({
      success: true,
      data: {
        summary: {
          total_paths: totalPaths,
          recommended_paths: recommendedPaths,
          job_count: statsList.length
        },
        by_job: statsList
      }
    });
  } catch (err) {
    console.error('获取换岗路径统计失败:', err);
    res.status(500).json({ success: false, error: '获取换岗路径统计失败' });
  }
});

// 获取血缘关系图谱
router.get('/api/transfer-paths/graph/:jobId', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const { jobId } = req.params;

    // 获取该岗位作为起点的路径
    const { data: outPaths, error: outError } = await supabase
      .from('job_transfer_graph')
      .select(`
        id,
        from_job_id,
        to_job_id,
        path_type,
        intermediate_job_id,
        transfer_difficulty,
        steps_required,
        salary_impact,
        blood_relationship,
        is_recommended,
        from_job:job_profiles!from_job_id(id, profile_name, category),
        to_job:job_profiles!to_job_id(id, profile_name, category),
        intermediate_job:job_profiles!intermediate_job_id(id, profile_name, category)
      `)
      .eq('from_job_id', jobId);

    if (outError) throw outError;

    // 获取该岗位作为终点的路径（反向路径）
    const { data: inPaths, error: inError } = await supabase
      .from('job_transfer_graph')
      .select(`
        id,
        from_job_id,
        to_job_id,
        path_type,
        intermediate_job_id,
        transfer_difficulty,
        steps_required,
        salary_impact,
        blood_relationship,
        is_recommended,
        from_job:job_profiles!from_job_id(id, profile_name, category),
        to_job:job_profiles!to_job_id(id, profile_name, category),
        intermediate_job:job_profiles!intermediate_job_id(id, profile_name, category)
      `)
      .eq('to_job_id', jobId);

    if (inError) throw inError;

    res.json({
      success: true,
      data: {
        current_job: outPaths[0]?.from_job || inPaths[0]?.to_job,
        outgoing_paths: outPaths,
        incoming_paths: inPaths
      }
    });
  } catch (err) {
    console.error('获取血缘关系图谱失败:', err);
    res.status(500).json({ success: false, error: '获取血缘关系图谱失败' });
  }
});

export default router;
