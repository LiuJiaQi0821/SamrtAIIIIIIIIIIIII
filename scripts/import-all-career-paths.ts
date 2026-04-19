import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

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

loadEnv();

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 获取岗位画像ID映射
async function getProfileIdMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('job_profiles')
    .select('id, profile_name');
  
  if (error) throw error;
  
  const map = new Map<string, number>();
  for (const profile of data) {
    map.set(profile.profile_name, profile.id);
  }
  return map;
}

// 晋升路径数据
const careerPaths = [
  // C/C++ 晋升路径
  { from_name: 'C/C++', to_name: 'C/C++', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '系统架构设计、性能优化经验', additional_certificates: '系统架构设计师证书', promotion_conditions: '掌握系统级编程能力', salary_change: '30-50%' },
  { from_name: 'C/C++', to_name: 'C/C++', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '嵌入式系统、RTOS、微控制器', additional_certificates: '嵌入式工程师认证', promotion_conditions: '掌握嵌入式开发基础', salary_change: '10-20%' },
  { from_name: 'C/C++', to_name: 'C/C++', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '分布式系统、高并发设计、系统性能调优', additional_certificates: '系统架构设计师证书', promotion_conditions: '大型项目经验和架构设计能力', salary_change: '80-100%' },
  { from_name: 'C/C++', to_name: 'Java', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: 'Java基础、Spring框架', additional_certificates: 'Oracle Java认证', promotion_conditions: 'Java基础学习', salary_change: '5-15%' },
  
  // Java 晋升路径
  { from_name: 'Java', to_name: 'Java', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '微服务架构、中间件、性能优化', additional_certificates: 'Spring认证、架构师证书', promotion_conditions: '深入学习分布式系统', salary_change: '30-50%' },
  { from_name: 'Java', to_name: 'Java', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '团队管理、项目管理、技术选型', additional_certificates: 'PMP认证', promotion_conditions: '管理能力和项目经验', salary_change: '50-70%' },
  { from_name: 'Java', to_name: 'Java', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '系统架构、中台建设、技术规划', additional_certificates: '系统架构设计师证书', promotion_conditions: '全面技术视野和大型项目经验', salary_change: '80-100%' },
  { from_name: 'Java', to_name: 'Java', path_type: 'horizontal', difficulty: '3', years_required: 1, additional_skills: 'Hadoop、Spark、Flink', additional_certificates: '大数据认证', promotion_conditions: '大数据技术学习', salary_change: '20-30%' },
  
  // 测试工程师 晋升路径
  { from_name: '测试工程师', to_name: '测试工程师', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '自动化测试框架、性能测试、安全测试', additional_certificates: 'ISTQB高级认证', promotion_conditions: '测试技术栈深入', salary_change: '30-50%' },
  { from_name: '测试工程师', to_name: '测试工程师', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '测试平台建设、测试策略制定', additional_certificates: '测试架构师认证', promotion_conditions: '测试平台建设经验', salary_change: '50-70%' },
  { from_name: '测试工程师', to_name: '测试工程师', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '团队管理、测试流程优化、质量体系', additional_certificates: 'PMP认证、质量管理体系证书', promotion_conditions: '管理能力和质量意识', salary_change: '50-70%' },
  { from_name: '测试工程师', to_name: '质量管理/测试', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '质量管理体系、流程优化', additional_certificates: '质量工程师证书', promotion_conditions: '质量方向知识', salary_change: '20-30%' },
  
  // 软件测试 晋升路径
  { from_name: '软件测试', to_name: '软件测试', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '自动化测试、性能测试、测试框架', additional_certificates: 'ISTQB认证', promotion_conditions: '测试技术深度提升', salary_change: '30-50%' },
  { from_name: '软件测试', to_name: '测试工程师', path_type: 'vertical', difficulty: '3', years_required: 3, additional_skills: '高级测试方法、自动化框架', additional_certificates: 'ISTQB高级认证', promotion_conditions: '测试能力提升', salary_change: '30-50%' },
  { from_name: '软件测试', to_name: '软件测试', path_type: 'horizontal', difficulty: '3', years_required: 1, additional_skills: 'Linux、Shell、自动化运维', additional_certificates: '运维相关认证', promotion_conditions: '运维基础知识', salary_change: '10-20%' },
  
  // 技术支持工程师 晋升路径
  { from_name: '技术支持工程师', to_name: '技术支持工程师', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '复杂问题诊断、技术方案输出', additional_certificates: '厂商高级认证', promotion_conditions: '技术深度提升', salary_change: '30-50%' },
  { from_name: '技术支持工程师', to_name: '技术支持工程师', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '解决方案设计、客户需求分析', additional_certificates: '解决方案专家认证', promotion_conditions: '方案设计能力', salary_change: '50-70%' },
  { from_name: '技术支持工程师', to_name: '技术支持工程师', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '产品知识、演讲能力、方案制作', additional_certificates: '售前认证', promotion_conditions: '售前能力培养', salary_change: '20-40%' },
  { from_name: '技术支持工程师', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '4', years_required: 3, additional_skills: '项目管理、PMP认证', additional_certificates: 'PMP证书', promotion_conditions: '项目管理经验', salary_change: '30-50%' },
  
  // 硬件测试 晋升路径
  { from_name: '硬件测试', to_name: '硬件测试', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '高级测试方法、可靠性分析', additional_certificates: '硬件测试认证', promotion_conditions: '硬件测试技术深入', salary_change: '30-50%' },
  { from_name: '硬件测试', to_name: '硬件测试', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '原理图设计、PCB设计', additional_certificates: '硬件工程师证书', promotion_conditions: '硬件设计知识', salary_change: '30-50%' },
  { from_name: '硬件测试', to_name: '质量管理/测试', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '质量管理、供应商管理', additional_certificates: '质量工程师证书', promotion_conditions: '质量管理经验', salary_change: '20-40%' },
  
  // 质量管理/测试 晋升路径
  { from_name: '质量管理/测试', to_name: '质量管理/测试', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '团队管理、质量流程建设', additional_certificates: '质量管理体系认证', promotion_conditions: '管理能力提升', salary_change: '30-50%' },
  { from_name: '质量管理/测试', to_name: '质量管理/测试', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '质量战略、供应商质量管理', additional_certificates: '质量工程师证书', promotion_conditions: '全面质量管理经验', salary_change: '50-70%' },
  { from_name: '质量管理/测试', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '项目管理、流程优化', additional_certificates: 'PMP认证', promotion_conditions: '项目管理知识', salary_change: '20-40%' },
  
  // 质检员 晋升路径
  { from_name: '质检员', to_name: '质检员', path_type: 'vertical', difficulty: '2', years_required: 2, additional_skills: '质检方法、质量分析', additional_certificates: '质检员证书', promotion_conditions: '质检技能提升', salary_change: '20-30%' },
  { from_name: '质检员', to_name: '质检员', path_type: 'vertical', difficulty: '3', years_required: 3, additional_skills: '团队管理、质量体系', additional_certificates: '质量工程师证书', promotion_conditions: '管理能力', salary_change: '40-60%' },
  { from_name: '质检员', to_name: '质量管理/测试', path_type: 'vertical', difficulty: '2', years_required: 1, additional_skills: '质量管理体系', additional_certificates: '质量证书', promotion_conditions: '质量知识学习', salary_change: '30-50%' },
  
  // 产品专员/助理 晋升路径
  { from_name: '产品专员/助理', to_name: '产品专员/助理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '产品规划、数据分析、跨部门协作', additional_certificates: '产品经理证书', promotion_conditions: '独立负责产品经验', salary_change: '30-50%' },
  { from_name: '产品专员/助理', to_name: '产品专员/助理', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '产品战略、团队管理', additional_certificates: '高级产品经理认证', promotion_conditions: '成功产品案例', salary_change: '50-80%' },
  { from_name: '产品专员/助理', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '用户运营、数据分析', additional_certificates: '运营证书', promotion_conditions: '运营知识学习', salary_change: '10-20%' },
  
  // 社区运营 晋升路径
  { from_name: '社区运营', to_name: '社区运营', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '社区规模化运营、团队管理', additional_certificates: '社区运营认证', promotion_conditions: '社区运营领域深耕', salary_change: '30-50%' },
  { from_name: '社区运营', to_name: '社区运营', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '用户增长、会员体系、数据运营', additional_certificates: '用户运营高级认证', promotion_conditions: '全面用户运营经验', salary_change: '80-100%' },
  { from_name: '社区运营', to_name: '社区运营', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '内容运营、活动策划', additional_certificates: '新媒体证书', promotion_conditions: '内容运营学习', salary_change: '10-20%' },
  
  // 内容审核 晋升路径
  { from_name: '内容审核', to_name: '内容审核', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '审核标准制定、团队管理', additional_certificates: '内容审核管理认证', promotion_conditions: '审核和管理能力提升', salary_change: '30-50%' },
  { from_name: '内容审核', to_name: '内容审核', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '风控策略、合规管理', additional_certificates: '风控证书', promotion_conditions: '风控知识积累', salary_change: '50-70%' },
  { from_name: '内容审核', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '数据分析、活动策划', additional_certificates: '运营证书', promotion_conditions: '运营知识学习', salary_change: '10-20%' },
  
  // 网络客服 晋升路径
  { from_name: '网络客服', to_name: '网络客服', path_type: 'vertical', difficulty: '2', years_required: 1, additional_skills: '团队管理、绩效管理', additional_certificates: '客服管理证书', promotion_conditions: '管理晋升意愿', salary_change: '30-50%' },
  { from_name: '网络客服', to_name: '网络客服', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '客服体系、流程优化', additional_certificates: '客服管理证书', promotion_conditions: '客服团队管理经验', salary_change: '50-70%' },
  { from_name: '网络客服', to_name: '售后客服', path_type: 'horizontal', difficulty: '1', years_required: 1, additional_skills: '售后流程、产品知识', additional_certificates: '售后证书', promotion_conditions: '内部转岗', salary_change: '10-20%' },
  
  // BD经理 晋升路径
  { from_name: 'BD经理', to_name: 'BD经理', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: '战略合作、资源整合', additional_certificates: '高级商务证书', promotion_conditions: '战略思维提升', salary_change: '30-50%' },
  { from_name: 'BD经理', to_name: 'BD经理', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '商务战略、团队管理、投融资', additional_certificates: 'MBA或商务总监认证', promotion_conditions: '丰富的商务经验和资源', salary_change: '80-100%' },
  { from_name: 'BD经理', to_name: 'BD经理', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '商务谈判、合同管理', additional_certificates: '商务管理证书', promotion_conditions: '商务经验积累', salary_change: '50-70%' },
  
  // APP推广 晋升路径
  { from_name: 'APP推广', to_name: 'APP推广', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '用户增长策略、投放优化', additional_certificates: '数字营销高级认证', promotion_conditions: '推广投放领域深耕', salary_change: '40-60%' },
  { from_name: 'APP推广', to_name: 'APP推广', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '市场营销、品牌管理', additional_certificates: '市场营销证书', promotion_conditions: '市场全局视野', salary_change: '80-100%' },
  { from_name: 'APP推广', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '用户运营、数据分析', additional_certificates: '运营证书', promotion_conditions: '运营知识学习', salary_change: '10-20%' },
  
  // 大客户代表 晋升路径
  { from_name: '大客户代表', to_name: '大客户代表', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '大客户管理、战略合作', additional_certificates: '销售管理证书', promotion_conditions: '大客户关系维护', salary_change: '30-50%' },
  { from_name: '大客户代表', to_name: '大客户代表', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '销售团队管理、销售战略', additional_certificates: '销售管理认证', promotion_conditions: '销售团队管理经验', salary_change: '80-100%' },
  { from_name: '大客户代表', to_name: 'BD经理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '商务拓展、谈判能力', additional_certificates: 'BD认证', promotion_conditions: '商务拓展能力', salary_change: '20-40%' },
  
  // 广告销售 晋升路径
  { from_name: '广告销售', to_name: '广告销售', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '广告产品、媒体资源', additional_certificates: '广告销售认证', promotion_conditions: '广告销售领域深耕', salary_change: '30-50%' },
  { from_name: '广告销售', to_name: '广告销售', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '媒体战略、资源整合', additional_certificates: '媒介管理证书', promotion_conditions: '媒体资源积累', salary_change: '80-100%' },
  { from_name: '广告销售', to_name: '大客户代表', path_type: 'vertical', difficulty: '2', years_required: 1, additional_skills: '大客户服务', additional_certificates: '销售证书', promotion_conditions: '大客户开发能力', salary_change: '30-50%' },
  
  // 电话销售 晋升路径
  { from_name: '电话销售', to_name: '电话销售', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '团队管理、销售技巧', additional_certificates: '销售管理证书', promotion_conditions: '管理晋升意愿', salary_change: '40-60%' },
  { from_name: '电话销售', to_name: '电话销售', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '销售管理、客户管理', additional_certificates: '销售管理认证', promotion_conditions: '销售团队管理经验', salary_change: '60-80%' },
  { from_name: '电话销售', to_name: '网络销售', path_type: 'horizontal', difficulty: '1', years_required: 1, additional_skills: '电商平台操作', additional_certificates: '电商证书', promotion_conditions: '电商基础知识', salary_change: '10-20%' },
  
  // 销售助理 晋升路径
  { from_name: '销售助理', to_name: '销售助理', path_type: 'vertical', difficulty: '2', years_required: 1, additional_skills: '销售技巧、客户开发', additional_certificates: '销售证书', promotion_conditions: '销售意愿和努力', salary_change: '30-50%' },
  { from_name: '销售助理', to_name: '大客户代表', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '大客户管理、商务谈判', additional_certificates: '商务证书', promotion_conditions: '销售业绩积累', salary_change: '60-80%' },
  { from_name: '销售助理', to_name: '销售助理', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '行政管理', additional_certificates: '行政证书', promotion_conditions: '行政能力培养', salary_change: '10-20%' },
  
  // 销售工程师 晋升路径
  { from_name: '销售工程师', to_name: '销售工程师', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '行业解决方案、技术深度', additional_certificates: '技术销售认证', promotion_conditions: '技术背景深化', salary_change: '30-50%' },
  { from_name: '销售工程师', to_name: '销售工程师', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '售前支持、解决方案', additional_certificates: '售前认证', promotion_conditions: '售前能力提升', salary_change: '40-60%' },
  { from_name: '销售工程师', to_name: '技术支持工程师', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '技术支持', additional_certificates: '技术支持认证', promotion_conditions: '技术支持方向', salary_change: '10-20%' },
  
  // 销售运营 晋升路径
  { from_name: '销售运营', to_name: '销售运营', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '销售分析、流程优化', additional_certificates: '数据分析证书', promotion_conditions: '销售运营领域深耕', salary_change: '30-50%' },
  { from_name: '销售运营', to_name: '销售运营', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: 'CRM系统、数据运营', additional_certificates: 'CRM认证', promotion_conditions: 'CRM专业知识', salary_change: '50-70%' },
  { from_name: '销售运营', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '数据分析', additional_certificates: '运营证书', promotion_conditions: '运营知识学习', salary_change: '10-20%' },
  
  // 咨询顾问 晋升路径
  { from_name: '咨询顾问', to_name: '咨询顾问', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: '行业深度、方法论', additional_certificates: '管理咨询认证', promotion_conditions: '专业领域深耕', salary_change: '40-60%' },
  { from_name: '咨询顾问', to_name: '咨询顾问', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '团队管理、客户关系', additional_certificates: 'MBA或咨询证书', promotion_conditions: '团队和项目管理经验', salary_change: '80-100%' },
  { from_name: '咨询顾问', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '项目管理', additional_certificates: 'PMP认证', promotion_conditions: '项目管理知识', salary_change: '20-40%' },
  
  // 猎头顾问 晋升路径
  { from_name: '猎头顾问', to_name: '猎头顾问', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '高端猎聘、行业资源', additional_certificates: '猎头认证', promotion_conditions: '高端人脉积累', salary_change: '40-60%' },
  { from_name: '猎头顾问', to_name: '猎头顾问', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '团队管理、业务拓展', additional_certificates: '管理证书', promotion_conditions: '团队管理经验', salary_change: '60-80%' },
  { from_name: '猎头顾问', to_name: '猎头顾问', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: 'HRBP能力', additional_certificates: 'HR证书', promotion_conditions: '企业HR知识', salary_change: '20-40%' },
  
  // 律师 晋升路径
  { from_name: '律师', to_name: '律师', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '专业领域深耕、客户积累', additional_certificates: '律师执业证书', promotion_conditions: '专业化发展', salary_change: '40-60%' },
  { from_name: '律师', to_name: '律师', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '业务开拓、团队管理、客户关系', additional_certificates: '合伙人资格', promotion_conditions: '业绩和团队', salary_change: '100-200%' },
  { from_name: '律师', to_name: '法务专员/助理', path_type: 'horizontal', difficulty: '4', years_required: 4, additional_skills: '企业法务、合规管理', additional_certificates: '法务管理证书', promotion_conditions: '企业法务方向', salary_change: '40-60%' },
  
  // 律师助理 晋升路径
  { from_name: '律师助理', to_name: '律师助理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '执业考试、专业积累', additional_certificates: '律师执业证书', promotion_conditions: '通过司法考试', salary_change: '50-100%' },
  { from_name: '律师助理', to_name: '律师', path_type: 'vertical', difficulty: '3', years_required: 3, additional_skills: '专业领域、案件处理', additional_certificates: '专业证书', promotion_conditions: '律师执业', salary_change: '80-150%' },
  { from_name: '律师助理', to_name: '法务专员/助理', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '企业法务', additional_certificates: '法务证书', promotion_conditions: '企业法务知识', salary_change: '20-40%' },
  
  // 储备干部 晋升路径
  { from_name: '储备干部', to_name: '储备干部', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: '业务能力、管理基础', additional_certificates: '管理证书', promotion_conditions: '完成管培期培养', salary_change: '30-50%' },
  { from_name: '储备干部', to_name: '储备干部', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '团队管理、战略思维', additional_certificates: 'MBA或管理证书', promotion_conditions: '管理经验积累', salary_change: '60-80%' },
  { from_name: '储备干部', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '运营能力', additional_certificates: '运营证书', promotion_conditions: '运营方向选择', salary_change: '10-20%' },
  
  // 储备经理人 晋升路径
  { from_name: '储备经理人', to_name: '储备经理人', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: '业务管理、团队管理', additional_certificates: '管理证书', promotion_conditions: '完成储备期培养', salary_change: '30-50%' },
  { from_name: '储备经理人', to_name: '储备经理人', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '战略管理、资源整合', additional_certificates: '高级管理证书', promotion_conditions: '总监级经验', salary_change: '80-100%' },
  { from_name: '储备经理人', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '项目管理能力', additional_certificates: 'PMP认证', promotion_conditions: '项目管理方向', salary_change: '20-40%' },
  
  // 管培生/储备干部 晋升路径
  { from_name: '管培生/储备干部', to_name: '管培生/储备干部', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: '业务能力、领导力', additional_certificates: '管培证书', promotion_conditions: '完成培养计划', salary_change: '30-50%' },
  { from_name: '管培生/储备干部', to_name: '管培生/储备干部', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '战略眼光、全局思维', additional_certificates: 'MBA', promotion_conditions: '高管培养方向', salary_change: '80-100%' },
  { from_name: '管培生/储备干部', to_name: '产品专员/助理', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '产品能力', additional_certificates: '产品证书', promotion_conditions: '产品方向选择', salary_change: '10-20%' },
  
  // 项目专员/助理 晋升路径
  { from_name: '项目专员/助理', to_name: '项目专员/助理', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: 'PMP认证、项目管理经验', additional_certificates: 'PMP证书', promotion_conditions: '考取PMP证书', salary_change: '50-80%' },
  { from_name: '项目专员/助理', to_name: '项目经理/主管', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '大型项目管理、团队管理', additional_certificates: 'PMP高级认证', promotion_conditions: '大型项目经验', salary_change: '60-80%' },
  { from_name: '项目专员/助理', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '运营能力', additional_certificates: '运营证书', promotion_conditions: '运营方向选择', salary_change: '10-20%' },
  
  // 项目招投标 晋升路径
  { from_name: '项目招投标', to_name: '项目招投标', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '招投标管理、商务谈判', additional_certificates: '招投标高级证书', promotion_conditions: '招投标领域深耕', salary_change: '30-50%' },
  { from_name: '项目招投标', to_name: '项目招投标', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '商务管理、合同管理', additional_certificates: '商务证书', promotion_conditions: '商务方向延伸', salary_change: '50-70%' },
  { from_name: '项目招投标', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '项目管理', additional_certificates: 'PMP证书', promotion_conditions: '项目管理方向', salary_change: '30-50%' },
  
  // 项目经理/主管 晋升路径
  { from_name: '项目经理/主管', to_name: '项目经理/主管', path_type: 'vertical', difficulty: '4', years_required: 2, additional_skills: '大型项目管理、复杂风险管理', additional_certificates: 'PMP高级认证', promotion_conditions: '大型项目经验', salary_change: '30-50%' },
  { from_name: '项目经理/主管', to_name: '项目经理/主管', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '项目集管理、PMO建设', additional_certificates: 'PgMP认证', promotion_conditions: 'PMO建设经验', salary_change: '80-100%' },
  { from_name: '项目经理/主管', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '运营管理', additional_certificates: '运营证书', promotion_conditions: '运营方向选择', salary_change: '20-40%' },
  
  // 售后客服 晋升路径
  { from_name: '售后客服', to_name: '售后客服', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '团队管理、售后流程', additional_certificates: '客服管理证书', promotion_conditions: '管理晋升', salary_change: '40-60%' },
  { from_name: '售后客服', to_name: '售后客服', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '客服体系、服务质量', additional_certificates: '客服管理证书', promotion_conditions: '客服团队管理经验', salary_change: '60-80%' },
  { from_name: '售后客服', to_name: '培训师', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '培训技巧、课程开发', additional_certificates: '培训师证书', promotion_conditions: '培训方向选择', salary_change: '30-50%' },
  
  // 电话客服 晋升路径
  { from_name: '电话客服', to_name: '电话客服', path_type: 'vertical', difficulty: '2', years_required: 1, additional_skills: '团队管理', additional_certificates: '客服管理证书', promotion_conditions: '管理晋升意愿', salary_change: '30-50%' },
  { from_name: '电话客服', to_name: '网络客服', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '客服体系', additional_certificates: '客服管理证书', promotion_conditions: '客服团队管理经验', salary_change: '50-70%' },
  { from_name: '电话客服', to_name: '网络客服', path_type: 'horizontal', difficulty: '1', years_required: 1, additional_skills: '在线沟通', additional_certificates: '客服证书', promotion_conditions: '内部转岗', salary_change: '10-20%' },
  
  // 日语翻译 晋升路径
  { from_name: '日语翻译', to_name: '日语翻译', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '专业领域翻译、商务日语', additional_certificates: '日语N1证书', promotion_conditions: '专业领域深化', salary_change: '30-50%' },
  { from_name: '日语翻译', to_name: '日语翻译', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '项目管理、团队管理', additional_certificates: 'PMP认证', promotion_conditions: '翻译管理方向', salary_change: '50-70%' },
  { from_name: '日语翻译', to_name: '社区运营', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '运营能力', additional_certificates: '运营证书', promotion_conditions: '运营方向转型', salary_change: '20-40%' },
  
  // 英语翻译 晋升路径
  { from_name: '英语翻译', to_name: '英语翻译', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '专业领域翻译、同声传译', additional_certificates: 'CATTI二级以上', promotion_conditions: '专业领域深化', salary_change: '30-50%' },
  { from_name: '英语翻译', to_name: '英语翻译', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '项目管理、团队管理', additional_certificates: 'PMP认证', promotion_conditions: '翻译管理方向', salary_change: '50-70%' },
  { from_name: '英语翻译', to_name: '英语翻译', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '外贸业务、商务谈判', additional_certificates: '外贸证书', promotion_conditions: '外贸方向转型', salary_change: '40-60%' },
  
  // 游戏推广 晋升路径
  { from_name: '游戏推广', to_name: '游戏推广', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '推广策略、用户增长', additional_certificates: '游戏运营证书', promotion_conditions: '推广领域深耕', salary_change: '30-50%' },
  { from_name: '游戏推广', to_name: 'APP推广', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '市场战略、品牌管理', additional_certificates: '市场营销证书', promotion_conditions: '市场经验积累', salary_change: '80-100%' },
  { from_name: '游戏推广', to_name: '游戏运营', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '游戏运营能力', additional_certificates: '游戏运营证书', promotion_conditions: '运营方向延伸', salary_change: '10-20%' },
  
  // 游戏运营 晋升路径
  { from_name: '游戏运营', to_name: '游戏运营', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '游戏运营策略、数据分析', additional_certificates: '游戏运营证书', promotion_conditions: '游戏运营深耕', salary_change: '30-50%' },
  { from_name: '游戏运营', to_name: '游戏运营', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '运营战略、团队管理', additional_certificates: '高级运营证书', promotion_conditions: '全面运营经验', salary_change: '80-100%' },
  { from_name: '游戏运营', to_name: '产品专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '产品能力', additional_certificates: '产品经理证书', promotion_conditions: '产品方向选择', salary_change: '30-50%' },
  
  // 培训师 晋升路径
  { from_name: '培训师', to_name: '培训师', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '专业领域、培训体系', additional_certificates: '高级培训师证书', promotion_conditions: '专业培训能力深化', salary_change: '30-50%' },
  { from_name: '培训师', to_name: '培训师', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '培训体系、团队管理', additional_certificates: '培训管理证书', promotion_conditions: '培训管理经验', salary_change: '60-80%' },
  { from_name: '培训师', to_name: '培训师', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: 'HRBP能力', additional_certificates: 'HR证书', promotion_conditions: 'HR方向选择', salary_change: '20-40%' },
  
  // 档案管理 晋升路径
  { from_name: '档案管理', to_name: '档案管理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '档案管理体系、数字化', additional_certificates: '档案管理证书', promotion_conditions: '档案管理能力深化', salary_change: '30-50%' },
  { from_name: '档案管理', to_name: '档案管理', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '行政管理、后勤管理', additional_certificates: '行政管理证书', promotion_conditions: '行政方向延伸', salary_change: '60-80%' },
  { from_name: '档案管理', to_name: '资料管理', path_type: 'horizontal', difficulty: '1', years_required: 1, additional_skills: '资料管理', additional_certificates: '资料管理证书', promotion_conditions: '相关岗位转型', salary_change: '10-20%' },
  
  // 资料管理 晋升路径
  { from_name: '资料管理', to_name: '资料管理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '资料管理体系', additional_certificates: '资料管理证书', promotion_conditions: '资料管理能力深化', salary_change: '30-50%' },
  { from_name: '资料管理', to_name: '资料管理', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '文档管理、知识管理', additional_certificates: '知识管理证书', promotion_conditions: '知识管理方向', salary_change: '50-70%' },
  { from_name: '资料管理', to_name: '档案管理', path_type: 'horizontal', difficulty: '1', years_required: 1, additional_skills: '档案管理', additional_certificates: '档案证书', promotion_conditions: '相关岗位转型', salary_change: '10-20%' },
  
  // 风电工程师 晋升路径
  { from_name: '风电工程师', to_name: '风电工程师', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '风电场运维、技术管理', additional_certificates: '风电工程师证书', promotion_conditions: '风电技术深化', salary_change: '30-50%' },
  { from_name: '风电工程师', to_name: '技术支持工程师', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '技术管理、团队管理', additional_certificates: '工程师职称', promotion_conditions: '技术管理经验', salary_change: '60-80%' },
  { from_name: '风电工程师', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '项目管理', additional_certificates: 'PMP认证', promotion_conditions: '项目方向选择', salary_change: '30-50%' },
  
  // 知识产权/专利代理 晋升路径
  { from_name: '知识产权/专利代理', to_name: '知识产权/专利代理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '专利诉讼、专利分析', additional_certificates: '专利代理人证书', promotion_conditions: '专利专业能力深化', salary_change: '40-60%' },
  { from_name: '知识产权/专利代理', to_name: '律师', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '业务开拓、客户关系', additional_certificates: '合伙人资格', promotion_conditions: '业绩积累', salary_change: '100-200%' },
  { from_name: '知识产权/专利代理', to_name: '法务专员/助理', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '企业法务', additional_certificates: '法务证书', promotion_conditions: '企业法务方向', salary_change: '20-40%' },
  
  // 统计员 晋升路径
  { from_name: '统计员', to_name: '统计员', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '统计分析方法、SAS/R', additional_certificates: '统计师证书', promotion_conditions: '统计分析能力深化', salary_change: '30-50%' },
  { from_name: '统计员', to_name: '统计员', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '数据挖掘、机器学习', additional_certificates: '数据分析证书', promotion_conditions: '数据分析方向', salary_change: '40-60%' },
  { from_name: '统计员', to_name: '运营助理/专员', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '运营能力', additional_certificates: '运营证书', promotion_conditions: '运营方向转型', salary_change: '10-20%' },
  
  // 总助/CEO助理/董事长助理 晋升路径
  { from_name: '总助/CEO助理/董事长助理', to_name: '总助/CEO助理/董事长助理', path_type: 'vertical', difficulty: '5', years_required: 4, additional_skills: '行政管理、战略支持', additional_certificates: '行政管理证书', promotion_conditions: '行政方向晋升', salary_change: '60-80%' },
  { from_name: '总助/CEO助理/董事长助理', to_name: '总助/CEO助理/董事长助理', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '运营管理、战略规划', additional_certificates: 'MBA或COO证书', promotion_conditions: '高管培养方向', salary_change: '150-200%' },
  { from_name: '总助/CEO助理/董事长助理', to_name: '项目专员/助理', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '项目管理能力', additional_certificates: 'PMP认证', promotion_conditions: '项目方向选择', salary_change: '20-40%' },
  
  // 网络销售 晋升路径
  { from_name: '网络销售', to_name: '网络销售', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '销售管理、团队管理', additional_certificates: '销售管理证书', promotion_conditions: '管理晋升', salary_change: '40-60%' },
  { from_name: '网络销售', to_name: '销售运营', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '电商运营、数据分析', additional_certificates: '电商证书', promotion_conditions: '电商运营方向', salary_change: '60-80%' },
  { from_name: '网络销售', to_name: '电话销售', path_type: 'horizontal', difficulty: '1', years_required: 1, additional_skills: '电话销售技巧', additional_certificates: '销售证书', promotion_conditions: '内部转岗', salary_change: '10-20%' },
  
  // 运营助理/专员 晋升路径
  { from_name: '运营助理/专员', to_name: '运营助理/专员', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '运营策略、团队管理', additional_certificates: '运营管理证书', promotion_conditions: '独立运营经验', salary_change: '50-70%' },
  { from_name: '运营助理/专员', to_name: '运营助理/专员', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '运营战略、全局思维', additional_certificates: '高级运营证书', promotion_conditions: '全面运营经验', salary_change: '80-100%' },
  { from_name: '运营助理/专员', to_name: '产品专员/助理', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: '产品能力', additional_certificates: '产品证书', promotion_conditions: '产品方向转型', salary_change: '10-20%' }
];

async function insertCareerPaths() {
  console.log('开始获取岗位画像ID映射...');
  const profileIdMap = await getProfileIdMap();
  console.log(`获取到 ${profileIdMap.size} 个岗位画像`);
  
  console.log('开始插入晋升路径...');
  
  let insertedCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const path of careerPaths) {
    // 获取from_job_id
    const fromJobId = profileIdMap.get(path.from_name);
    const toJobId = profileIdMap.get(path.to_name);
    
    if (!fromJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (未找到起始岗位画像ID)`);
      skipCount++;
      continue;
    }
    
    if (!toJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (未找到目标岗位画像ID)`);
      skipCount++;
      continue;
    }
    
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('career_paths')
      .select('id')
      .eq('from_job_id', fromJobId)
      .eq('to_job_id', toJobId)
      .single();
    
    if (existing) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (已存在)`);
      skipCount++;
      continue;
    }
    
    const insertData = {
      from_job_id: fromJobId,
      to_job_id: toJobId,
      path_type: path.path_type,
      difficulty: path.difficulty,
      years_required: path.years_required,
      additional_skills: path.additional_skills,
      additional_certificates: path.additional_certificates,
      promotion_conditions: path.promotion_conditions,
      salary_change: path.salary_change,
      is_recommended: 1
    };
    
    const { error } = await supabase
      .from('career_paths')
      .insert(insertData);
    
    if (error) {
      console.error(`插入失败: ${path.from_name} -> ${path.to_name}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`插入成功: ${path.from_name} -> ${path.to_name}`);
      insertedCount++;
    }
  }
  
  console.log(`\n总计插入: ${insertedCount} 条晋升路径, 跳过: ${skipCount} 条, 失败: ${errorCount} 条`);
}

insertCareerPaths().catch(console.error);
