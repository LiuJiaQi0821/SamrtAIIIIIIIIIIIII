#!/usr/bin/env python3
"""
生成岗位画像、晋升路径和换岗图谱数据
"""
import os
import sys
import psycopg2
from datetime import datetime

# 添加 sandbox 路径以获取环境变量
sys.path.insert(0, '/app/work/sandbox')
from coze_workload_identity import Client

def get_env_vars():
    client = Client()
    env_vars = {v.key: v.value for v in client.get_project_env_vars()}
    client.close()
    return env_vars

def get_db_connection(env_vars):
    # 从 SUPABASE_URL 解析连接参数
    url = env_vars.get('COZE_SUPABASE_URL', '')
    # URL 格式: https://xxx.supabase.co
    host = url.replace('https://', '').replace('http://', '')
    
    # 使用 psycopg2 直接连接
    return psycopg2.connect(
        host='10.60.180.4',
        port=5432,
        database='postgres',
        user='postgres',
        password=env_vars.get('COZE_SUPABASE_DB_PASSWORD', '')
    )

# 岗位画像模板数据
PROFILE_TEMPLATES = {
    '前端开发': {
        'category': '技术类',
        'description': '负责Web前端页面设计与开发，实现用户交互界面，优化页面性能和用户体验。',
        'professional_skills': 'HTML5/CSS3/JavaScript、Vue/React框架、TypeScript、Webpack/Vite前端工程化、响应式布局、移动端适配、性能优化、浏览器兼容性处理',
        'certificate_requirements': '前端工程师证书、Web前端开发职业技能等级证书',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有Web开发项目经验或实习经历优先',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-20000元/月',
        'career_direction': '高级前端工程师、前端架构师、技术经理、产品经理',
        'core_qualifications': '良好的代码编写习惯、审美能力、用户导向思维、团队协作能力',
        'tools_requirement': 'VS Code、Git、Figma、Chrome DevTools'
    },
    'Java': {
        'category': '技术类',
        'description': '负责Java后端系统开发，设计和实现业务逻辑，处理高并发和大规模数据。',
        'professional_skills': 'JavaSE/JavaEE、Spring Boot/Spring Cloud、MyBatis/Hibernate、MySQL/PostgreSQL、Redis缓存、消息队列(MQ)、微服务架构、Docker容器化、Linux服务器操作',
        'certificate_requirements': 'Oracle认证Java开发员、Spring认证、微服务架构师认证',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有Java项目开发经验或实习经历，熟悉数据库操作',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-30000元/月',
        'career_direction': '高级Java工程师、架构师、技术总监、CTO',
        'core_qualifications': '逻辑思维能力强、问题分析能力、系统设计能力、代码规范意识',
        'tools_requirement': 'IntelliJ IDEA、Git、Maven/Gradle、Docker、Postman'
    },
    'Python': {
        'category': '技术类',
        'description': '使用Python进行后端开发、数据分析、机器学习等工作，构建高效的应用系统。',
        'professional_skills': 'Python基础、Django/Flask/FastAPI框架、MySQL/PostgreSQL/MongoDB、Redis、Celery任务队列、Docker容器化、数据处理(Pandas/NumPy)、API设计',
        'certificate_requirements': 'Python官方认证、数据分析证书、机器学习认证',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有Python项目经验或数据分析经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '12000-35000元/月',
        'career_direction': '高级Python工程师、算法工程师、数据科学家、技术经理',
        'core_qualifications': '编程能力强、数据敏感度高、学习能力强、逻辑清晰',
        'tools_requirement': 'PyCharm、VS Code、Git、Docker、Jupyter Notebook'
    },
    'C/C++': {
        'category': '技术类',
        'description': '负责C/C++底层系统开发、游戏引擎、嵌入式系统或高性能计算应用。',
        'professional_skills': 'C/C++编程、数据结构与算法、内存管理、多线程编程、STL库、网络编程、Linux系统编程、Makefile/GDB调试',
        'certificate_requirements': 'C/C++认证、嵌入式系统工程师证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 2,
        'internship_requirement': '有C/C++项目经验或ACM竞赛经历优先',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '15000-40000元/月',
        'career_direction': '高级C/C++工程师、系统架构师、游戏引擎开发、技术专家',
        'core_qualifications': '底层思维能力强、性能优化意识、代码质量意识、抗压能力',
        'tools_requirement': 'Clion、Visual Studio、Git、GDB、Valgrind、CMake'
    },
    '后端开发工程师': {
        'category': '技术类',
        'description': '负责服务器端业务逻辑开发、API设计、数据库设计与优化，保障系统稳定运行。',
        'professional_skills': 'Java/Python/Go语言、Spring Boot/Django框架、MySQL/PostgreSQL数据库、Redis缓存、RESTful API设计、微服务架构、Linux服务器操作、Docker容器化',
        'certificate_requirements': '软件工程师证书、数据库工程师证书、AWS/阿里云认证',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有后端开发项目或实习经历，熟悉数据库操作',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-25000元/月',
        'career_direction': '高级后端工程师、架构师、技术总监、CTO',
        'core_qualifications': '逻辑思维能力强、问题分析能力、系统设计能力、安全意识',
        'tools_requirement': 'IDEA/VS Code、Git、Docker、Postman、Jmeter'
    },
    '软件测试工程师': {
        'category': '技术类',
        'description': '负责软件质量保障，设计测试用例、执行测试、提交缺陷报告，保证产品上线质量。',
        'professional_skills': '测试用例设计、黑盒/白盒测试、功能测试、自动化测试、Selenium/Appium、性能测试、JMeter、缺陷管理、测试报告撰写',
        'certificate_requirements': '软件测试工程师证书、ISTQB测试工程师认证',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有测试实习经历或参与过测试项目',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-15000元/月',
        'career_direction': '高级测试工程师、测试架构师、测试经理、质量总监',
        'core_qualifications': '细心耐心、逻辑严谨、质量意识、沟通协调能力',
        'tools_requirement': 'Selenium、JMeter、Postman、Git、JIRA'
    },
    '测试工程师': {
        'category': '技术类',
        'description': '负责软件功能测试、性能测试、自动化测试，确保产品质量和稳定性。',
        'professional_skills': '测试用例设计、自动化测试框架、性能测试、安全测试、功能测试、接口测试、缺陷跟踪、测试报告撰写',
        'certificate_requirements': '软件评测师证书、ISTQB认证、自动化测试认证',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有测试相关实习或项目经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-16000元/月',
        'career_direction': '高级测试工程师、测试架构师、测试主管、质量经理',
        'core_qualifications': '细心严谨、逻辑清晰、质量意识、持续学习能力',
        'tools_requirement': 'Selenium、Appium、JMeter、Postman、Git、JIRA'
    },
    '软件测试': {
        'category': '技术类',
        'description': '负责软件产品质量验证，设计测试用例、执行测试、提交并跟踪缺陷。',
        'professional_skills': '测试用例编写、功能测试、自动化测试、接口测试、性能测试、缺陷管理、测试文档编写',
        'certificate_requirements': '软件测试工程师证书、ISTQB认证',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有软件测试实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-14000元/月',
        'career_direction': '高级测试工程师、测试架构师、测试经理',
        'core_qualifications': '细心严谨、逻辑思维、沟通协调、质量意识',
        'tools_requirement': 'Selenium、JMeter、Postman、禅道、JIRA'
    },
    '实施工程师': {
        'category': '技术类',
        'description': '负责软件系统部署、安装调试、客户培训，交付项目并处理实施过程中的技术问题。',
        'professional_skills': '软件部署、数据库配置、系统集成、需求调研、客户培训、项目管理、问题诊断与解决、技术文档编写',
        'certificate_requirements': '系统集成项目管理工程师、PMP认证',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有IT实施或技术支持实习经历',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-14000元/月',
        'career_direction': '实施经理、项目经理、售前顾问、技术总监',
        'core_qualifications': '技术学习能力、客户沟通能力、项目管理能力、问题解决能力',
        'tools_requirement': '数据库工具、远程桌面、虚拟机、项目管理工具'
    },
    '技术支持工程师': {
        'category': '技术类',
        'description': '为客户提供技术支持服务，解决产品使用过程中的技术问题，维护客户关系。',
        'professional_skills': '问题诊断与解决、客户服务意识、技术文档撰写、远程支持、产品培训、需求反馈、基础网络知识',
        'certificate_requirements': 'ITIL认证、网络工程师证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有技术支持或客服实习经历优先',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-12000元/月',
        'career_direction': '技术支持主管、技术支持经理、售前工程师、客户成功经理',
        'core_qualifications': '服务意识强、沟通能力强、学习能力、抗压能力',
        'tools_requirement': '远程桌面工具、工单系统、知识库、监控工具'
    },
    '运维工程师': {
        'category': '技术类',
        'description': '负责服务器运维、监控系统搭建、自动化运维脚本开发，保障系统稳定运行。',
        'professional_skills': 'Linux系统管理、Nginx/Apache、MySQL/Redis、Shell/Python脚本、Docker容器、K8s编排、监控报警、日志分析',
        'certificate_requirements': 'Linux运维认证、K8s认证、阿里云/腾讯云认证',
        'innovation_ability': 3,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有Linux运维或DevOps实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-20000元/月',
        'career_direction': '高级运维工程师、运维架构师、DevOps工程师、SRE',
        'core_qualifications': '故障应急能力、系统思维、自动化意识、安全意识',
        'tools_requirement': 'Ansible、SaltStack、Prometheus、Grafana、ELK、Docker、K8s'
    },
    '网络工程师': {
        'category': '技术类',
        'description': '负责网络规划、设备配置与维护、网络安全，保障企业网络稳定运行。',
        'professional_skills': '网络协议(TCP/IP)、路由器/交换机配置、防火墙、网络安全、网络监控、VPN、无线网络',
        'certificate_requirements': '思科/华为认证网络工程师、网络安全证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有网络相关实习或项目经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-15000元/月',
        'career_direction': '高级网络工程师、网络架构师、网络安全工程师、IT经理',
        'core_qualifications': '逻辑思维、网络安全意识、故障排查能力、学习能力',
        'tools_requirement': 'Wireshark、Cisco Packet Tracer、SolarWinds、监控工具'
    },
    '算法工程师': {
        'category': '技术类',
        'description': '负责机器学习算法研发、模型优化与部署，解决实际业务问题。',
        'professional_skills': 'Python/C++、机器学习算法、深度学习框架(TensorFlow/PyTorch)、数据结构与算法、数据处理与分析、模型部署',
        'certificate_requirements': '深度学习工程师认证、Kaggle证书、ACM竞赛证书',
        'innovation_ability': 5,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有算法研究或机器学习项目经验，论文发表经历优先',
        'education_requirement': '硕士及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '20000-50000元/月',
        'career_direction': '高级算法工程师、算法专家、AI架构师、研究员',
        'core_qualifications': '数学功底扎实、算法能力强、学术研究能力、创新思维',
        'tools_requirement': 'Python、TensorFlow/PyTorch、Git、Linux服务器'
    },
    '数据分析师': {
        'category': '技术类',
        'description': '负责数据分析工作，提取业务洞察，为决策提供数据支持。',
        'professional_skills': 'SQL高级查询、Python/R数据分析、Pandas/NumPy、数据可视化(Tableau/PowerBI)、统计学基础、业务理解能力',
        'certificate_requirements': '数据分析证书、Tableau认证、SQL认证',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有数据分析实习或项目经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '10000-20000元/月',
        'career_direction': '高级数据分析师、数据科学家、数据挖掘工程师、数据产品经理',
        'core_qualifications': '数据敏感度高、逻辑思维、沟通表达、业务理解能力',
        'tools_requirement': 'Python、SQL、Tableau、PowerBI、Excel、SPSS'
    },
    '产品经理': {
        'category': '产品类',
        'description': '负责产品规划、需求分析、原型设计，协调研发团队推动产品迭代。',
        'professional_skills': '需求分析、竞品分析、用户研究、产品设计、Axure/墨刀原型设计、数据分析、PRD文档撰写、敏捷开发流程',
        'certificate_requirements': '产品经理证书、NPDP产品经理国际认证',
        'innovation_ability': 5,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有互联网产品实习经验，参与过产品设计项目',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '12000-30000元/月',
        'career_direction': '高级产品经理、产品总监、COO、创业者',
        'core_qualifications': '商业敏感度、用户思维、数据驱动决策、跨部门协调能力',
        'tools_requirement': 'Axure、墨刀、Figma、XMind、SQL'
    },
    '项目经理': {
        'category': '管理类',
        'description': '负责项目计划制定、团队协调、进度管理，确保项目按时交付。',
        'professional_skills': '项目管理(PMP/PRINCE2)、团队协调、进度管理、风险管理、干系人沟通、敏捷/Scrum方法',
        'certificate_requirements': 'PMP认证、PRINCE2认证、ACP认证',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有项目管理实习或协助项目经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '3-5年',
        'salary_range': '15000-30000元/月',
        'career_direction': '高级项目经理、项目总监、PMO负责人、副总裁',
        'core_qualifications': '组织协调能力、风险意识、抗压能力、沟通表达能力',
        'tools_requirement': 'Project、JIRA、Confluence、甘特图工具、钉钉/飞书'
    },
    '游戏开发工程师': {
        'category': '技术类',
        'description': '负责游戏客户端/服务器开发，实现游戏核心玩法和系统功能。',
        'professional_skills': 'Unity3D/Unreal引擎、C#/C++、Lua脚本、网络同步、游戏物理、渲染优化、Shader编程',
        'certificate_requirements': 'Unity认证开发者、游戏开发证书',
        'innovation_ability': 5,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有游戏开发项目经验或游戏作品集',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '12000-30000元/月',
        'career_direction': '高级游戏工程师、游戏主程、游戏制作人、CTO',
        'core_qualifications': '游戏热情、技术扎实、性能优化意识、团队协作',
        'tools_requirement': 'Unity/Unreal、Git、Perforce、美术工具'
    },
    '游戏运营': {
        'category': '运营类',
        'description': '负责游戏运营工作，策划活动、分析数据、提升用户活跃度和收入。',
        'professional_skills': '游戏运营策略、用户增长、活动策划、数据分析、渠道推广、社群运营、竞品分析',
        'certificate_requirements': '游戏运营证书、数据分析师证书',
        'innovation_ability': 5,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '有游戏公司实习或重度游戏经历',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-20000元/月',
        'career_direction': '游戏运营经理、发行制作人、运营总监',
        'core_qualifications': '游戏敏感度、数据分析能力、用户思维、创新策划能力',
        'tools_requirement': '数据分析工具、运营后台、活动配置工具、监控平台'
    },
    '游戏推广': {
        'category': '运营类',
        'description': '负责游戏推广工作，拓展渠道、策划推广方案、提升游戏曝光和下载量。',
        'professional_skills': '渠道拓展、商务谈判、推广策划、ASM/ASO、买量投放、社媒推广',
        'certificate_requirements': '市场营销证书、商务谈判证书',
        'innovation_ability': 4,
        'learning_ability': 3,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有推广或商务实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-15000元/月',
        'career_direction': '推广经理、商务经理、渠道总监',
        'core_qualifications': '商务拓展能力、谈判能力、资源整合能力、执行力',
        'tools_requirement': '商务工具、数据分析工具、投放平台'
    },
    'UI设计': {
        'category': '设计类',
        'description': '负责产品界面视觉设计，创建符合品牌调性和用户体验的视觉方案。',
        'professional_skills': 'UI设计、视觉设计、Figma/Sketch、Adobe全家桶、图标设计、配色理论、设计规范',
        'certificate_requirements': 'Adobe认证设计师、UI设计证书',
        'innovation_ability': 5,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有设计作品集，有App或Web设计项目经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-18000元/月',
        'career_direction': '高级UI设计师、设计主管、设计总监、艺术总监',
        'core_qualifications': '审美能力、创意能力、细节把控、团队协作能力',
        'tools_requirement': 'Figma、Sketch、Adobe XD、Photoshop、Illustrator'
    },
    'UI/UX设计师': {
        'category': '设计类',
        'description': '负责产品界面设计、用户体验优化，设计符合品牌调性的视觉方案。',
        'professional_skills': 'UI设计、UX设计、Figma/Sketch、Adobe全家桶、图标设计、动效设计、配色理论、用户研究、交互设计规范',
        'certificate_requirements': 'Adobe认证设计师、UI设计证书',
        'innovation_ability': 5,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有设计作品集，有App或Web设计项目经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-18000元/月',
        'career_direction': '高级设计师、设计主管、设计总监、艺术总监',
        'core_qualifications': '审美能力、创意能力、用户思维、细节把控',
        'tools_requirement': 'Figma、Sketch、Adobe XD、Photoshop、Illustrator、After Effects'
    },
    '新媒体运营': {
        'category': '运营类',
        'description': '负责新媒体平台运营，策划内容、涨粉引流、提升品牌影响力。',
        'professional_skills': '内容策划、短视频制作、社交媒体运营、粉丝增长、数据分析、热点追踪、文案撰写',
        'certificate_requirements': '新媒体运营师证书、短视频运营证书',
        'innovation_ability': 5,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有新媒体运营经验，有爆款内容案例优先',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-15000元/月',
        'career_direction': '新媒体主管、内容总监、运营总监、自媒体创业者',
        'core_qualifications': '网感好、内容创作能力、数据分析、热点敏感度',
        'tools_requirement': '剪映/PR、创可贴、135编辑器、数据分析工具'
    },
    '电商运营': {
        'category': '运营类',
        'description': '负责电商平台运营，提升店铺销量、优化店铺指标、处理客户问题。',
        'professional_skills': '店铺运营、数据分析、活动策划、供应链管理、客服管理、流量获取、爆款打造',
        'certificate_requirements': '电商运营证书、数据分析师证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '有电商运营实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-15000元/月',
        'career_direction': '电商运营主管、电商经理、店铺老板',
        'core_qualifications': '数据思维、执行力、抗压能力、沟通协调能力',
        'tools_requirement': '电商后台、生意参谋、Excel、数据分析工具'
    },
    '运营专员': {
        'category': '运营类',
        'description': '负责内容运营、用户运营、活动策划，提升用户活跃度和产品转化率。',
        'professional_skills': '内容策划、用户运营、数据分析、社群运营、活动策划与执行、文案撰写、渠道推广、SEO基础',
        'certificate_requirements': '互联网运营师证书、新媒体运营师证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有新媒体运营或电商运营实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-12000元/月',
        'career_direction': '运营主管、运营经理、运营总监、自媒体创业者',
        'core_qualifications': '创意思维、数据敏感度、执行力、用户洞察',
        'tools_requirement': 'Office、PS/PR基础、数据分析工具、社交媒体管理工具'
    },
    '运营助理/专员': {
        'category': '运营类',
        'description': '协助运营工作，策划活动、统计分析数据、提升用户活跃度。',
        'professional_skills': '活动策划、数据统计、用户运营、内容运营、社群维护、文件整理',
        'certificate_requirements': '运营证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有运营实习或校园活动组织经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-10000元/月',
        'career_direction': '运营专员、运营主管、运营经理',
        'core_qualifications': '执行力、学习能力、细心认真、沟通能力',
        'tools_requirement': 'Office、数据分析工具、社交工具'
    },
    '社区运营': {
        'category': '运营类',
        'description': '负责社区运营工作，管理社群、提升用户活跃度、打造社区文化。',
        'professional_skills': '社区搭建、社群运营、KOL运营、用户分层、活动策划、内容运营、数据分析',
        'certificate_requirements': '社区运营证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有社群运营或社区管理经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-15000元/月',
        'career_direction': '社区运营经理、社区负责人、运营总监',
        'core_qualifications': '用户思维、沟通能力、活动策划、社群管理能力',
        'tools_requirement': '社群管理工具、内容编辑工具、数据分析工具'
    },
    '销售代表': {
        'category': '销售类',
        'description': '负责客户开发、产品销售、商务谈判，完成销售业绩目标。',
        'professional_skills': '客户开发、电话销售、面销技巧、商务谈判、合同签订、客户关系维护、销售数据分析、市场开拓',
        'certificate_requirements': '销售从业资格证、证券/基金从业资格证（金融行业）',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有销售实习或兼职经历，有校园代理经验优先',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-15000元/月+提成',
        'career_direction': '销售主管、销售经理、销售总监、商务总监',
        'core_qualifications': '抗压能力、目标导向、人际交往能力、积极心态',
        'tools_requirement': 'CRM系统、Office、电话系统'
    },
    'BD经理': {
        'category': '销售类',
        'description': '负责商务拓展工作，挖掘合作机会、洽谈战略合作、拓展商业渠道。',
        'professional_skills': '商务拓展、战略合作、谈判技巧、资源整合、行业分析、方案撰写、关系维护',
        'certificate_requirements': '商务谈判证书、MBA优先',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有商务或销售实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '3-5年',
        'salary_range': '15000-30000元/月',
        'career_direction': '高级BD经理、商务总监、VP、创业者',
        'core_qualifications': '商业敏感度、谈判能力、资源整合、高情商',
        'tools_requirement': 'CRM系统、Office、商业分析工具'
    },
    '大客户代表': {
        'category': '销售类',
        'description': '负责大客户服务和销售工作，维护重点客户关系，达成大客户业绩目标。',
        'professional_skills': '大客户服务、关系维护、需求挖掘、方案定制、商务谈判、合同签订、客户管理',
        'certificate_requirements': '大客户销售认证',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有销售或客户维护实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '10000-20000元/月+提成',
        'career_direction': '大客户经理、销售总监',
        'core_qualifications': '客户关系管理、高情商、抗压能力、服务意识',
        'tools_requirement': 'CRM系统、Office、演示工具'
    },
    '广告销售': {
        'category': '销售类',
        'description': '负责广告位销售工作，挖掘客户需求、洽谈广告合作、达成销售目标。',
        'professional_skills': '广告销售、客户开发、方案设计、商务谈判、数据分析、媒体资源整合',
        'certificate_requirements': '广告销售证书',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有广告或媒体销售实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-18000元/月+提成',
        'career_direction': '广告销售经理、媒体总监',
        'core_qualifications': '沟通能力、商业思维、抗压能力、执行力',
        'tools_requirement': 'CRM系统、广告投放平台、Office'
    },
    '电话销售': {
        'category': '销售类',
        'description': '通过电话进行产品销售，客户开发与维护，完成销售业绩指标。',
        'professional_skills': '电话销售、客户开发、需求挖掘、产品介绍、异议处理、合同签订',
        'certificate_requirements': '销售证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有电话销售或客服实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-10000元/月+提成',
        'career_direction': '销售主管、销售经理',
        'core_qualifications': '声音甜美/有磁性、抗压能力、执行力、坚持不懈',
        'tools_requirement': '电销系统、CRM系统、Office'
    },
    '网络销售': {
        'category': '销售类',
        'description': '通过网络渠道进行产品销售，客户开发与维护，完成线上销售目标。',
        'professional_skills': '网络销售、客户开发、在线沟通、产品介绍、关系维护、销售转化',
        'certificate_requirements': '电商运营证书',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有网络销售或电商实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-12000元/月+提成',
        'career_direction': '网络销售主管、电商运营经理',
        'core_qualifications': '沟通能力、服务意识、销售技巧、抗压能力',
        'tools_requirement': '电商后台、CRM系统、社交工具'
    },
    '销售助理': {
        'category': '销售类',
        'description': '协助销售团队处理销售事务，文档整理、数据统计、客户跟进。',
        'professional_skills': '销售支持、文档整理、数据统计、客户沟通、合同管理、报表制作',
        'certificate_requirements': '商务证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有销售或行政实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '销售代表、销售主管、销售经理',
        'core_qualifications': '细心认真、执行力、沟通能力、服务意识',
        'tools_requirement': 'Office、CRM系统'
    },
    '销售工程师': {
        'category': '销售类',
        'description': '负责技术型销售工作，结合技术方案进行产品推广和客户开发。',
        'professional_skills': '技术销售、解决方案设计、客户需求分析、技术演示、商务谈判、项目运作',
        'certificate_requirements': '销售工程师证书、行业认证',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有技术背景和销售实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-18000元/月+提成',
        'career_direction': '高级销售工程师、销售经理、售前总监',
        'core_qualifications': '技术理解力、商务谈判、客户关系、抗压能力',
        'tools_requirement': '技术文档工具、CRM系统、演示工具'
    },
    '销售运营': {
        'category': '运营类',
        'description': '负责销售运营支持，数据分析、流程优化、团队协作，提升销售效率。',
        'professional_skills': '数据分析、销售管理、流程优化、CRM运营、报表制作、跨部门协调',
        'certificate_requirements': '数据分析证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有运营或数据分析实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-15000元/月',
        'career_direction': '销售运营经理、运营总监',
        'core_qualifications': '数据分析、逻辑思维、沟通协调、执行力',
        'tools_requirement': 'Excel、CRM系统、BI工具'
    },
    '财务专员': {
        'category': '职能类',
        'description': '负责日常账务处理、发票管理、报表编制，协助完成财务核算和税务申报工作。',
        'professional_skills': '会计核算、财务报表编制、发票管理、税务申报、用友/金蝶财务软件、Excel高级应用、财务分析基础',
        'certificate_requirements': '初级会计职称、注册会计师（CPA）优先',
        'innovation_ability': 2,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有财务实习经历或会计事务所实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '5000-10000元/月',
        'career_direction': '财务主管、财务经理、CFO',
        'core_qualifications': '严谨细致、责任心强、数字敏感度、职业道德',
        'tools_requirement': '用友U8、金蝶KIS、Excel、PPT'
    },
    '行政专员': {
        'category': '职能类',
        'description': '负责行政事务处理，包括办公采购、档案管理、活动组织等日常行政工作。',
        'professional_skills': '行政管理、档案管理、办公采购、活动策划、后勤管理、接待工作',
        'certificate_requirements': '行政管理证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有行政或文秘实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '行政主管、行政经理、行政总监',
        'core_qualifications': '细心认真、服务意识、沟通协调、执行力',
        'tools_requirement': 'Office、OA系统、档案管理系统'
    },
    '人力资源专员': {
        'category': '职能类',
        'description': '负责招聘、培训、绩效等人力资源模块工作，协助完成人力资源管理事务。',
        'professional_skills': '招聘渠道管理、简历筛选、面试安排、培训组织、绩效跟进、员工关系维护',
        'certificate_requirements': '人力资源管理师证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有人力资源实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '5000-10000元/月',
        'career_direction': 'HR主管、HR经理、HR总监、CHO',
        'core_qualifications': '沟通能力、服务意识、保密意识、公正客观',
        'tools_requirement': 'HR系统、Office、招聘平台'
    },
    '招聘专员/助理': {
        'category': '职能类',
        'description': '负责招聘工作，简历筛选、面试安排、人才库维护，支撑团队人才需求。',
        'professional_skills': '招聘流程、人才识别、简历筛选、面试安排、offer谈判、人才库运营',
        'certificate_requirements': '人力资源证书',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有招聘或猎头实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-9000元/月',
        'career_direction': '招聘专员、招聘主管、HRBP',
        'core_qualifications': '沟通能力、人才洞察、执行力、抗压能力',
        'tools_requirement': 'ATS系统、招聘平台、Office'
    },
    '市场专员': {
        'category': '市场类',
        'description': '负责市场推广工作，策划市场活动、提升品牌知名度、拓展市场渠道。',
        'professional_skills': '市场策划、活动执行、品牌推广、渠道拓展、媒体关系、数据分析',
        'certificate_requirements': '市场营销证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有市场或活动策划实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-12000元/月',
        'career_direction': '市场主管、市场经理、市场总监、CMO',
        'core_qualifications': '创意思维、执行力、沟通协调、数据思维',
        'tools_requirement': 'Office、设计工具、活动管理平台'
    },
    '质量管理': {
        'category': '管理类',
        'description': '负责质量管理体系建设，制定质量标准、监控质量指标、推动质量改进。',
        'professional_skills': '质量管理体系(QMS)、ISO标准、质量分析工具、过程改进、供应商管理、质量培训',
        'certificate_requirements': '质量工程师证书、ISO内审员、质量管理体系审核员',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有质量管理或质检实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '8000-18000元/月',
        'career_direction': '质量经理、质量总监、质量VP',
        'core_qualifications': '严谨细致、质量意识、改进思维、沟通协调',
        'tools_requirement': '质量管理系统、SPC工具、Office'
    },
    '质量管理/测试': {
        'category': '技术类',
        'description': '负责质量管理和测试工作，建立质量标准、执行测试、推动质量改进。',
        'professional_skills': '质量管理、测试用例设计、缺陷跟踪、质量分析、过程改进、统计工具',
        'certificate_requirements': '质量工程师证书、ISTQB认证',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有质量或测试实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-16000元/月',
        'career_direction': '质量主管、质量经理、测试经理',
        'core_qualifications': '质量意识、细心严谨、数据分析、改进思维',
        'tools_requirement': '质量管理工具、测试工具、Office'
    },
    '法务专员': {
        'category': '职能类',
        'description': '负责法务支持工作，合同审核、法律咨询、法律文件起草、处理法律纠纷。',
        'professional_skills': '合同审核、法律咨询、法律文书写作、法律检索、纠纷处理、合规审查',
        'certificate_requirements': '法律职业资格证书、企业法律顾问',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '有律所或企业法务实习经验',
        'education_requirement': '本科及以上(法学)',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-15000元/月',
        'career_direction': '法务主管、法务经理、法务总监',
        'core_qualifications': '法律专业扎实、逻辑严密、保密意识、沟通能力',
        'tools_requirement': '法律数据库、Office'
    },
    '法务专员/助理': {
        'category': '职能类',
        'description': '协助法务工作，合同整理、法律检索、文件归档等基础法务支持。',
        'professional_skills': '法律检索、合同整理、文件归档、法律文书起草、法律研究',
        'certificate_requirements': '法律职业资格考试通过',
        'innovation_ability': 2,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有律所或法务实习经验',
        'education_requirement': '本科及以上(法学)',
        'work_experience_requirement': '不限',
        'salary_range': '6000-12000元/月',
        'career_direction': '法务专员、法务主管',
        'core_qualifications': '法律基础、细心认真、保密意识、学习能力',
        'tools_requirement': '法律数据库、Office'
    },
    '商务专员': {
        'category': '销售类',
        'description': '负责商务合作工作，合同管理、合作对接、商务支持、商务流程优化。',
        'professional_skills': '商务谈判、合同管理、合作对接、方案撰写、数据分析、关系维护',
        'certificate_requirements': '商务证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有商务或市场实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-14000元/月',
        'career_direction': '商务经理、商务总监、VP',
        'core_qualifications': '沟通能力、商务思维、执行力、细节把控',
        'tools_requirement': 'Office、CRM系统、合同管理系统'
    },
    '采购专员': {
        'category': '职能类',
        'description': '负责采购工作，供应商管理、采购执行、价格谈判、采购成本控制。',
        'professional_skills': '供应商管理、采购流程、成本控制、合同谈判、供应商评估、市场调研',
        'certificate_requirements': '采购证书、CIPS认证',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有采购或供应链实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-12000元/月',
        'career_direction': '采购主管、采购经理、供应链总监',
        'core_qualifications': '成本意识、谈判能力、关系管理、抗压能力',
        'tools_requirement': 'ERP系统、采购平台、Office'
    },
    '物流专员': {
        'category': '运营类',
        'description': '负责物流运营工作，订单处理、物流跟踪、仓储管理、运输协调。',
        'professional_skills': '物流运营、仓储管理、运输协调、订单处理、物流系统操作、成本控制',
        'certificate_requirements': '物流证书',
        'innovation_ability': 3,
        'learning_ability': 3,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有物流或仓储实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '5000-10000元/月',
        'career_direction': '物流主管、物流经理、供应链经理',
        'core_qualifications': '执行能力强、细心认真、沟通协调、成本意识',
        'tools_requirement': 'WMS系统TMS系统Office'
    },
    '咨询顾问': {
        'category': '咨询类',
        'description': '为客户提供专业咨询服务，分析问题、提出解决方案、指导实施落地。',
        'professional_skills': '管理咨询、行业分析、报告撰写、PPT制作、演讲展示、客户沟通',
        'certificate_requirements': '管理咨询证书、行业认证',
        'innovation_ability': 5,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有咨询公司或行业研究实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '15000-30000元/月',
        'career_direction': '高级顾问、合伙人、创业者',
        'core_qualifications': '快速学习、逻辑思维、沟通表达、抗压能力',
        'tools_requirement': 'PPT、Excel、行业数据库'
    },
    '猎头顾问': {
        'category': '咨询类',
        'description': '负责高端人才猎取工作，挖掘候选人、匹配合适岗位、完成猎聘项目。',
        'professional_skills': '人才挖掘、候选人评估、岗位匹配、商务谈判、客户管理、行业研究',
        'certificate_requirements': '猎头证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有猎头或HR实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-25000元/月+提成',
        'career_direction': '猎头总监、合伙人、HRVP',
        'core_qualifications': '人才洞察、沟通能力、抗压能力、目标导向',
        'tools_requirement': '猎头系统、LinkedIn、Office'
    },
    '律师': {
        'category': '法律类',
        'description': '提供专业法律服务，处理诉讼案件、合同审核、法律咨询等法律事务。',
        'professional_skills': '法律诉讼、合同审核、法律咨询、法律文书、法律检索、出庭辩护',
        'certificate_requirements': '法律职业资格证书（律师执业证）',
        'innovation_ability': 3,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有律所实习或法律工作经验',
        'education_requirement': '本科及以上(法学)',
        'work_experience_requirement': '3-5年',
        'salary_range': '15000-50000元/月',
        'career_direction': '高级律师、合伙人、律所主任',
        'core_qualifications': '法律专业扎实、逻辑严密、口才表达、职业道德',
        'tools_requirement': '法律数据库、Office'
    },
    '律师助理': {
        'category': '法律类',
        'description': '协助律师处理法律事务，资料收集、法律检索、文件起草、案件跟进。',
        'professional_skills': '法律检索、资料收集、文书起草、案件跟进、客户沟通、文档管理',
        'certificate_requirements': '法律职业资格考试通过',
        'innovation_ability': 2,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有律所实习经验',
        'education_requirement': '本科及以上(法学)',
        'work_experience_requirement': '不限',
        'salary_range': '6000-12000元/月',
        'career_direction': '律师、高级律师、合伙人',
        'core_qualifications': '法律基础、细心认真、学习能力、沟通能力',
        'tools_requirement': '法律数据库、Office'
    },
    '翻译': {
        'category': '职能类',
        'description': '负责翻译工作，文档翻译、口译陪同、翻译校对，维护翻译质量。',
        'professional_skills': '翻译能力、语言功底、专业词汇、翻译工具、跨文化沟通',
        'certificate_requirements': '翻译专业证书 CATTI证书',
        'innovation_ability': 2,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有翻译实习或翻译作品',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '6000-15000元/月',
        'career_direction': '高级翻译、翻译主管、自由译者',
        'core_qualifications': '语言功底扎实、细心认真、知识面广、学习能力',
        'tools_requirement': '翻译工具CAT塔、Office'
    },
    '英语翻译': {
        'category': '职能类',
        'description': '负责英语翻译工作，文档翻译、会议口译、英文商务沟通。',
        'professional_skills': '英语翻译、口译能力、专业词汇、跨文化沟通、翻译校对',
        'certificate_requirements': 'CATTI二级笔译/口译证书',
        'innovation_ability': 2,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有英语翻译实习经验，专业八级',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-15000元/月',
        'career_direction': '高级英语翻译、翻译总监、自由译者',
        'core_qualifications': '英语精通、中文功底、跨文化沟通、专业词汇',
        'tools_requirement': '翻译工具、Office'
    },
    '日语翻译': {
        'category': '职能类',
        'description': '负责日语翻译工作，文档翻译、日语口译、日企商务沟通。',
        'professional_skills': '日语翻译、日语口译、日企文化、专业词汇、跨文化沟通',
        'certificate_requirements': 'N1证书 CATTI日语证书',
        'innovation_ability': 2,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有日语翻译实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-18000元/月',
        'career_direction': '高级日语翻译、日企管理、驻日代表',
        'core_qualifications': '日语N1、口译流利、专业词汇、文化理解',
        'tools_requirement': '翻译工具、Office'
    },
    '储备干部': {
        'category': '管理类',
        'description': '作为企业储备管理人才，经过系统培训后担任管理岗位。',
        'professional_skills': '轮岗学习、管理基础、业务流程、团队协作、问题分析、职业素养',
        'certificate_requirements': '管培生项目证书',
        'innovation_ability': 3,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '优秀应届毕业生，有学生会或社团经历',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '6000-12000元/月',
        'career_direction': '部门主管、部门经理、总监、VP',
        'core_qualifications': '学习能力强、执行力、抗压能力、领导潜质',
        'tools_requirement': 'Office、汇报工具'
    },
    '储备经理人': {
        'category': '管理类',
        'description': '作为企业储备管理干部，经过系统培养后胜任管理职位。',
        'professional_skills': '管理技能、业务能力、战略思维、团队领导、决策分析、沟通协调',
        'certificate_requirements': '管理培训证书',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '优秀毕业生，有管理实习或实践经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '8000-15000元/月',
        'career_direction': '中层管理、高管、创业者',
        'core_qualifications': '领导潜质、战略眼光、学习能力、执行力',
        'tools_requirement': 'Office、管理工具'
    },
    '管培生/储备干部': {
        'category': '管理类',
        'description': '管理培训生项目，培养未来管理人才，轮岗学习各业务模块。',
        'professional_skills': '轮岗学习、业务理解、管理基础、沟通协调、问题解决、职业规划',
        'certificate_requirements': '优秀毕业生证明',
        'innovation_ability': 3,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '优秀应届毕业生，学生干部或实习经历丰富',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '6000-15000元/月',
        'career_direction': '部门负责人、总监、总经理',
        'core_qualifications': '学习能力强、可塑性强、目标导向、适应能力',
        'tools_requirement': 'Office'
    },
    '项目专员/助理': {
        'category': '管理类',
        'description': '协助项目经理处理项目事务，跟进项目进度、整理项目文档、协调项目资源。',
        'professional_skills': '项目管理基础、进度跟进、文档整理、会议组织、问题记录、报告撰写',
        'certificate_requirements': 'PMP认证优先',
        'innovation_ability': 2,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有项目助理或实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-10000元/月',
        'career_direction': '项目经理、高级项目经理、项目总监',
        'core_qualifications': '细心认真、执行力、沟通协调、学习能力',
        'tools_requirement': 'Project、JIRA、Office'
    },
    '项目经理/主管': {
        'category': '管理类',
        'description': '负责项目全生命周期管理，计划制定、团队协调、进度控制、风险管理。',
        'professional_skills': '项目管理、团队管理、进度控制、风险管理、干系人管理、敏捷/Scrum',
        'certificate_requirements': 'PMP认证、PRINCE2认证',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有项目管理经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '3-5年',
        'salary_range': '15000-30000元/月',
        'career_direction': '高级项目经理、项目总监、PMO负责人',
        'core_qualifications': '组织协调、风险意识、决策能力、沟通表达',
        'tools_requirement': 'Project、JIRA、Confluence、钉钉'
    },
    '项目招投标': {
        'category': '商务类',
        'description': '负责招投标工作，编写投标文件、竞标谈判、合同签订，保障项目中标。',
        'professional_skills': '投标文件编写、标书制作、竞标策略、成本核算、合同谈判、关系维护',
        'certificate_requirements': '招标师证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '有招投标或商务实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-14000元/月',
        'career_direction': '招投标经理、商务总监',
        'core_qualifications': '细心严谨、执行力、成本意识、沟通能力',
        'tools_requirement': 'Office、标书制作工具'
    },
    '售后客服': {
        'category': '服务类',
        'description': '负责售后服务工作，处理客户问题、投诉处理、客户维护，提升客户满意度。',
        'professional_skills': '客户服务、投诉处理、问题解决、情绪管理、沟通协调、售后跟进',
        'certificate_requirements': '客服证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有客服实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '售后主管、客服经理、客户成功经理',
        'core_qualifications': '耐心、服务意识、情绪管理、抗压能力',
        'tools_requirement': '客服系统、CRM系统、Office'
    },
    '电话客服': {
        'category': '服务类',
        'description': '通过电话为客户提供咨询、解答、办理业务，处理客户需求和投诉。',
        'professional_skills': '电话沟通、问题解答、业务办理、投诉处理、情绪管理、客户维护',
        'certificate_requirements': '客服证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有电话客服实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '客服组长、客服主管、客服经理',
        'core_qualifications': '声音有亲和力、耐心、沟通能力、抗压能力',
        'tools_requirement': '呼叫中心系统、CRM系统'
    },
    '网络客服': {
        'category': '服务类',
        'description': '通过在线渠道为客户提供咨询和服务，解答疑问、处理问题、维护客户关系。',
        'professional_skills': '在线沟通、问题解答、情绪管理、售后处理、客户维护、数据统计',
        'certificate_requirements': '客服证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 4,
        'communication_ability': 5,
        'internship_requirement': '有客服实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '客服组长、客服主管、客户成功经理',
        'core_qualifications': '打字快、服务意识、耐心、沟通能力',
        'tools_requirement': '在线客服系统、CRM系统'
    },
    '培训师': {
        'category': '职能类',
        'description': '负责企业培训工作，课程开发、培训授课、培训效果跟进，提升员工能力。',
        'professional_skills': '课程开发、培训授课、讲师技能、需求分析、效果评估、培训管理',
        'certificate_requirements': '企业培训师证书、TTT认证',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 5,
        'internship_requirement': '有培训或教学实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-18000元/月',
        'career_direction': '高级培训师、培训经理、培训总监、首席学习官',
        'core_qualifications': '表达能力、控场能力、课程开发、学习能力',
        'tools_requirement': 'PPT、培训管理系统、在线培训平台'
    },
    '档案管理': {
        'category': '职能类',
        'description': '负责档案管理工作，档案收集、整理、归档、保管、利用，维护档案安全。',
        'professional_skills': '档案管理、档案整理、档案数字化、信息管理、保密意识',
        'certificate_requirements': '档案管理员证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 2,
        'communication_ability': 3,
        'internship_requirement': '有档案管理或文秘实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '档案主管、档案经理、行政经理',
        'core_qualifications': '细心认真、保密意识、条理性、耐心',
        'tools_requirement': '档案管理系统、Office'
    },
    '资料管理': {
        'category': '职能类',
        'description': '负责资料管理工作，资料收集、整理、归档、保管、借阅管理。',
        'professional_skills': '资料管理、档案整理、信息分类、保密意识、数字化处理',
        'certificate_requirements': '资料管理员证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 2,
        'communication_ability': 3,
        'internship_requirement': '有资料管理或文秘实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-7000元/月',
        'career_direction': '资料主管、行政专员',
        'core_qualifications': '细心认真、条理性、保密意识',
        'tools_requirement': '资料管理系统、Office'
    },
    '风电工程师': {
        'category': '技术类',
        'description': '负责风电场技术工作，风机运维、技术改造、故障诊断，保障风电场稳定运行。',
        'professional_skills': '风机运维、电气知识、机械原理、故障诊断、SCADA系统、技术改造',
        'certificate_requirements': '电工证、风电工程师证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有风电或电力系统实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-20000元/月',
        'career_direction': '风电主管、风电经理、风场场长',
        'core_qualifications': '电气/机械专业扎实、动手能力、安全意识',
        'tools_requirement': '风机控制系统、诊断工具、电气仪表'
    },
    '知识产权/专利代理': {
        'category': '技术类',
        'description': '负责知识产权工作，专利申请、专利检索、知识产权维权，保护企业创新成果。',
        'professional_skills': '专利申请、专利检索、技术理解、文件撰写、知识产权法律、专利分析',
        'certificate_requirements': '专利代理人证书',
        'innovation_ability': 3,
        'learning_ability': 5,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有专利或知识产权实习经验，理工科背景',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-25000元/月',
        'career_direction': '专利代理主管、知识产权经理、专利律师',
        'core_qualifications': '技术理解、法律基础、写作能力、学习能力',
        'tools_requirement': '专利检索系统、Office'
    },
    '统计员': {
        'category': '职能类',
        'description': '负责统计工作，数据收集、整理分析、报表编制，为决策提供数据支持。',
        'professional_skills': '统计分析、数据处理、Excel高级、报表制作、数据库操作、统计软件',
        'certificate_requirements': '统计师证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有统计或数据分析实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '5000-10000元/月',
        'career_direction': '统计主管、数据分析师、BI工程师',
        'core_qualifications': '数据敏感、细心认真、逻辑思维、保密意识',
        'tools_requirement': 'Excel、SPSS、SAS、SQL'
    },
    '总助/CEO助理/董事长助理': {
        'category': '管理类',
        'description': '作为高管助理，协助高管处理日常事务，安排日程、跟进决策、协调资源。',
        'professional_skills': '日程管理、会议组织、行程安排、文件撰写、关系维护、保密意识',
        'certificate_requirements': '秘书证书、MBA优先',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 5,
        'communication_ability': 5,
        'internship_requirement': '有高管助理或秘书实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-30000元/月',
        'career_direction': '高管秘书、运营总监、副总裁',
        'core_qualifications': '高情商、保密意识、执行力、抗压能力、全局思维',
        'tools_requirement': 'Office、高管支持工具'
    },
    '硬件测试': {
        'category': '技术类',
        'description': '负责硬件产品测试工作，测试用例设计、测试执行、问题跟踪，保证硬件质量。',
        'professional_skills': '硬件测试、测试用例设计、仪器使用、问题分析、测试报告撰写',
        'certificate_requirements': '硬件测试工程师证书',
        'innovation_ability': 3,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有硬件测试或电子实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '7000-15000元/月',
        'career_direction': '硬件测试主管、硬件QA、硬件经理',
        'core_qualifications': '细心严谨、电子基础、动手能力、分析能力',
        'tools_requirement': '示波器、万用表、测试夹具'
    },
    '质检员': {
        'category': '技术类',
        'description': '负责产品质量检验工作，来料检验、过程检验、成品检验，保证产品质量。',
        'professional_skills': '质量检验、品质控制、测量工具、缺陷识别、质量记录、问题反馈',
        'certificate_requirements': '质检员证书、质量工程师证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有质检或生产实习经验',
        'education_requirement': '大专及以上',
        'work_experience_requirement': '不限',
        'salary_range': '4000-8000元/月',
        'career_direction': '质检主管、质量工程师、品质经理',
        'core_qualifications': '细心严谨、质量意识、测量技能、执行力',
        'tools_requirement': '测量工具、质检设备'
    },
    '产品专员/助理': {
        'category': '产品类',
        'description': '协助产品经理工作，需求收集、产品调研、数据分析、文档撰写。',
        'professional_skills': '需求分析、产品调研、数据分析、PRD撰写、原型设计、项目跟进',
        'certificate_requirements': '产品经理证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有产品实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '6000-12000元/月',
        'career_direction': '产品经理、高级产品经理、产品总监',
        'core_qualifications': '用户思维、数据分析、学习能力、沟通协调',
        'tools_requirement': 'Axure、墨刀、XMind、SQL'
    },
    '内容审核': {
        'category': '运营类',
        'description': '负责内容审核工作，审核用户发布内容、处理违规内容、维护平台内容安全。',
        'professional_skills': '内容审核、风险识别、政策理解、敏感词过滤、违规处理',
        'certificate_requirements': '内容审核证书',
        'innovation_ability': 2,
        'learning_ability': 3,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有内容审核或客服实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '不限',
        'salary_range': '5000-10000元/月',
        'career_direction': '审核主管、审核经理、内容安全经理',
        'core_qualifications': '政治敏感度、细心耐心、判断力、抗压能力',
        'tools_requirement': '审核系统、风控平台'
    },
    'APP推广': {
        'category': '运营类',
        'description': '负责App推广工作，ASO优化、渠道推广、用户增长，提升App下载量。',
        'professional_skills': 'ASO优化、渠道推广、用户增长、数据分析、推广策划、投放运营',
        'certificate_requirements': '移动推广证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 4,
        'internship_requirement': '有App推广或运营实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-3年',
        'salary_range': '8000-18000元/月',
        'career_direction': '推广经理、增长负责人、运营总监',
        'core_qualifications': '数据思维、执行力、渠道敏感、用户思维',
        'tools_requirement': 'ASO工具、数据分析平台、投放平台'
    },
    '金融分析师': {
        'category': '金融类',
        'description': '负责金融分析工作，行业研究、公司分析、投资分析，为投资决策提供支持。',
        'professional_skills': '财务分析、行业研究、估值建模、投资分析、报告撰写、宏微观经济',
        'certificate_requirements': 'CFA证书、证券从业资格证',
        'innovation_ability': 4,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 4,
        'internship_requirement': '有金融分析实习经验，有CFA/CPA优先',
        'education_requirement': '硕士及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '15000-40000元/月',
        'career_direction': '高级分析师、投资总监、基金经理',
        'core_qualifications': '财务功底、建模能力、行业洞察、抗压能力',
        'tools_requirement': 'Bloomberg、Wind、Excel、Python'
    },
    '机械工程师': {
        'category': '技术类',
        'description': '负责机械设计和技术工作，产品设计、工程制图、技术改进，保障机械系统质量。',
        'professional_skills': '机械设计、SolidWorks/AutoCAD、工程制图、材料选用、工艺设计',
        'certificate_requirements': '机械工程师证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有机械设计实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '8000-18000元/月',
        'career_direction': '机械主管、机械经理、研发总监',
        'core_qualifications': '机械专业扎实、设计能力、动手能力、创新思维',
        'tools_requirement': 'SolidWorks、AutoCAD、CAE工具'
    },
    '电气工程师': {
        'category': '技术类',
        'description': '负责电气设计和技术工作，电气设计、PLC编程、系统调试，保障电气系统稳定。',
        'professional_skills': '电气设计、PLC编程、电路分析、电气图纸、自动控制、调试技术',
        'certificate_requirements': '电气工程师证书、电工证',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 3,
        'communication_ability': 3,
        'internship_requirement': '有电气设计或PLC实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '8000-18000元/月',
        'career_direction': '电气主管、电气经理、技术总监',
        'core_qualifications': '电气专业扎实、动手能力、问题解决、创新思维',
        'tools_requirement': 'PLC编程工具、CAD电气版、仿真工具'
    },
    '建筑工程师': {
        'category': '技术类',
        'description': '负责建筑工程技术工作，工程设计、技术指导、质量监督，保障工程质量和安全。',
        'professional_skills': '建筑设计、结构设计、施工图绘制、技术审核、BIM应用',
        'certificate_requirements': '建筑师证书、结构工程师证书',
        'innovation_ability': 4,
        'learning_ability': 4,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有建筑设计或施工实习经验',
        'education_requirement': '本科及以上',
        'work_experience_requirement': '1-5年',
        'salary_range': '10000-25000元/月',
        'career_direction': '建筑主管、建筑经理、项目总监',
        'core_qualifications': '建筑专业扎实、设计能力、规范理解、沟通协调',
        'tools_requirement': 'CAD、天正、Revit、PKPM'
    },
    '科研人员': {
        'category': '科研类',
        'description': '从事科学研究、技术研发工作，开展课题研究，撰写学术论文，推动技术创新。',
        'professional_skills': '文献检索与阅读、实验设计与操作、数据采集与分析、学术论文撰写、科研项目申报、专业软件使用（如MATLAB、SPSS）',
        'certificate_requirements': '英语六级/雅思、研究领域相关资质',
        'innovation_ability': 5,
        'learning_ability': 5,
        'pressure_resistance': 4,
        'communication_ability': 3,
        'internship_requirement': '有实验室研究经历，参与过科研项目',
        'education_requirement': '硕士及以上',
        'work_experience_requirement': '不限',
        'salary_range': '8000-20000元/月',
        'career_direction': '副研究员、研究员、学科带头人、项目负责人',
        'core_qualifications': '科研创新精神、学术诚信、抗压能力、持续学习能力',
        'tools_requirement': 'MATLAB、SPSS、Origin、LaTeX、EndNote'
    }
}

# 职业发展路径定义
CAREER_PATHS = {
    '技术类': {
        'vertical': [  # 技术晋升路线
            ('junior', 'middle', '高级工程师', 3),
            ('middle', 'senior', '资深工程师', 3),
            ('senior', 'expert', '技术专家', 3),
        ],
        'management': [  # 技术管理路线
            ('middle', 'lead', '技术组长', 2),
            ('lead', 'manager', '技术经理', 3),
            ('manager', 'director', '技术总监', 3),
        ],
        'cross': [  # 技术转其他路线
            ('middle', 'product', '产品经理', 2),
            ('middle', 'architecture', '架构师', 3),
        ]
    },
    '产品类': {
        'vertical': [
            ('assistant', 'specialist', '产品专员', 2),
            ('specialist', 'manager', '产品经理', 3),
            ('manager', 'senior', '高级产品经理', 3),
            ('senior', 'director', '产品总监', 4),
        ],
        'management': [
            ('manager', 'director', '产品线负责人', 3),
            ('director', 'vp', '产品VP', 4),
        ],
        'cross': [
            ('manager', 'operation', '运营总监', 3),
            ('specialist', 'operation', '运营专员', 2),
        ]
    },
    '运营类': {
        'vertical': [
            ('assistant', 'specialist', '运营专员', 2),
            ('specialist', 'manager', '运营主管', 3),
            ('manager', 'director', '运营总监', 4),
        ],
        'cross': [
            ('manager', 'product', '产品经理', 2),
            ('manager', 'marketing', '市场总监', 3),
        ]
    },
    '销售类': {
        'vertical': [
            ('rep', 'senior', '高级销售', 2),
            ('senior', 'manager', '销售主管', 3),
            ('manager', 'director', '销售总监', 4),
        ],
        'cross': [
            ('senior', 'bd', 'BD经理', 2),
            ('manager', 'operation', '销售运营', 2),
        ]
    },
    '设计类': {
        'vertical': [
            ('assistant', 'designer', '设计师', 2),
            ('designer', 'senior', '高级设计师', 3),
            ('senior', 'lead', '设计组长', 3),
            ('lead', 'director', '设计总监', 4),
        ],
        'cross': [
            ('senior', 'product', '产品经理', 2),
            ('designer', 'frontend', '前端开发', 2),
        ]
    },
    '管理类': {
        'vertical': [
            ('assistant', 'specialist', '主管', 2),
            ('specialist', 'manager', '经理', 3),
            ('manager', 'director', '总监', 3),
            ('director', 'vp', 'VP', 4),
        ],
        'cross': [
            ('manager', 'operation', '运营', 2),
            ('manager', 'product', '产品', 2),
        ]
    }
}

# 岗位转换图谱
TRANSFER_GRAPH = {
    '前端开发': [
        {'to': '后端开发工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Node.js、数据库、API设计', 'description': '前端转后端需要补充服务端编程能力'},
        {'to': 'UI设计', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Figma、设计规范、视觉基础', 'description': '前端转UI设计有天然优势'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'hard', 'skills': '产品思维、需求分析、数据分析', 'description': '转产品需补充商业思维'},
    ],
    'Java': [
        {'to': 'Python', 'type': 'direct', 'difficulty': 'easy', 'skills': 'Python语法、数据处理', 'description': 'Java转Python相对容易'},
        {'to': '算法工程师', 'type': 'direct', 'difficulty': 'hard', 'skills': '机器学习、数学基础', 'description': '需补充算法和数据科学知识'},
        {'to': '架构师', 'type': 'direct', 'difficulty': 'hard', 'skills': '架构设计、高并发、分布式', 'description': '晋升路线，需丰富经验'},
    ],
    'Python': [
        {'to': '算法工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': '机器学习框架、深度学习', 'description': 'Python是AI领域主流语言'},
        {'to': '数据分析师', 'type': 'direct', 'difficulty': 'easy', 'skills': '业务分析、数据可视化', 'description': '数据分析是Python强项'},
        {'to': '后端开发工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': 'Web框架、数据库', 'description': 'Flask/Django快速上手'},
    ],
    '后端开发工程师': [
        {'to': '前端开发', 'type': 'direct', 'difficulty': 'medium', 'skills': 'JavaScript、Vue/React', 'description': '全栈是趋势'},
        {'to': '运维工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Linux、Docker、K8s', 'description': 'DevOps是后端必备'},
        {'to': '架构师', 'type': 'direct', 'difficulty': 'hard', 'skills': '架构设计、微服务', 'description': '技术深度晋升路线'},
    ],
    '软件测试工程师': [
        {'to': '后端开发工程师', 'type': 'through', 'intermediate': '前端开发', 'difficulty': 'hard', 'skills': '编程语言、数据库', 'description': '需系统学习编程'},
        {'to': '实施工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '客户沟通、项目管理', 'description': '测试转实施有优势'},
        {'to': '质量管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '质量体系、流程管理', 'description': '质量是测试延伸'},
    ],
    '测试工程师': [
        {'to': '自动化测试', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Selenium、Appium', 'description': '测试自动化的趋势'},
        {'to': '后端开发工程师', 'type': 'through', 'intermediate': 'Python', 'difficulty': 'hard', 'skills': '编程、数据库', 'description': '需要系统学习'},
    ],
    '算法工程师': [
        {'to': '数据分析师', 'type': 'direct', 'difficulty': 'easy', 'skills': '业务理解、数据可视化', 'description': '算法转分析较容易'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '产品设计、用户思维', 'description': 'AI产品经理需求大'},
    ],
    '数据分析师': [
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '产品设计、项目管理', 'description': '数据驱动产品决策'},
        {'to': '算法工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': '机器学习、深度学习', 'description': '向AI方向发展'},
    ],
    '产品经理': [
        {'to': '运营总监', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营策略、团队管理', 'description': '产品转运营自然延伸'},
        {'to': 'UI设计', 'type': 'through', 'intermediate': '前端开发', 'difficulty': 'hard', 'skills': '设计技能', 'description': '需补充设计能力'},
    ],
    'UI设计': [
        {'to': '前端开发', 'type': 'direct', 'difficulty': 'medium', 'skills': 'JavaScript、框架', 'description': '懂设计的前端更受欢迎'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '产品思维、数据分析', 'description': '用户体验视角是优势'},
    ],
    'UI/UX设计师': [
        {'to': '前端开发', 'type': 'direct', 'difficulty': 'medium', 'skills': 'HTML/CSS、JavaScript', 'description': '设计实现一体化'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '需求分析、项目管理', 'description': 'UX思维助力产品设计'},
    ],
    '运营专员': [
        {'to': '产品经理', 'type': 'through', 'intermediate': '产品专员/助理', 'difficulty': 'hard', 'skills': '需求分析、原型设计', 'description': '需补充产品技能'},
        {'to': '新媒体运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '内容创作、社媒运营', 'description': '运营技能的深化'},
    ],
    '新媒体运营': [
        {'to': '电商运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '电商平台、数据分析', 'description': '新媒体+电商是趋势'},
        {'to': '内容运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '内容策划、用户洞察', 'description': '内容能力的专业化'},
    ],
    '电商运营': [
        {'to': '运营总监', 'type': 'direct', 'difficulty': 'hard', 'skills': '团队管理、战略规划', 'description': '管理能力晋升'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'hard', 'skills': '需求分析、产品设计', 'description': '需系统学习产品能力'},
    ],
    '销售代表': [
        {'to': 'BD经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '商务谈判、战略合作', 'description': '销售经验的升级'},
        {'to': '运营', 'type': 'direct', 'difficulty': 'medium', 'skills': '数据分析、运营策略', 'description': 'toB销售转运营有优势'},
    ],
    '运维工程师': [
        {'to': '后端开发工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': '编程语言、框架', 'description': '运维编程化趋势'},
        {'to': '架构师', 'type': 'direct', 'difficulty': 'hard', 'skills': '架构设计、DevOps', 'description': 'SRE是运维进阶方向'},
    ],
    '项目经理': [
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '需求分析、产品设计', 'description': '项目管理是产品基础'},
        {'to': '运营总监', 'type': 'direct', 'difficulty': 'medium', 'skills': '运营策略、数据分析', 'description': '项目经验助力运营'},
    ],
    '游戏运营': [
        {'to': '游戏推广', 'type': 'direct', 'difficulty': 'easy', 'skills': '渠道推广、商务谈判', 'description': '运营推广一体化'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '产品设计、用户研究', 'description': '游戏产品经理方向'},
    ],
    '游戏开发工程师': [
        {'to': '游戏运营', 'type': 'direct', 'difficulty': 'medium', 'skills': '运营策略、数据分析', 'description': '技术+运营复合型人才'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '产品设计、项目管理', 'description': '游戏产品经理'},
    ],
    '财务专员': [
        {'to': '金融分析师', 'type': 'direct', 'difficulty': 'medium', 'skills': '金融知识、建模能力', 'description': '财务转金融分析'},
        {'to': '法务专员', 'type': 'direct', 'difficulty': 'hard', 'skills': '法律知识、证书', 'description': '需法律背景'},
    ],
    '人力资源专员': [
        {'to': '猎头顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '人才挖掘、谈判', 'description': 'HR转猎头有优势'},
        {'to': '行政专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '行政管理', 'description': '职能类互转容易'},
    ],
    '行政专员': [
        {'to': '总助/CEO助理/董事长助理', 'type': 'direct', 'difficulty': 'medium', 'skills': '高管支持、战略理解', 'description': '行政进阶方向'},
        {'to': '运营', 'type': 'direct', 'difficulty': 'medium', 'skills': '运营技能', 'description': '行政转运营'},
    ],
    '项目经理/主管': [
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '产品设计、用户研究', 'description': '项目管理是产品基础'},
        {'to': '运营总监', 'type': 'direct', 'difficulty': 'medium', 'skills': '运营策略、团队管理', 'description': '项目经验助力运营'},
    ],
    '质量管理': [
        {'to': '软件测试工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '测试技术、自动化', 'description': '质量与测试互通'},
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '项目计划、团队协调', 'description': '质量经理晋升路线'},
    ],
    '法务专员': [
        {'to': '律师', 'type': 'direct', 'difficulty': 'medium', 'skills': '诉讼经验、专业领域', 'description': '资深法务晋升'},
        {'to': '知识产权/专利代理', 'type': 'direct', 'difficulty': 'medium', 'skills': '专利知识、技术背景', 'description': '需理工科背景'},
    ],
    '商务专员': [
        {'to': 'BD经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '战略合作、商务谈判', 'description': '商务进阶方向'},
        {'to': '销售运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '数据分析、CRM运营', 'description': '商务运营一体化'},
    ],
    '培训师': [
        {'to': '人力资源专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '招聘模块、员工关系', 'description': '培训是HR一部分'},
        {'to': '咨询顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '行业知识、咨询方法', 'description': '培训师转咨询'},
    ],
    '科研人员': [
        {'to': '算法工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': '机器学习、工程能力', 'description': '科研转AI工程'},
        {'to': '咨询顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '行业知识、沟通能力', 'description': '学术背景助力咨询'},
    ],
    '机械工程师': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '项目管理、团队协调', 'description': '技术转管理'},
        {'to': '电气工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '电气知识', 'description': '机电一体化趋势'},
    ],
    '电气工程师': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '项目管理、团队协调', 'description': '技术转管理'},
        {'to': '机械工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '机械设计', 'description': '机电一体化趋势'},
    ],
    '建筑工程师': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '项目管理、团队协调', 'description': '建筑行业项目经理'},
        {'to': '质量管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '质量体系', 'description': '建筑质量管理'},
    ],
    '金融分析师': [
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '产品设计、用户思维', 'description': '金融产品经理方向'},
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '项目管理', 'description': '投资项目管理'},
    ],
    '咨询顾问': [
        {'to': '猎头顾问', 'type': 'direct', 'difficulty': 'easy', 'skills': '人才挖掘', 'description': '咨询转猎头'},
        {'to': '培训师', 'type': 'direct', 'difficulty': 'easy', 'skills': '授课技巧', 'description': '咨询转培训'},
    ],
    '律师': [
        {'to': '法务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '企业内部运作', 'description': '律所转企业法务'},
        {'to': '知识产权/专利代理', 'type': 'direct', 'difficulty': 'medium', 'skills': '专利知识', 'description': '需理工科背景加分'},
    ],
    '律师助理': [
        {'to': '律师', 'type': 'direct', 'difficulty': 'medium', 'skills': '诉讼经验', 'description': '执业律师晋升'},
        {'to': '法务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '企业内部运作', 'description': '企业法务方向'},
    ],
    '翻译': [
        {'to': '猎头顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '人才挖掘、商务沟通', 'description': '语言优势助力猎头'},
        {'to': '培训师', 'type': 'direct', 'difficulty': 'medium', 'skills': '授课技巧', 'description': '语言培训方向'},
    ],
    '英语翻译': [
        {'to': '猎头顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '人才挖掘', 'description': '英语优势助力猎头'},
        {'to': '咨询顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '行业知识', 'description': '英语+咨询'},
    ],
    '日语翻译': [
        {'to': '猎头顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '人才挖掘', 'description': '日语优势助力猎头'},
        {'to': '总助/CEO助理/董事长助理', 'type': 'direct', 'difficulty': 'medium', 'skills': '高管支持', 'description': '日企高管助理'},
    ],
    '储备干部': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '项目管理', 'description': '管培生常见方向'},
        {'to': '运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '管培生常见方向'},
    ],
    '储备经理人': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '项目管理', 'description': '管理培训路线'},
        {'to': '运营总监', 'type': 'direct', 'difficulty': 'medium', 'skills': '运营策略', 'description': '管理晋升方向'},
    ],
    '管培生/储备干部': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '项目管理', 'description': '项目管理方向'},
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '产品技能', 'description': '产品方向'},
    ],
    '项目专员/助理': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '项目管理、PMP', 'description': '晋升为项目经理'},
        {'to': '项目招投标', 'type': 'direct', 'difficulty': 'easy', 'skills': '招投标知识', 'description': '项目招投标方向'},
    ],
    '项目招投标': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '项目管理能力', 'description': '招投标转项目管理'},
        {'to': '商务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '商务技能', 'description': '商务方向'},
    ],
    '售后客服': [
        {'to': '电话客服', 'type': 'direct', 'difficulty': 'easy', 'skills': '电话沟通', 'description': '服务类互转'},
        {'to': '网络客服', 'type': 'direct', 'difficulty': 'easy', 'skills': '在线沟通', 'description': '服务类互转'},
    ],
    '电话客服': [
        {'to': '售后客服', 'type': 'direct', 'difficulty': 'easy', 'skills': '售后处理', 'description': '客服类互转'},
        {'to': '销售代表', 'type': 'direct', 'difficulty': 'easy', 'skills': '销售技巧', 'description': '客服转销售'},
    ],
    '网络客服': [
        {'to': '售后客服', 'type': 'direct', 'difficulty': 'easy', 'skills': '售后处理', 'description': '客服类互转'},
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '客服转运营'},
    ],
    '档案管理': [
        {'to': '资料管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '资料整理', 'description': '职能类互转'},
        {'to': '行政专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '行政管理', 'description': '行政方向'},
    ],
    '资料管理': [
        {'to': '档案管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '档案管理', 'description': '职能类互转'},
        {'to': '行政专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '行政管理', 'description': '行政方向'},
    ],
    '风电工程师': [
        {'to': '项目经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '项目管理', 'description': '技术转管理'},
        {'to': '电气工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '电气知识', 'description': '风电电气互通'},
    ],
    '知识产权/专利代理': [
        {'to': '律师', 'type': 'direct', 'difficulty': 'medium', 'skills': '诉讼经验', 'description': '专利律师方向发展'},
        {'to': '法务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '企业法务', 'description': '企业知产管理'},
    ],
    '统计员': [
        {'to': '数据分析师', 'type': 'direct', 'difficulty': 'easy', 'skills': 'Python、BI工具', 'description': '统计转分析'},
        {'to': '金融分析师', 'type': 'direct', 'difficulty': 'medium', 'skills': '金融知识', 'description': '需补充金融知识'},
    ],
    '总助/CEO助理/董事长助理': [
        {'to': '运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '高管助理转运营'},
        {'to': '行政专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '行政管理', 'description': '行政方向'},
    ],
    '硬件测试': [
        {'to': '质检员', 'type': 'direct', 'difficulty': 'easy', 'skills': '质检流程', 'description': '测试质检互通'},
        {'to': '实施工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': '项目管理、客户沟通', 'description': '技术支持方向'},
    ],
    '质检员': [
        {'to': '硬件测试', 'type': 'direct', 'difficulty': 'easy', 'skills': '测试技术', 'description': '质检测试互通'},
        {'to': '质量管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '质量体系', 'description': '质量管理晋升'},
    ],
    '产品专员/助理': [
        {'to': '产品经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '产品设计、用户研究', 'description': '产品晋升路线'},
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '运营方向'},
    ],
    '内容审核': [
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '内容运营方向'},
        {'to': '网络客服', 'type': 'direct', 'difficulty': 'easy', 'skills': '客户服务', 'description': '客服方向'},
    ],
    'APP推广': [
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营基础', 'description': '运营技能延伸'},
        {'to': '电商运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '电商平台', 'description': '电商运营方向'},
    ],
    '游戏推广': [
        {'to': '游戏运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营策略、数据分析', 'description': '推广转运营'},
        {'to': '市场专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '市场策划', 'description': '市场方向'},
    ],
    '大客户代表': [
        {'to': 'BD经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '商务谈判', 'description': '大客户销售升级'},
        {'to': '销售经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '团队管理', 'description': '销售管理晋升'},
    ],
    '广告销售': [
        {'to': 'BD经理', 'type': 'direct', 'difficulty': 'medium', 'skills': '战略合作', 'description': '广告销售升级'},
        {'to': '市场专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '市场策划', 'description': '市场方向'},
    ],
    '销售助理': [
        {'to': '销售代表', 'type': 'direct', 'difficulty': 'easy', 'skills': '销售技巧', 'description': '销售晋升路线'},
        {'to': '商务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '商务技能', 'description': '商务方向'},
    ],
    '销售工程师': [
        {'to': 'BD经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '商务谈判', 'description': '技术销售升级'},
        {'to': '销售经理', 'type': 'direct', 'difficulty': 'easy', 'skills': '团队管理', 'description': '管理晋升'},
    ],
    '销售运营': [
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '运营扩展'},
        {'to': '商务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '商务技能', 'description': '商务方向'},
    ],
    '社区运营': [
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营基础', 'description': '运营扩展'},
        {'to': '新媒体运营', 'type': 'direct', 'difficulty': 'easy', 'skills': '内容创作', 'description': '新媒体方向'},
    ],
    '物流专员': [
        {'to': '运营专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '运营技能', 'description': '运营方向'},
        {'to': '质量管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '质量体系', 'description': '质量方向'},
    ],
    '招聘专员/助理': [
        {'to': '人力资源专员', 'type': 'direct', 'difficulty': 'easy', 'skills': 'HR模块', 'description': 'HR晋升'},
        {'to': '猎头顾问', 'type': 'direct', 'difficulty': 'medium', 'skills': '人才挖掘', 'description': '猎头方向'},
    ],
    '法务专员/助理': [
        {'to': '法务专员', 'type': 'direct', 'difficulty': 'easy', 'skills': '法律实务', 'description': '法务晋升'},
        {'to': '律师助理', 'type': 'direct', 'difficulty': 'easy', 'skills': '诉讼经验', 'description': '律师方向'},
    ],
    'C/C++': [
        {'to': 'Java', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Java语言', 'description': 'C++转Java较容易'},
        {'to': '后端开发工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Web开发', 'description': '后端开发方向'},
        {'to': '游戏开发工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '游戏引擎', 'description': 'C++游戏开发优势'},
    ],
    '前端开发': [
        {'to': 'UI/UX设计师', 'type': 'direct', 'difficulty': 'medium', 'skills': '设计规范、审美', 'description': '前端设计师一体化'},
        {'to': '后端开发工程师', 'type': 'direct', 'difficulty': 'medium', 'skills': 'Node.js', 'description': '全栈发展趋势'},
    ],
    '软件测试': [
        {'to': '测试工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '测试技术', 'description': '测试技能提升'},
        {'to': '实施工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '客户沟通', 'description': '技术支持方向'},
    ],
    '质量管理/测试': [
        {'to': '质量管理', 'type': 'direct', 'difficulty': 'easy', 'skills': '质量体系', 'description': '质量专业化'},
        {'to': '软件测试工程师', 'type': 'direct', 'difficulty': 'easy', 'skills': '测试技术', 'description': '测试技术化'},
    ],
}

def main():
    # 获取环境变量
    env_vars = get_env_vars()
    
    # 连接数据库
    conn = get_db_connection(env_vars)
    cur = conn.cursor()
    
    print("=== 开始生成数据 ===\n")
    
    # 1. 清空现有数据
    print("1. 清空现有数据...")
    cur.execute("DELETE FROM job_transfer_graph")
    cur.execute("DELETE FROM career_paths")
    cur.execute("DELETE FROM job_profiles")
    conn.commit()
    print("   已清空 job_profiles, career_paths, job_transfer_graph\n")
    
    # 2. 生成岗位画像
    print("2. 生成岗位画像...")
    profiles = []
    profile_id_map = {}  # profile_name -> id
    
    for job_title, template in PROFILE_TEMPLATES.items():
        cur.execute("""
            INSERT INTO job_profiles (
                profile_name, category, description, professional_skills,
                certificate_requirements, innovation_ability, learning_ability,
                pressure_resistance, communication_ability, internship_requirement,
                education_requirement, work_experience_requirement, salary_range,
                career_direction, core_qualifications, tools_requirement, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            job_title,
            template['category'],
            template['description'],
            template['professional_skills'],
            template['certificate_requirements'],
            template['innovation_ability'],
            template['learning_ability'],
            template['pressure_resistance'],
            template['communication_ability'],
            template['internship_requirement'],
            template['education_requirement'],
            template['work_experience_requirement'],
            template['salary_range'],
            template['career_direction'],
            template['core_qualifications'],
            template['tools_requirement']
        ))
        profile_id = cur.fetchone()[0]
        profile_id_map[job_title] = profile_id
        profiles.append(job_title)
    
    conn.commit()
    print(f"   已生成 {len(profiles)} 个岗位画像\n")
    
    # 3. 生成晋升路径
    print("3. 生成晋升路径...")
    path_count = 0
    
    # 为每个画像生成晋升路径
    for job_title, profile_id in profile_id_map.items():
        template = PROFILE_TEMPLATES.get(job_title)
        if not template:
            continue
        
        category = template['category']
        
        # 获取该类别的晋升路径配置
        if category in CAREER_PATHS:
            cat_paths = CAREER_PATHS[category]
            
            # 技术晋升路线
            if 'vertical' in cat_paths:
                for from_level, to_level, title, years in cat_paths['vertical']:
                    is_recommended = from_level == 'middle' or from_level == 'senior'
                    path_description = f"{job_title}从{from_level}级晋升到{to_level}级，需要{years}年经验"
                    
                    cur.execute("""
                        INSERT INTO career_paths (
                            from_job_id, to_job_id, path_type, difficulty,
                            years_required, additional_skills, additional_certificates,
                            promotion_conditions, salary_changes, created_at, is_recommended,
                            path_description
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s)
                    """, (
                        profile_id, profile_id, 'vertical', 'medium',
                        years, '深入技术领域、架构设计能力', '高级认证',
                        f'有{years}年以上{job_title}经验，技术深度突出',
                        f'+30%~50%', is_recommended, path_description
                    ))
                    path_count += 1
            
            # 管理晋升路线
            if 'management' in cat_paths:
                for from_level, to_level, title, years in cat_paths['management']:
                    is_recommended = from_level == 'lead' or from_level == 'manager'
                    path_description = f"{job_title}从技术岗晋升为管理岗，需要{years}年经验"
                    
                    cur.execute("""
                        INSERT INTO career_paths (
                            from_job_id, to_job_id, path_type, difficulty,
                            years_required, additional_skills, additional_certificates,
                            promotion_conditions, salary_changes, created_at, is_recommended,
                            path_description
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s)
                    """, (
                        profile_id, profile_id, 'management', 'hard',
                        years, '团队管理、项目管理、沟通协调', 'PMP认证、管理培训',
                        f'有{years}年以上经验，有团队管理经验',
                        f'+40%~60%', is_recommended, path_description
                    ))
                    path_count += 1
            
            # 跨职能发展路线
            if 'cross' in cat_paths:
                for from_level, to_job, title, years in cat_paths['cross']:
                    if to_job in profile_id_map:
                        is_recommended = True
                        path_description = f"{job_title}转型为{to_job}，需要{years}年经验"
                        
                        cur.execute("""
                            INSERT INTO career_paths (
                                from_job_id, to_job_id, path_type, difficulty,
                                years_required, additional_skills, additional_certificates,
                                promotion_conditions, salary_changes, created_at, is_recommended,
                                path_description
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s)
                        """, (
                            profile_id, profile_id_map[to_job], 'horizontal', 'medium',
                            years, f'{to_job}核心技能', f'{to_job}认证',
                            f'有{to_job}相关经验，技能储备充足',
                            '视情况而定', is_recommended, path_description
                        ))
                        path_count += 1
    
    conn.commit()
    print(f"   已生成 {path_count} 条晋升路径\n")
    
    # 4. 生成换岗图谱
    print("4. 生成换岗图谱...")
    transfer_count = 0
    
    for from_job, transfers in TRANSFER_GRAPH.items():
        if from_job not in profile_id_map:
            continue
        
        from_id = profile_id_map[from_job]
        
        for transfer in transfers:
            to_job = transfer['to']
            if to_job not in profile_id_map:
                continue
            
            to_id = profile_id_map[to_job]
            path_type = transfer['type']
            difficulty = transfer['difficulty']
            skills = transfer['skills']
            description = transfer['description']
            
            # 确定中间岗位
            intermediate_id = None
            steps_required = 1
            if path_type == 'through' and 'intermediate' in transfer:
                intermediate = transfer['intermediate']
                if intermediate in profile_id_map:
                    intermediate_id = profile_id_map[intermediate]
                    steps_required = 2
            
            # 血缘关系判断
            blood_relationship = 'direct'
            if path_type == 'through':
                blood_relationship = 'family'
            
            # 薪资影响估算
            salary_impact = '平稳'
            if to_job in ['算法工程师', '金融分析师', '产品总监']:
                salary_impact = '+20%~40%'
            elif to_job in ['运营', '行政']:
                salary_impact = '-10%~20%'
            
            # 推荐度
            is_recommended = difficulty in ['easy', 'medium']
            
            cur.execute("""
                INSERT INTO job_transfer_graph (
                    from_job_id, to_job_id, path_type, intermediate_job_id,
                    transfer_difficulty, steps_required, additional_skills,
                    additional_certificates, transfer_conditions, salary_impact,
                    transfer_tips, blood_relationship, is_recommended, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                from_id, to_id, path_type, intermediate_id,
                difficulty, steps_required, skills,
                f'{to_job}相关证书', f'有{to_job}经验优先',
                salary_impact, description, blood_relationship, is_recommended
            ))
            transfer_count += 1
    
    conn.commit()
    print(f"   已生成 {transfer_count} 条换岗图谱\n")
    
    # 5. 输出统计
    print("=== 数据生成完成 ===\n")
    print("统计:")
    cur.execute("SELECT COUNT(*) FROM job_profiles")
    print(f"  - 岗位画像: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM career_paths")
    print(f"  - 晋升路径: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM job_transfer_graph")
    print(f"  - 换岗图谱: {cur.fetchone()[0]}")
    
    cur.close()
    conn.close()
    
    print("\n数据已成功生成!")

if __name__ == '__main__':
    main()
