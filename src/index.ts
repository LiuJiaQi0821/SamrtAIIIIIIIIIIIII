import './index.css'

// 画像数据结构
interface ProfileData {
  resumeScore?: any
  abilityAnalysis?: any
  studentProfile?: any
}

// 当前页面实例的卡片更新函数（由 createApp 设置）
let currentUpdateCardFn: ((profile: ProfileData) => void) | null = null

// 处理画像数据的函数 - 直接更新卡片
function handleProfileData(data: Record<string, unknown>) {
  console.log('handleProfileData called with:', JSON.stringify(data).substring(0, 300))
  if (!data || !data.type || !data.data) {
    console.log('handleProfileData: missing type or data')
    return
  }
  
  const type = data.type as string
  const profileData = data.data
  console.log('handleProfileData: processing type:', type)
  
  // 存储画像数据到 localStorage
  try {
    const existingProfile: ProfileData = JSON.parse(localStorage.getItem('studentProfile') || '{}')
    console.log('Existing profile keys:', Object.keys(existingProfile))
    
    if (type === 'resume_score') {
      existingProfile.resumeScore = profileData
    } else if (type === 'ability_analysis') {
      existingProfile.abilityAnalysis = profileData
    } else if (type === 'student_profile') {
      existingProfile.studentProfile = profileData
    } else {
      console.log('handleProfileData: unknown type:', type)
    }
    
    console.log('Updated profile keys:', Object.keys(existingProfile))
    
    // 保存到 localStorage
    localStorage.setItem('studentProfile', JSON.stringify(existingProfile))
    
    // 直接调用卡片更新函数（立即刷新）
    if (currentUpdateCardFn) {
      console.log('Calling updateProfileCardFn...')
      currentUpdateCardFn(existingProfile)
    } else {
      console.log('currentUpdateCardFn is null!')
    }
  } catch (error) {
    console.error('Error handling profile data:', error)
  }
}

// 左右分栏布局 - 左边卡片展示，右边对话界面
function createApp() {
  const app = document.getElementById('app')
  if (!app) return

  // 设置全局回调函数，让 handleProfileData 能够直接更新卡片
  const updateProfileCardWrapper = (profile: ProfileData) => {
    updateProfileCard(profile)
  }
  currentUpdateCardFn = updateProfileCardWrapper

  app.innerHTML = `
    <div class="h-screen flex flex-col lg:flex-row overflow-hidden backdrop-blur-sm page-background">
      <!-- 移动端顶部导航 -->
      <header class="lg:hidden flex items-center justify-between px-4 py-3 min-h-[48px]">
        <h1 id="mobile-title" class="text-xl font-semibold text-gray-700 truncate pr-2">职业规划过程展示</h1>
        <div class="flex gap-2 flex-shrink-0">
          <button id="tab-cards" class="tab-btn px-3 py-1.5 text-sm font-medium rounded-lg active">
            卡片
          </button>
          <button id="tab-chat" class="tab-btn px-3 py-1.5 text-sm font-medium rounded-lg">
            对话
          </button>
        </div>
      </header>

      <!-- 左侧卡片展示区 (75%) -->
      <aside id="cards-panel" class="hidden lg:block w-full lg:w-3/4 h-1/2 lg:h-full overflow-auto sidebar-background">
        <div class="h-full flex flex-col">
          <!-- PC端标题 -->
          <div class="hidden lg:flex items-center px-4 py-3">
            <h2 class="text-xl font-semibold text-gray-700">职业规划过程展示</h2>
          </div>
          <div class="flex-1 flex items-center justify-center p-8">
            <div class="text-center">
              <div class="w-24 h-24 mx-auto mb-4 rounded-full bg-white/60 flex items-center justify-center shadow-sm">
                <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <p class="text-gray-500 text-sm">暂无卡片内容</p>
              <p class="text-gray-400 text-xs mt-1">上传简历后将在此展示分析结果</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧对话界面 (25%) -->
      <main id="chat-panel" class="w-full lg:w-1/4 h-full flex flex-col min-h-0 rounded-t-2xl lg:rounded-none chat-panel-background">
        <!-- PC端标题 -->
        <div class="hidden lg:block px-4 py-3">
          <h2 class="text-xl font-semibold text-gray-700">小职引职业规划助手</h2>
        </div>
        <!-- 对话消息区域 -->
        <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="flex gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/ai-avatar.png" alt="AI" class="w-full h-full object-cover" />
            </div>
            <div class="rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] chat-message-assistant">
              <p class="text-sm text-gray-700 leading-relaxed">您好！我是小职引职业规划助手 🤝<br/><br/>请告诉我您的职业困惑或目标，让我们开始聊聊吧！您也可以上传简历或其他职业相关文件，我会为您进行分析和建议。</p>
            </div>
          </div>
        </div>
        
        <!-- 输入区域 -->
        <div class="p-4 space-y-3">
          <!-- 岗位搜索与筛选栏 -->
          <div class="search-filter-bar">
            <div class="search-filter-header">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <span class="search-filter-title">岗位搜索与筛选</span>
            </div>
            <div class="search-filter-tags">
              <button class="filter-tag" data-filter="industry">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span>行业</span>
              </button>
              <button class="filter-tag" data-filter="salary">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>薪资</span>
              </button>
              <button class="filter-tag" data-filter="location">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <span>地点</span>
              </button>
              <button class="filter-tag" data-filter="company">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span>公司性质</span>
              </button>
              <button class="filter-tag" data-filter="size">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <span>公司规模</span>
              </button>
              <button class="filter-tag" data-filter="jobType">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span>岗位类型</span>
              </button>
            </div>
            <!-- 搜索框和搜索按钮 -->
            <div class="search-row">
              <div class="keyword-search-wrapper">
                <input 
                  type="text" 
                  id="keyword-search"
                  class="keyword-search-input" 
                  placeholder="输入关键词搜索岗位..."
                />
              </div>
              <button id="search-btn" class="search-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <span>搜索</span>
              </button>
            </div>
            <!-- 筛选结果展示 -->
            <div id="filter-results" class="filter-results hidden"></div>
          </div>

          <!-- 文件预览悬浮框 -->
          <div id="file-preview" class="hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl" style="box-shadow: 3px 3px 8px rgba(0, 130, 200, 0.15), -2px -2px 6px rgba(255, 255, 255, 0.5); transition: all 0.25s ease;">
            <div id="file-icon-wrapper" class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
              <span id="file-icon-text" class="text-xs font-medium"></span>
            </div>
            <span id="file-name" class="text-xs text-gray-600 whitespace-nowrap max-w-[200px] truncate"></span>
            <button id="remove-file" class="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/60 transition-colors flex-shrink-0">
              <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="flex gap-3 items-center">
            <div class="message-input relative flex-1 h-12 rounded-full overflow-hidden">
              <div class="placeholder-scroll absolute inset-0 flex items-center px-3 text-sm text-gray-400 z-0" id="input-placeholder">
                <span class="placeholder-text whitespace-nowrap">输入消息，上传简历文件或者点击右侧录入简历信息</span>
              </div>
              <input 
                type="text" 
                id="message-input"
                class="absolute inset-0 w-full h-full px-3 bg-transparent text-sm text-gray-700 outline-none z-10"
              />
            </div>
            <button id="manual-input-btn" class="action-btn w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95" title="手动录入简历">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button id="upload-btn" class="action-btn w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
            <input type="file" id="file-input" class="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp" />
            <button id="stop-btn" class="action-btn w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hidden">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2"></rect>
              </svg>
            </button>
            <button id="send-btn" class="action-btn w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95">
              <svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </main>

      <!-- 自定义确认对话框 -->
      <div id="confirm-dialog" class="confirm-dialog-overlay">
        <div class="confirm-dialog">
          <div class="confirm-icon">
            <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 class="confirm-title">确认删除</h3>
          <p id="confirm-message" class="confirm-message">确定要删除吗？</p>
          <div class="confirm-buttons">
            <button type="button" id="confirm-cancel" class="confirm-btn confirm-btn-cancel">取消</button>
            <button type="button" id="confirm-ok" class="confirm-btn confirm-btn-ok">确定</button>
          </div>
        </div>
      </div>

      <!-- 岗位详情弹窗 -->
      <div id="job-detail-modal" class="job-detail-overlay">
        <div class="job-detail-modal">
          <div class="job-detail-header">
            <h3 id="job-detail-title" class="job-detail-title"></h3>
            <button id="close-job-detail" class="job-detail-close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div id="job-detail-content" class="job-detail-content">
            <!-- 动态内容 -->
          </div>
          <div class="job-detail-footer">
            <button id="send-to-ai-btn" class="send-to-ai-btn">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              发送给AI分析
            </button>
          </div>
        </div>
      </div>

    <!-- 简历录入表单模态框 -->
    <div id="resume-modal" class="modal-overlay">
      <div class="form-modal">
        <!-- 步骤指示器 -->
        <div class="step-indicator">
          <div class="step-dot active" data-step="1"></div>
          <div class="step-dot" data-step="2"></div>
          <div class="step-dot" data-step="3"></div>
          <div class="step-dot" data-step="4"></div>
          <div class="step-dot" data-step="5"></div>
        </div>

        <!-- 步骤1：基本信息 -->
        <div class="form-content">
          <div class="form-step active" data-step="1">
            <h3 class="step-title">基本信息</h3>
            <p class="step-desc">请填写您的基本信息</p>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label required-label">姓名 <span class="required-tag">必填</span></label>
                <input type="text" id="resume-name" class="form-input" placeholder="请输入姓名" />
              </div>
              <div class="form-group">
                <label class="form-label">性别</label>
                <input type="text" id="resume-gender" class="form-input" placeholder="男/女" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label required-label">出生年月 <span class="required-tag">必填</span></label>
                <input type="text" id="resume-birth" class="form-input" placeholder="如：1996.05" />
              </div>
              <div class="form-group">
                <label class="form-label">民族</label>
                <input type="text" id="resume-nation" class="form-input" placeholder="如：汉族" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">联系电话</label>
                <input type="text" id="resume-phone" class="form-input" placeholder="请输入手机号" />
              </div>
              <div class="form-group">
                <label class="form-label">邮箱</label>
                <input type="text" id="resume-email" class="form-input" placeholder="请输入邮箱" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required-label">所在城市 <span class="required-tag">必填</span></label>
              <input type="text" id="resume-city" class="form-input" placeholder="如：广东省广州市" />
            </div>
            <div class="form-group">
              <label class="form-label required-label">求职意向 <span class="required-tag">必填</span></label>
              <input type="text" id="resume-goal" class="form-input" placeholder="如：市场专员" />
            </div>
          </div>

          <!-- 步骤2：教育背景 -->
          <div class="form-step" data-step="2">
            <h3 class="step-title">教育背景</h3>
            <p class="step-desc">请填写您的教育经历</p>
            <div class="form-group">
              <label class="form-label required-label">毕业院校 <span class="required-tag">必填</span></label>
              <input type="text" id="resume-school" class="form-input" placeholder="请输入学校名称" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label required-label">学历 <span class="required-tag">必填</span></label>
                <input type="text" id="resume-degree" class="form-input" placeholder="如：本科" />
              </div>
              <div class="form-group">
                <label class="form-label required-label">专业 <span class="required-tag">必填</span></label>
                <input type="text" id="resume-major" class="form-input" placeholder="如：市场营销" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label required-label">毕业时间 <span class="required-tag">必填</span></label>
              <input type="text" id="resume-graduation" class="form-input" placeholder="如：2020.07" />
            </div>
            <div class="form-group">
              <label class="form-label">主修课程（可选）</label>
              <textarea id="resume-courses" class="form-input form-textarea" placeholder="请输入主修课程，多个课程用顿号分隔"></textarea>
            </div>
          </div>

          <!-- 步骤3：工作经历 -->
          <div class="form-step" data-step="3">
            <h3 class="step-title">工作经历</h3>
            <p class="step-desc">请填写您的工作经历</p>
            <div id="work-experience-container">
              <div class="work-experience-item" data-index="0">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs text-gray-500 work-item-label">第1段工作经历</span>
                  <button type="button" class="remove-work-btn hidden text-red-500 hover:text-red-600 text-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div class="form-group">
                  <label class="form-label">公司名称</label>
                  <input type="text" class="form-input work-company" placeholder="请输入公司名称" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">职位</label>
                    <input type="text" class="form-input work-position" placeholder="请输入职位名称" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">工作时间</label>
                    <input type="text" class="form-input work-time" placeholder="如：2020.03-至今" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">工作内容</label>
                  <textarea class="form-input form-textarea work-desc" placeholder="请描述您的主要工作内容"></textarea>
                </div>
              </div>
            </div>
            <button type="button" id="add-work-btn" class="add-work-btn mt-3 w-full py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 text-sm hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2" onclick="handleAddWork()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              添加工作经历
            </button>
          </div>

          <!-- 步骤4：技能证书 -->
          <div class="form-step" data-step="4">
            <h3 class="step-title">技能证书</h3>
            <p class="step-desc">请填写您的技能特长和证书</p>
            <div class="form-group">
              <label class="form-label required-label">技能特长 <span class="required-tag">必填</span></label>
              <textarea id="resume-skills" class="form-input form-textarea" placeholder="请描述您的技能特长，如：熟练使用Office软件"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">语言能力（可选）</label>
              <input type="text" id="resume-language" class="form-input" placeholder="如：英语六级" />
            </div>
            <div class="form-group">
              <label class="form-label">其他证书（可选）</label>
              <textarea id="resume-cert" class="form-input form-textarea" placeholder="请输入其他证书，如：普通话一级甲等"></textarea>
            </div>
          </div>

          <!-- 步骤5：自我评价 -->
          <div class="form-step" data-step="5">
            <h3 class="step-title">自我评价</h3>
            <p class="step-desc">请填写您的自我评价</p>
            <div class="form-group">
              <label class="form-label">自我评价</label>
              <textarea id="resume-intro" class="form-input form-textarea" style="min-height: 150px;" placeholder="请描述您的性格特点、职业优势等"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">预览简历</label>
              <div id="resume-preview" class="resume-preview"></div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="form-footer">
          <button id="btn-cancel" class="btn-cancel">取消</button>
          <div class="flex gap-2">
            <button id="btn-prev" class="btn-prev hidden">上一步</button>
            <button id="btn-next" class="btn-next">下一步</button>
            <button id="btn-submit" class="btn-submit hidden">提交</button>
          </div>
        </div>
      </div>
    </div>
  `

  // 移动端 Tab 切换
  const tabCards = document.getElementById('tab-cards')
  const tabChat = document.getElementById('tab-chat')
  const cardsPanel = document.getElementById('cards-panel')
  const chatPanel = document.getElementById('chat-panel')
  
  // 保存原始卡片区域的HTML内容
  const originalCardsPanelHTML = cardsPanel?.innerHTML || ''

  const mobileTitle = document.getElementById('mobile-title')

  tabCards?.addEventListener('click', () => {
    if (cardsPanel && chatPanel && tabCards && tabChat) {
      cardsPanel.classList.remove('hidden')
      chatPanel.classList.add('hidden')
      tabCards.classList.add('active')
      tabChat.classList.remove('active')
      if (mobileTitle) mobileTitle.textContent = '职业规划过程展示'
    }
  })

  tabChat?.addEventListener('click', () => {
    if (cardsPanel && chatPanel && tabCards && tabChat) {
      chatPanel.classList.remove('hidden')
      cardsPanel.classList.add('hidden')
      tabChat.classList.add('active')
      tabCards.classList.remove('active')
      if (mobileTitle) mobileTitle.textContent = '小职引职业规划助手'
    }
  })

  // 移动端左右滑动切换功能
  let touchStartX = 0
  let touchEndX = 0
  const minSwipeDistance = 50 // 最小滑动距离

  document.addEventListener('touchstart', (e) => {
    // 仅在移动端（小屏幕）时启用滑动切换
    if (window.innerWidth >= 1024) return
    touchStartX = e.changedTouches[0].screenX
  }, { passive: true })

  document.addEventListener('touchend', (e) => {
    // 仅在移动端（小屏幕）时启用滑动切换
    if (window.innerWidth >= 1024) return
    touchEndX = e.changedTouches[0].screenX
    handleSwipe()
  }, { passive: true })

  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX
    if (Math.abs(swipeDistance) < minSwipeDistance) return // 滑动距离太短，不触发切换

    if (swipeDistance > 0) {
      // 向右滑动：切换到卡片页面
      if (cardsPanel && chatPanel && tabCards && tabChat) {
        cardsPanel.classList.remove('hidden')
        chatPanel.classList.add('hidden')
        tabCards.classList.add('active')
        tabChat.classList.remove('active')
        if (mobileTitle) mobileTitle.textContent = '职业规划过程展示'
      }
    } else {
      // 向左滑动：切换到对话页面
      if (cardsPanel && chatPanel && tabCards && tabChat) {
        chatPanel.classList.remove('hidden')
        cardsPanel.classList.add('hidden')
        tabChat.classList.add('active')
        tabCards.classList.remove('active')
        if (mobileTitle) mobileTitle.textContent = '小职引职业规划助手'
      }
    }
  }

  // 对话功能
  const messageInput = document.getElementById('message-input') as HTMLInputElement
  const sendBtn = document.getElementById('send-btn')
  const stopBtn = document.getElementById('stop-btn')
  const uploadBtn = document.getElementById('upload-btn')
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const messagesContainer = document.getElementById('messages')
  const filePreview = document.getElementById('file-preview')
  const fileNameEl = document.getElementById('file-name')
  const fileIconWrapper = document.getElementById('file-icon-wrapper')
  const fileIconText = document.getElementById('file-icon-text')
  const removeFileBtn = document.getElementById('remove-file')

  // 用于中断流式响应的标记
  let isGenerating = false
  let currentController: AbortController | null = null
  let userScrolledUp = false  // 标记用户是否手动滚动到上方

  // 文件类型配置
  const fileTypeConfig: Record<string, { bg: string; color: string; text: string; label: string }> = {
    image: { bg: '#E8F4FC', color: '#3B82F6', text: 'Image', label: '图片' },
    pdf: { bg: '#FEE2E2', color: '#EF4444', text: 'PDF', label: 'PDF' },
    word: { bg: '#DBEAFE', color: '#2563EB', text: 'Word', label: 'Word' },
    document: { bg: '#E8F4FC', color: '#6B7280', text: 'Txt', label: '文档' }
  }

  // 颜色加深/变浅辅助函数
  function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  // 保存对话历史 - 支持多模态内容
  let conversationHistory: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = []
  let uploadedFile: File | null = null
  let uploadedFileUrl: string | null = null
  let lastResumeContent: string | null = null  // 存储最后一次上传的简历内容
  let pendingManualResumeText: string | null = null  // 存储手动录入的简历文本
  let hasJsonDataInThisResponse = false  // 标记当前响应中是否包含JSON数据
  
  // 职业期望收集状态
  interface CareerExpectations {
    industry?: string
    jobType?: string
    city?: string
    salary?: string
    other?: string
  }
  let careerExpectations: CareerExpectations = {}  // 存储用户回答的职业期望
  let currentExpectationQuestion = 0  // 当前询问的问题索引 (0-4)
  const expectationQuestions = [
    '期望从事的行业（如：互联网、金融、教育、医疗等）',
    '期望的岗位类型（如：数据分析、产品经理、前端开发、后端开发等）',
    '期望工作的城市',
    '期望薪资范围（如：8K-15K/月或面议）',
    '其他要求'
  ]
  let isCollectingExpectations = false  // 是否正在收集职业期望
  let isAIAskingExpectations = false  // AI是否正在询问职业期望问题
  let jsonProcessingMessage: HTMLElement | null = null  // 保存"正在分析中……"消息元素的引用
  
  // 更新左侧卡片显示画像数据（提前定义，供 clearAllResumeData 使用）
  function updateProfileCard(profile: {
    resumeScore?: any
    abilityAnalysis?: any
    studentProfile?: any
    jobMatch?: any
  }) {
    const cardsPanel = document.getElementById('cards-panel')
    if (!cardsPanel) return
    
    // 如果没有任何画像数据，恢复默认状态
    if (!profile.resumeScore && !profile.abilityAnalysis && !profile.studentProfile && !profile.jobMatch) {
      cardsPanel.innerHTML = `
        <div class="h-full flex flex-col">
          <div class="hidden lg:flex items-center px-4 py-3">
            <h2 class="text-xl font-semibold text-gray-700">职业规划过程展示</h2>
          </div>
          <div class="flex-1 flex items-center justify-center p-8">
            <div class="text-center">
              <div class="w-24 h-24 mx-auto mb-4 rounded-full bg-white/60 flex items-center justify-center shadow-sm">
                <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <p class="text-gray-500 text-sm">暂无卡片内容</p>
              <p class="text-gray-400 text-xs mt-1">上传简历后将在此展示分析结果</p>
            </div>
          </div>
        </div>
      `
      return
    }
    
    let html = `
      <div class="h-full flex flex-col">
        <div class="hidden lg:flex items-center px-4 py-3">
          <h2 class="text-xl font-semibold text-gray-700">职业规划过程展示</h2>
        </div>
        <div class="flex-1 overflow-auto p-4 lg:p-6">
          <div class="grid gap-4 lg:gap-6">
    `
    
    // 简历评分卡片
    if (profile.resumeScore) {
      const rs = profile.resumeScore
      html += `
        <div class="resume-score-card">
          <div class="card-header">
            <div class="card-icon">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="card-title">简历评分</h3>
            <span class="overall-score">${rs.overall_score || 0}分</span>
          </div>
          <div class="score-details">
      `
      
      const details = rs.details || {}
      const scoreLabels: Record<string, string> = {
        basic_info: '基本信息',
        education: '教育背景',
        skills: '技能特长',
        experience: '实习经历',
        projects: '项目经验'
      }
      
      for (const [key, label] of Object.entries(scoreLabels)) {
        const item = details[key] || {}
        html += `
          <div class="score-item">
            <div class="score-item-header">
              <span class="score-label">${label}</span>
              <span class="score-value">${item.score || 0}/${item.max || 100}</span>
            </div>
            <div class="score-bar">
              <div class="score-bar-fill" style="width: ${(item.score / (item.max || 100)) * 100}%"></div>
            </div>
            <p class="score-desc">${item.desc || ''}</p>
          </div>
        `
      }
      
      html += `
          </div>
        </div>
      `
    }
    
    // 能力分析卡片
    if (profile.abilityAnalysis) {
      const aa = profile.abilityAnalysis
      html += `
        <div class="ability-analysis-card">
          <div class="card-header">
            <div class="card-icon">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <h3 class="card-title">能力拆解</h3>
          </div>
          <div class="ability-tags-grid">
      `
      
      const categories = [
        { key: '专业技能', icon: '💼' },
        { key: '证书', icon: '📜' },
        { key: '实习', icon: '💼' },
        { key: '项目', icon: '📂' },
        { key: '软技能', icon: '🤝' }
      ]
      
      for (const cat of categories) {
        const items = aa[cat.key] || []
        if (items.length > 0) {
          html += `
            <div class="ability-category">
              <h4 class="ability-category-title">${cat.key}</h4>
              <div class="ability-tags">
                ${items.map((item: string) => `<span class="ability-tag">${item}</span>`).join('')}
              </div>
            </div>
          `
        }
      }
      
      html += `
          </div>
        </div>
      `
    }
    
    // 学生画像卡片
    if (profile.studentProfile) {
      const sp = profile.studentProfile
      html += `
        <div class="student-profile-card">
          <div class="card-header">
            <div class="card-icon">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <h3 class="card-title">学生画像</h3>
          </div>
      `
      
      // 雷达图区域
      if (sp.radar_scores) {
        const radarScores = sp.radar_scores
        const radarId = 'radar-chart-' + Date.now()
        
        // 生成维度列表 HTML
        const dimensionList = Object.entries(radarScores).map(([key, value]) => `
          <div class="dimension-item">
            <span class="dimension-name">${key}</span>
            <span class="dimension-bar">
              <span class="dimension-fill" style="width: ${value}%"></span>
            </span>
            <span class="dimension-score">${value}</span>
          </div>
        `).join('')
        
        html += `
          <div class="profile-content-grid radar-grid">
            <div class="radar-chart-section">
              <canvas id="${radarId}" class="radar-canvas"></canvas>
            </div>
            <div class="radar-dimension-list">
              <h4 class="dimension-list-title">维度得分</h4>
              ${dimensionList}
            </div>
          </div>
          <div class="competitiveness-section">
            <div class="competitiveness-header">
              <span class="competitiveness-title">综合竞争力</span>
              <span class="competitiveness-overall">${sp.competitiveness?.overall || 0}</span>
            </div>
            <div class="competitiveness-compare">
              <div class="compare-item">
                <span class="compare-label">年级排名</span>
                <span class="compare-value">${sp.competitiveness?.grade_rank || '-'}</span>
              </div>
              <div class="compare-item">
                <span class="compare-label">专业排名</span>
                <span class="compare-value">${sp.competitiveness?.major_rank || '-'}</span>
              </div>
            </div>
            <div class="competitiveness-tip">${sp.competitiveness?.comparison || ''}</div>
          </div>
        `
        
        // 渲染完成后绘制雷达图 - 使用 setTimeout 确保 DOM 已更新
        setTimeout(() => {
          drawRadarChart(radarId, radarScores)
        }, 0)
      }
      
      html += `
        </div>
      `
    }
    
    // 人岗匹配度卡片（新格式 - 四个维度）
    if (profile.jobMatch && profile.jobMatch.matches) {
      // 按匹配度从高到低排序
      const sortedMatches = [...profile.jobMatch.matches].sort((a, b) => 
        (b.overall_score || 0) - (a.overall_score || 0)
      )
      const matches = sortedMatches.slice(0, 5)  // 只显示前5个
      
      const dimensionLabels: Record<string, string> = {
        basic_requirements: '基础要求匹配',
        professional_skills: '职业技能匹配',
        professional_quality: '职业素养匹配',
        development_potential: '发展潜力匹配'
      }
      
      matches.forEach((match: any, idx: number) => {
        const overallColor = match.overall_score >= 80 ? 'text-green-600' : match.overall_score >= 60 ? 'text-amber-600' : 'text-red-600'
        const overallBgColor = match.overall_score >= 80 ? 'bg-green-100' : match.overall_score >= 60 ? 'bg-amber-100' : 'bg-red-100'
        
        html += `
          <div class="job-match-card">
            <div class="card-header">
              <div class="card-icon">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="card-title">${match.job_title}</h3>
                <p class="text-sm text-gray-500">${match.company} · ${match.location || '地点未知'} · ${match.salary || '薪资面议'}</p>
              </div>
              <div class="text-center">
                <div class="w-16 h-16 ${overallBgColor} rounded-full flex items-center justify-center">
                  <span class="${overallColor} text-xl font-bold">${match.overall_score || 0}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">匹配度</p>
              </div>
            </div>
            
            <div class="match-details">
              <!-- 四个维度打分 -->
              <div class="grid grid-cols-2 gap-4 mb-4">
        `
        
        // 渲染四个维度
        const dimensions = match.dimensions || {}
        for (const [key, label] of Object.entries(dimensionLabels)) {
          const dim = dimensions[key] || { score: 0, weight: 25 }
          const dimColor = dim.score >= 80 ? 'text-green-600' : dim.score >= 60 ? 'text-amber-600' : 'text-red-600'
          
          html += `
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">${label}</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400">权重${dim.weight}%</span>
                  <span class="${dimColor} font-bold">${dim.score}</span>
                </div>
              </div>
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" style="width: ${dim.score}%; background: linear-gradient(90deg, #5BB8D8, #7AD0E8);"></div>
              </div>
            </div>
          `
        }
        
        html += `
              </div>
              
              <!-- 核心优势 -->
              ${match.key_strengths?.length > 0 ? `
                <div class="match-section mb-4">
                  <h4 class="match-section-title text-green-700 font-medium mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                    核心优势
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    ${match.key_strengths.map((strength: string) => `
                      <span class="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">${strength}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              <!-- 关键差距（高亮显示） -->
              ${match.key_gaps?.length > 0 ? `
                <div class="match-section mb-4">
                  <h4 class="match-section-title text-red-700 font-medium mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                    关键差距（需要改进）
                  </h4>
                  <div class="flex flex-wrap gap-2">
                    ${match.key_gaps.map((gap: string) => `
                      <span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium border-2 border-red-300 animate-pulse">${gap}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              <!-- 各维度详细分析 -->
              <div class="space-y-3">
        `
        
        // 渲染各维度的优势和差距
        for (const [key, label] of Object.entries(dimensionLabels)) {
          const dim = dimensions[key]
          if (!dim) continue
          
          html += `
            <div class="border-l-2 border-blue-300 pl-3">
              <h5 class="text-sm font-medium text-gray-700 mb-2">${label}详解</h5>
              <p class="text-sm text-gray-600 mb-2">${dim.analysis || '分析中...'}</p>
              ${dim.strengths?.length > 0 ? `
                <div class="flex flex-wrap gap-1 mb-1">
                  ${dim.strengths.map((s: string) => `<span class="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded">✓ ${s}</span>`).join('')}
                </div>
              ` : ''}
              ${dim.gaps?.length > 0 ? `
                <div class="flex flex-wrap gap-1">
                  ${dim.gaps.map((g: string) => `<span class="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded">✗ ${g}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `
        }
        
        // 改进建议
        if (match.suggestions) {
          html += `
            <div class="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 class="text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"></path>
                </svg>
                改进建议
              </h5>
              <p class="text-sm text-blue-600">${match.suggestions}</p>
            </div>
          `
        }
        
        html += `
              </div>
            </div>
          </div>
        `
      })
    }
    
    html += `
        </div>
      </div>
    `
    
    cardsPanel.innerHTML = html
  }
  
  // 清除所有简历相关数据（新上传简历时调用）
  function clearAllResumeData() {
    // 清除 localStorage 中的画像数据
    localStorage.removeItem('studentProfile')
    // 直接调用卡片更新函数，清除左侧卡片显示
    updateProfileCard({})
    // 清除对话历史
    conversationHistory = []
    // 清除文件相关数据
    uploadedFile = null
    uploadedFileUrl = null
    // 清除简历内容缓存
    lastResumeContent = null
    // 隐藏文件预览
    if (filePreview) {
      filePreview.classList.add('hidden')
      filePreview.classList.remove('flex')
    }
    // 清空文件输入
    if (fileInput) fileInput.value = ''
    // 清空消息容器中的旧对话
    if (messagesContainer) {
      messagesContainer.innerHTML = ''
    }
  }
  
  // 仅清除画像数据（发送消息时调用，保留对话历史和消息显示）
  function clearProfileData() {
    // 清除 localStorage 中的画像数据
    localStorage.removeItem('studentProfile')
    // 直接调用卡片更新函数，清除左侧卡片显示
    updateProfileCard({})
    // 注意：不清除 lastResumeContent，因为它在确认消息中使用
  }
  
  // 保留旧函数名作为别名（兼容）
  const clearConversationHistory = clearAllResumeData

  // 文件类型判断
  function getFileType(file: File): string {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'word'
    return 'document'
  }

  // 上传文件到服务器
  async function uploadFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1]
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileContent: base64,
              fileName: file.name,
              contentType: file.type,
            }),
          })
          const data = await response.json()
          if (data.success) {
            resolve(data.url)
          } else {
            // 如果是空文件错误，返回特殊标记让调用方处理
            if (data.error === 'Empty file content') {
              reject(new Error('EMPTY_FILE'))
            } else {
              reject(new Error(data.error || 'Upload failed'))
            }
          }
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })
  }

  // 文件上传功能
  uploadBtn?.addEventListener('click', () => {
    fileInput?.click()
  })

  fileInput?.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files || files.length === 0) return

    const file = files[0]
    const maxSize = 10 * 1024 * 1024 // 10MB

    // 检查是否为空文件
    if (file.size === 0) {
      addMessage('系统: 请勿上传空文件', false)
      fileInput.value = ''
      return
    }

    if (file.size > maxSize) {
      addMessage('系统: 文件大小不能超过10MB', false)
      return
    }

    // 保存文件
    uploadedFile = file
    const fileType = getFileType(file)
    const config = fileTypeConfig[fileType]

    // 显示文件预览
    if (filePreview && fileNameEl && fileIconWrapper && fileIconText) {
      filePreview.classList.remove('hidden')
      filePreview.classList.add('flex')
      filePreview.style.background = `linear-gradient(145deg, ${config.bg}, ${adjustColor(config.bg, -10)})`
      fileIconWrapper.style.background = 'transparent'
      fileIconText.textContent = config.text
      fileIconText.style.color = config.color
      fileNameEl.textContent = file.name
    }

    // 清空文件输入，允许重新选择同一文件
    fileInput.value = ''
  })

  // 移除文件
  removeFileBtn?.addEventListener('click', () => {
    uploadedFile = null
    uploadedFileUrl = null
    filePreview?.classList.add('hidden')
    filePreview?.classList.remove('flex')
  })

  function addMessage(content: string, isUser: boolean = false) {
    if (!messagesContainer) return

    const messageDiv = document.createElement('div')
    messageDiv.className = 'flex gap-3 items-start'

    if (isUser) {
      messageDiv.innerHTML = `
        <div class="rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%] ml-auto chat-message-user">
          <p class="text-sm text-white leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</p>
        </div>
        <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, #5BB8D8, #7AD0E8);">
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
      `
    } else {
      messageDiv.innerHTML = `
        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src="/ai-avatar.png" alt="AI" class="w-full h-full object-cover" />
        </div>
        <div class="rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%] chat-message-assistant">
          <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ai-message"></p>
        </div>
      `
    }

    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    return messageDiv
  }

  // 添加文件消息
  function addFileMessage(fileName: string, fileType: string) {
    if (!messagesContainer) return

    const config = fileTypeConfig[fileType]
    const messageDiv = document.createElement('div')
    messageDiv.className = 'flex gap-3 items-start justify-end'

    messageDiv.innerHTML = `
      <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl" style="background: linear-gradient(145deg, ${config.bg}, ${adjustColor(config.bg, -10)});">
        <span class="text-xs font-medium" style="color: ${config.color}">${config.text}</span>
        <span class="text-xs text-gray-600 max-w-[150px] truncate">${escapeHtml(fileName)}</span>
      </div>
      <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style="background: linear-gradient(145deg, #E8F4FC, #D4EBF5);">
        <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      </div>
    `

    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
    return messageDiv
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // ========== 从对话历史提取职业期望并调用岗位匹配 ==========
  async function extractAndCallJobMatch() {
    console.log('开始从对话历史提取职业期望...')
    
    // 从对话历史中提取用户消息（跳过系统消息，只取用户回答）
    const userMessages = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
    
    console.log('找到用户消息数量:', userMessages.length)
    
    // 假设用户最后5个消息是对职业期望问题的回答
    // 实际上需要更智能的判断，但先简单处理
    const recentAnswers = userMessages.slice(-5)
    console.log('提取的回答:', recentAnswers)
    
    // 构建职业期望对象
    const questionKeys: Array<keyof CareerExpectations> = ['industry', 'jobType', 'city', 'salary', 'other']
    const expectations: CareerExpectations = {}
    
    recentAnswers.forEach((answer, idx) => {
      if (idx < questionKeys.length && answer) {
        expectations[questionKeys[idx]] = answer
      }
    })
    
    console.log('构建的职业期望:', expectations)
    
    // 只有当我们有至少一些回答时才调用
    if (Object.keys(expectations).length > 0) {
      // 显示正在匹配的消息
      const aiMessageDiv = addMessage('正在为您匹配岗位……', false)
      const aiTextElement = aiMessageDiv?.querySelector('.ai-message') as HTMLElement
      
      // 隐藏发送按钮，显示停止按钮
      if (sendBtn) {
        sendBtn.classList.add('hidden')
      }
      if (stopBtn) {
        stopBtn.classList.remove('hidden')
      }
      
      try {
        isGenerating = true
        
        // 先从 localStorage 获取学生画像
        const studentProfile = JSON.parse(localStorage.getItem('studentProfile') || '{}')
        
        // 构建匹配请求
        const matchRequest = {
          expectations: expectations,
          profile: studentProfile
        }
        
        console.log('调用岗位匹配API...')
        const response = await fetch('/api/job-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchRequest)
        })
        
        if (!response.ok) {
          throw new Error('匹配分析请求失败')
        }
        
        const result = await response.json()
        console.log('岗位匹配API返回:', result.success ? '成功' : '失败')
        
        // 保存匹配分析结果到 localStorage
        if (result.analysis) {
          const existingProfile = JSON.parse(localStorage.getItem('studentProfile') || '{}')
          existingProfile.jobMatch = result.analysis
          localStorage.setItem('studentProfile', JSON.stringify(existingProfile))
          
          // 更新卡片UI
          updateProfileCard(existingProfile)
        }
        
        // 显示匹配分析结果
        if (aiTextElement) {
          aiTextElement.textContent = result.message || '岗位匹配分析已完成，请查看左侧卡片！'
        }
        
        // 保存到历史
        conversationHistory.push({ role: 'assistant', content: result.message || '岗位匹配分析已完成，请查看左侧卡片！' })
        
      } catch (error) {
        console.error('Job match error:', error)
        if (aiTextElement) {
          aiTextElement.textContent = '抱歉，岗位匹配分析出现问题，请稍后重试。'
        }
      } finally {
        isGenerating = false
        isAIAskingExpectations = false
        
        // 恢复发送按钮，隐藏停止按钮
        if (sendBtn) {
          sendBtn.classList.remove('hidden')
          sendBtn.style.opacity = '1'
          sendBtn.style.pointerEvents = 'auto'
        }
        if (stopBtn) {
          stopBtn.classList.add('hidden')
        }
      }
    } else {
      console.log('没有提取到足够的职业期望回答')
    }
  }
  // ============================================================

  async function handleSend() {
    // 检查是否正在生成中
    if (isGenerating) {
      console.log('Already generating, ignoring send - isGenerating:', isGenerating)
      return
    }
    
    // 重置标志
    hasJsonDataInThisResponse = false
    
    // 标记为正在生成
    console.log('Setting isGenerating = true')
    isGenerating = true
    console.log('handleSend called, isGenerating:', isGenerating)

    // 清空文件状态，防止重复发送
    const pendingFile = uploadedFile
    const pendingFileUrl = uploadedFileUrl
    uploadedFile = null
    uploadedFileUrl = null

    const message = messageInput?.value.trim()
    if (!message && !pendingFile) {
      isGenerating = false
      return
    }

    // 禁用发送按钮
    if (sendBtn) {
      sendBtn.style.opacity = '0.6'
      sendBtn.style.pointerEvents = 'none'
    }

    // 立即隐藏文件预览
    if (pendingFile) {
      filePreview?.classList.add('hidden')
      filePreview?.classList.remove('flex')
    }

    // 禁用前端职业期望收集，让AI来处理
    // 如果正在收集职业期望，先处理用户回答
    if (false && isCollectingExpectations && message) {
      // 立即重置 isGenerating 标志，因为不调用后端API
      isGenerating = false
      
      // 恢复发送按钮
      if (sendBtn) {
        sendBtn.style.opacity = '1'
        sendBtn.style.pointerEvents = 'auto'
      }
      
      // 保存用户回答
      const questionKeys: Array<keyof CareerExpectations> = ['industry', 'jobType', 'city', 'salary', 'other']
      careerExpectations[questionKeys[currentExpectationQuestion]] = message.trim()
      
      // 添加用户消息到界面
      addMessage(message, true)
      messageInput.value = ''
      
      // 检查是否所有问题都收集完成
      currentExpectationQuestion++
      
      if (currentExpectationQuestion >= expectationQuestions.length) {
        // 所有问题收集完成，结束收集
        isCollectingExpectations = false
        
        // 重新设置 isGenerating 为 true，因为接下来要调API
        isGenerating = true
        
        // 创建AI消息占位
        const aiMessageDiv = addMessage('正在为您匹配岗位……', false)
        const aiTextElement = aiMessageDiv?.querySelector('.ai-message') as HTMLElement
        
        // 隐藏发送按钮，显示停止按钮
        if (sendBtn) {
          sendBtn.classList.add('hidden')
        }
        if (stopBtn) {
          stopBtn.classList.remove('hidden')
        }
        
        // 调用人岗匹配分析
        try {
          // 先从 localStorage 获取学生画像
          const studentProfile = JSON.parse(localStorage.getItem('studentProfile') || '{}')
          
          // 构建匹配请求
          const matchRequest = {
            expectations: careerExpectations,
            profile: studentProfile
          }
          
          const response = await fetch('/api/job-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchRequest)
          })
          
          if (!response.ok) {
            throw new Error('匹配分析请求失败')
          }
          
          const result = await response.json()
          
          // 保存匹配分析结果到 localStorage
          if (result.analysis) {
            const existingProfile = JSON.parse(localStorage.getItem('studentProfile') || '{}')
            existingProfile.jobMatch = result.analysis
            localStorage.setItem('studentProfile', JSON.stringify(existingProfile))
            
            // 更新卡片UI
            updateProfileCard(existingProfile)
          }
          
          // 显示匹配分析结果
          if (aiTextElement) {
            aiTextElement.textContent = result.message || '岗位匹配分析已完成，请查看左侧卡片！'
          }
          
          // 保存到历史
          conversationHistory.push({ role: 'user', content: message })
          conversationHistory.push({ role: 'assistant', content: result.message || '岗位匹配分析已完成，请查看左侧卡片！' })
          
        } catch (error) {
          console.error('Job match error:', error)
          if (aiTextElement) {
            aiTextElement.textContent = '抱歉，岗位匹配分析出现问题，请稍后重试。'
          }
        } finally {
          isGenerating = false
          
          // 恢复发送按钮，隐藏停止按钮
          if (sendBtn) {
            sendBtn.classList.remove('hidden')
            sendBtn.style.opacity = '1'
            sendBtn.style.pointerEvents = 'auto'
          }
          if (stopBtn) {
            stopBtn.classList.add('hidden')
          }
        }
        
        return
      } else {
        // 还有下一个问题，继续询问
        const nextQuestion = `请问：\n\n${currentExpectationQuestion + 1}. ${expectationQuestions[currentExpectationQuestion]}`
        const aiMessageDiv = addMessage(nextQuestion, false)
        conversationHistory.push({ role: 'user', content: message })
        conversationHistory.push({ role: 'assistant', content: nextQuestion })
        return
      }
    }
    
    // 处理文件上传（优先显示）
    let fileUrl: string | null = null
    if (pendingFile) {
      const fileType = getFileType(pendingFile)
      
      try {
        // 上传文件
        fileUrl = await uploadFile(pendingFile)
        addFileMessage(pendingFile.name, fileType)
        
        // 如果同时有文本消息，在文件消息后立即显示
        if (message) {
          addMessage(message, true)
          messageInput.value = ''
        }
      } catch (error: unknown) {
        console.error('Upload error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (errorMessage === 'EMPTY_FILE') {
          addMessage('系统: 请勿上传空文件', true)
        } else {
          addMessage('⚠️ 文件上传失败: ' + pendingFile?.name, true)
        }
        
        // 恢复发送按钮
        if (sendBtn) {
          sendBtn.style.opacity = '1'
          sendBtn.style.pointerEvents = 'auto'
        }
        isGenerating = false
        return
      }
    } else if (message) {
      // 只有文本消息的情况
      addMessage(message, true)
      messageInput.value = ''
    }

    // 构建消息内容
    let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    
    if (fileUrl) {
      const fileType = getFileType(pendingFile!)
      if (fileType === 'image') {
        // 图片消息 - 使用多模态格式
        messageContent = [
          { type: 'text', text: message || '请分析这张图片' },
          { type: 'image_url', image_url: { url: fileUrl } }
        ]
      } else {
        // 文档消息 - 先解析文档内容，再验证是否为简历
        let docContent = ''
        
        // 清除旧画像数据，确保新简历生成新画像（保留对话历史和消息显示）
        clearProfileData()
        
        try {
          const parseResponse = await fetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: fileUrl }),
          })
          const parseData = await parseResponse.json()
          console.log('Parse result:', parseData)
          if (parseData.success && parseData.content && typeof parseData.content === 'string') {
            docContent = parseData.content
            lastResumeContent = docContent  // 保存简历内容供后续确认使用
            console.log('Doc content length:', docContent.length, 'Preview:', docContent.substring(0, 100))
          }
        } catch (parseError) {
          console.error('Parse document error:', parseError)
        }

        // 根据文档类型构建消息
        const fileName = pendingFile?.name || '未知文件'
        
        if (!docContent) {
          // 无法提取内容，提示用户
          messageContent = `用户上传了文件（文件名：${fileName}），但无法自动提取文件内容。请告诉用户您收到了文件，并询问用户能否手动描述文件的主要内容或关键信息，以便进行职业规划分析。`
        } else {
          // 验证是否为简历
          console.log('Validating docContent, length:', docContent.length)
          try {
            const validateResponse = await fetch('/api/validate-resume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: docContent }),
            })
            const validateData = await validateResponse.json()
            console.log('Validate result:', validateData)
            
            // 只有当验证成功且明确判定为简历时才展示内容
            if (validateData.success === true && validateData.isResume === true) {
              // 是简历，提取并询问用户信息是否正确
              const resumeSummary = '【简历提取确认】用户上传了一份简历（文件名：' + fileName + '），可信度：' + (validateData.confidence || 0) + '%。请仔细阅读以下简历内容，然后：\n1. 展示提取到的全部信息（按原文格式），包括个人信息、教育背景、工作经历、技能描述、项目经验等所有内容\n2. 询问用户："以上是我从您的简历中提取到的全部信息，请问是否正确完整？请告诉我，如果没有问题，我将为您构建学生画像。"\n\n---简历原文内容---\n' + docContent.substring(0, 10000) + '\n---简历原文结束---'
              messageContent = message ? message + '\n\n' + resumeSummary : resumeSummary
            } else {
              // 不是简历或验证失败，提示用户重新上传
              messageContent = '【系统提示】用户上传的文件 "' + fileName + '" 不是简历内容。检测结果：该文件可能不包含简历所需的个人信息、教育背景、工作经历等内容。请礼貌地提醒用户，简历分析功能需要上传包含个人职业经历的真实简历文件（如姓名、联系方式、教育背景、工作经验、技能描述等），并建议用户重新上传正确的简历文件。'
            }
          } catch (validateError) {
            console.error('Validate resume error:', validateError)
            // 验证失败，提示用户重新上传
            messageContent = '【系统提示】系统无法验证您上传的文件 "' + fileName + '" 是否为简历内容。请重新上传一份包含个人信息的简历文件（如姓名、联系方式、教育背景、工作经验、技能描述等），以便我为您进行职业规划分析。'
          }
        }
      }
    } else if (pendingManualResumeText) {
      // 手动录入简历的情况
      // 清除旧画像数据，确保新简历生成新画像（保留对话历史和消息显示）
      clearProfileData()
      
      const resumeSummary = '【简历提取确认】用户手动填写了一份简历。请仔细阅读以下简历内容，然后：\n1. 展示提取到的全部信息（按原文格式），包括个人信息、教育背景、工作经历、技能描述、项目经验等所有内容\n2. 询问用户："以上是我从您填写的简历中提取到的全部信息，请问是否正确完整？请告诉我，如果没有问题，我将为您构建学生画像。"\n\n---简历原文内容---\n' + pendingManualResumeText.substring(0, 10000) + '\n---简历原文结束---'
      
      messageContent = message ? message + '\n\n' + resumeSummary : resumeSummary
      
      // 清除 pendingManualResumeText，避免重复使用
      pendingManualResumeText = null
    } else {
      // 没有文件且没有手动简历时，检查是否为简历确认消息
      const trimmedMessage = message.trim().toLowerCase()
      const confirmWords = ['正确', '没问题', '是的', '确认', 'ok', 'yes', 'y', '对', '可以', '好的', '继续', '开始分析', '生成画像', '分析简历']
      const isConfirmMessage = confirmWords.some(word => trimmedMessage.includes(word))
      
      if (isConfirmMessage && lastResumeContent && typeof lastResumeContent === 'string') {
        // 用户确认简历，且有保存的简历内容，重新构建包含简历内容的确认消息
        // 清除旧画像数据，确保生成基于新简历的画像（保留对话历史和消息显示）
        clearProfileData()
        
        const resumeConfirmMessage = '【简历确认】用户已确认简历信息正确。请立即根据以下简历内容生成学生画像（包括简历评分、能力拆解、学生画像），严格按照JSON格式输出，不要只说"好的"或简单确认。\n\n---简历原文内容---\n' + lastResumeContent.substring(0, 10000) + '\n---简历原文结束---'
        messageContent = resumeConfirmMessage
        // 清除保存的简历内容，避免重复使用
        lastResumeContent = null
      } else {
        messageContent = message
      }
    }

    // 添加用户消息到历史
    conversationHistory.push({ role: 'user', content: messageContent })

    // 创建AI消息占位，立即显示"正在思考中……"
    const aiMessageDiv = addMessage('正在思考中……', false)
    const aiTextElement = aiMessageDiv?.querySelector('.ai-message') as HTMLElement

    // 显示停止按钮，隐藏发送按钮
    if (sendBtn) {
      sendBtn.classList.add('hidden')
    }
    if (stopBtn) {
      stopBtn.classList.remove('hidden')
    }

    // 调用后端API
    try {
      currentController = new AbortController()
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: currentController.signal,
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''
      let displayContent = ''  // 当前正在显示的内容
      let inHiddenBlock = false  // 是否处于隐藏数据块中
      let hiddenBuffer = ''  // 隐藏数据缓冲
      let lastDataTime = Date.now()  // 最后收到数据的时间
      const TIMEOUT_MS = 60000  // 60秒超时

      if (reader) {
        while (isGenerating) {
          // 检查是否超时
          if (Date.now() - lastDataTime > TIMEOUT_MS) {
            console.error('Chat timeout: no data received for 60 seconds')
            if (aiTextElement && !aiResponse) {
              aiTextElement.textContent = '抱歉，分析时间过长，请稍后再试。'
            }
            break
          }

          try {
            const { done, value } = await reader.read()
            console.log('reader.read() done:', done, 'isGenerating:', isGenerating)
            if (done) {
              console.log('Reader stream done, breaking while loop')
              break
            }

            lastDataTime = Date.now()  // 更新最后收到数据的时间
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  console.log('Received [DONE] signal, setting isGenerating = false')
                  isGenerating = false
                  break
                }

                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    // 累加到完整响应
                    aiResponse += parsed.content
                    
                    if (aiTextElement) {
                      // 逐字符处理，实时过滤隐藏数据和JSON代码块
                      let currentDisplay = ''
                      let hiddenBlockCount = 0
                      let inJsonCodeBlock = false
                      let codeBlockStart = 0
                      
                      for (let i = 0; i < aiResponse.length; i++) {
                        const char = aiResponse[i]
                        const remaining = aiResponse.slice(i)
                        
                        // 检测隐藏数据开始标记
                        if (remaining.startsWith('{{HIDDEN_DATA_START}}')) {
                          i += '{{HIDDEN_DATA_START}}'.length - 1
                          hiddenBlockCount++
                          continue
                        }
                        
                        // 检测隐藏数据结束标记
                        if (remaining.startsWith('{{HIDDEN_DATA_END}}')) {
                          i += '{{HIDDEN_DATA_END}}'.length - 1
                          hiddenBlockCount = Math.max(0, hiddenBlockCount - 1)
                          continue
                        }
                        
                        // 检测 JSON 代码块开始（后台数据不展示）
                        if (!inJsonCodeBlock && remaining.startsWith('```json')) {
                          inJsonCodeBlock = true
                          hasJsonDataInThisResponse = true  // 标记有JSON数据
                          codeBlockStart = i
                          i += 5  // 跳过 "```json"
                          continue
                        }
                        
                        // 检测 JSON 代码块结束
                        if (inJsonCodeBlock && remaining.startsWith('```')) {
                          inJsonCodeBlock = false
                          i += 2  // 跳过 "```"
                          continue
                        }
                        
                        // 只有不在隐藏数据块和JSON代码块中时才添加到显示内容
                        if (hiddenBlockCount === 0 && !inJsonCodeBlock) {
                          currentDisplay += char
                        }
                      }
                      
                      // 如果有JSON数据，显示"正在分析中……"
                      if (hasJsonDataInThisResponse) {
                        displayContent = '正在分析中……'
                      } else if (hiddenBlockCount > 0) {
                        // 计算已接收的可见字符数量
                        const visibleChars = currentDisplay.length
                        displayContent = '正在分析简历信息……请问您期望从事哪个岗位方向？'
                      } else {
                        // 进一步清理 Markdown 符号
                        displayContent = currentDisplay
                          .replace(/^[*\-#]+\s*/gm, '')
                          .replace(/\*+/g, '')
                          .replace(/^#+\s*/gm, '')
                          .replace(/^-\s*/gm, '')
                          .trim()
                      }
                      
                      aiTextElement.textContent = displayContent
                      // 只有当用户没有手动滚动到上方时才自动跟随到底部
                      if (!userScrolledUp) {
                        messagesContainer!.scrollTop = messagesContainer!.scrollHeight
                      }
                    }
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          } catch (readError) {
            if ((readError as Error).name === 'AbortError') {
              // 用户中断，保留已显示的内容
              break
            }
            throw readError
          }
        }
      }

      // 解析所有隐藏数据并处理
      // 方法：先提取所有 ```json ... ``` 块，然后按换行或 } { 分割成独立JSON
      const codeBlockPattern = /```json\s*([\s\S]*?)```/g
      const codeBlocks: string[] = []
      let match
      
      while ((match = codeBlockPattern.exec(aiResponse)) !== null) {
        codeBlocks.push(match[1])
      }
      console.log(`Found ${codeBlocks.length} code blocks`)
      
      codeBlocks.forEach((blockContent, blockIdx) => {
        console.log(`Processing code block ${blockIdx + 1}, length:`, blockContent.length)
        
        // 清理可能残留的 HIDDEN_DATA 标记
        const cleanContent = blockContent
          .replace(/{{HIDDEN_DATA_START}}/g, '')
          .replace(/{{HIDDEN_DATA_END}}/g, '')
          .trim()
        
        // 方法1：按 } 后面跟 { 分割（多个JSON紧挨着）
        const jsonParts = cleanContent.split(/(?=\}\s*\{)/)
        
        // 方法2：如果分割后只有1个，可能是用换行分隔
        if (jsonParts.length === 1) {
          // 尝试按换行分割
          const lines = cleanContent.split(/\n/)
          // 过滤掉空行，重新组合
          const nonEmptyLines = lines.filter(l => l.trim())
          if (nonEmptyLines.length > 1) {
            // 按行组合成独立JSON
            const lineParts: string[] = []
            let current = ''
            nonEmptyLines.forEach(line => {
              current += line.trim()
              // 尝试解析当前组合
              try {
                JSON.parse(current)
                lineParts.push(current)
                current = ''
              } catch {
                // 还不是完整JSON，继续添加
              }
            })
            if (lineParts.length > 0) {
              jsonParts.length = 0
              jsonParts.push(...lineParts)
            }
          }
        }
        
        console.log(`Block ${blockIdx + 1} split into ${jsonParts.length} parts`)
        
        jsonParts.forEach((part, partIdx) => {
          const trimmedPart = part.trim()
          if (!trimmedPart) return
          
          let jsonStr = trimmedPart
          // 如果不是以 { 开头，添加 {
          if (!jsonStr.startsWith('{')) jsonStr = '{' + jsonStr
          // 如果不是以 } 结尾，添加 }
          if (!jsonStr.endsWith('}')) jsonStr = jsonStr + '}'
          
          try {
            const jsonData = JSON.parse(jsonStr)
            if (jsonData.type) {
              console.log(`Block ${blockIdx + 1}, part ${partIdx + 1} parsed, type:`, jsonData.type)
              handleProfileData(jsonData)
            }
          } catch (e) {
            // 如果带括号解析失败，尝试不带括号
            try {
              const simpleStr = trimmedPart.replace(/^\{/, '').replace(/\}$/, '')
              const jsonData = JSON.parse('{' + simpleStr + '}')
              if (jsonData.type) {
                console.log(`Block ${blockIdx + 1}, part ${partIdx + 1} parsed (alt), type:`, jsonData.type)
                handleProfileData(jsonData)
              }
            } catch {
              // 忽略无法解析的部分
            }
          }
        })
      })

      // 只有在正常完成时才保存到历史（如果是中断，内容已经在消息框中了）
      // 保存时也要移除隐藏数据和JSON代码块（后台数据不展示）
      let finalContentToSave = ''
      if (aiResponse) {
        const finalResponse = aiResponse
          .replace(/{{HIDDEN_DATA_START}}[\s\S]*?{{HIDDEN_DATA_END}}/g, '')
          .replace(/```json\s*[\s\S]*?```/g, '')  // 移除JSON代码块（后台数据不展示）
          .replace(/```[\s\S]*?```/g, '')  // 移除所有代码块
          .trim()
        
        finalContentToSave = finalResponse
        
        // 禁用前端职业期望收集，让AI来处理
        // if (hasJsonDataInThisResponse) {
        //   const intro = '我已经完成了您的简历分析和学生画像构建！现在需要了解您的职业期望，以便为您推荐合适的岗位。'
        //   const firstQuestion = `请问：\n\n1. ${expectationQuestions[0]}`
        //   const fullQuestion = intro + '\n\n' + firstQuestion
        //   
        //   if (aiTextElement) {
        //     aiTextElement.textContent = fullQuestion
        //   }
        //   finalContentToSave = fullQuestion
        //   
        //   // 初始化职业期望收集状态
        //   isCollectingExpectations = true
        //   currentExpectationQuestion = 0
        //   careerExpectations = {}
        // } else {
          // 更新消息元素内容，移除JSON代码块
          if (aiTextElement) {
            aiTextElement.textContent = finalResponse || '分析完成'
          }
        // }
        
        conversationHistory.push({ role: 'assistant', content: finalContentToSave })
      }
      
      // ========== 检测AI职业期望问题收集状态 ==========
      if (finalContentToSave) {
        // 检测AI是否开始问职业期望问题
        if (finalContentToSave.includes('期望从事的行业') || 
            finalContentToSave.includes('职业期望')) {
          console.log('AI开始询问职业期望问题')
          isAIAskingExpectations = true
          currentExpectationQuestion = 0
          careerExpectations = {}
        }
        
        // 检测AI是否完成所有问题（说感谢的话）
        if (finalContentToSave.includes('太感谢您的耐心配合') || 
            finalContentToSave.includes('为您匹配岗位') ||
            finalContentToSave.includes('请稍等片刻')) {
          console.log('AI完成问题收集，开始提取用户回答并调用岗位匹配')
          
          // 从对话历史中提取用户的5个回答
          extractAndCallJobMatch()
        }
      }
      // ==================================================
      
      // 重置标志
      hasJsonDataInThisResponse = false
      
      console.log('About to set isGenerating = false (normal completion)')
      isGenerating = false
      console.log('Generation complete, isGenerating:', isGenerating)
      userScrolledUp = false  // 输出完成后重置滚动标志
    } catch (error) {
      console.error('Chat error:', error)
      if (aiTextElement && !aiResponse) {
        aiTextElement.textContent = '抱歉，服务出现了一些问题，请稍后再试。'
      }
      // 即使出错，如果有内容也保存到历史
      if (aiResponse) {
        conversationHistory.push({ role: 'assistant', content: aiResponse })
      }
      console.log('About to set isGenerating = false (error)')
      isGenerating = false
      console.log('Generation error, isGenerating:', isGenerating)
      userScrolledUp = false  // 出错后也重置滚动标志
    }

    // 恢复发送按钮，隐藏停止按钮
    if (sendBtn) {
      sendBtn.classList.remove('hidden')
      sendBtn.style.opacity = '1'
      sendBtn.style.pointerEvents = 'auto'
    }
    if (stopBtn) {
      stopBtn.classList.add('hidden')
    }
    currentController = null
  }

  // 发送按钮点击事件
  sendBtn?.addEventListener('click', () => {
    handleSend()
  })
  messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  })

  // 停止按钮点击事件
  stopBtn?.addEventListener('click', () => {
    console.log('Stop button clicked')
    if (currentController) {
      currentController.abort()
    }
    isGenerating = false
    console.log('After stop, isGenerating:', isGenerating)
    userScrolledUp = false  // 停止后重置滚动标志
  })

  // 滚动占位符控制
  const inputPlaceholder = document.getElementById('input-placeholder')
  messageInput?.addEventListener('focus', () => {
    inputPlaceholder?.classList.add('hidden')
  })
  // 检测用户是否手动滚动到上方
  messagesContainer?.addEventListener('scroll', () => {
    if (!messagesContainer) return
    const distanceFromBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight
    // 如果用户滚动到距离底部超过50px，认为用户想要查看历史
    userScrolledUp = distanceFromBottom > 50
  })
  messageInput?.addEventListener('input', () => {
    if (messageInput && inputPlaceholder) {
      if (messageInput.value.trim()) {
        inputPlaceholder.classList.add('hidden')
      } else {
        inputPlaceholder.classList.remove('hidden')
      }
    }
  })

  // ========== 简历录入表单逻辑 ==========
  const resumeModal = document.getElementById('resume-modal')
  const manualInputBtn = document.getElementById('manual-input-btn')
  const btnCancel = document.getElementById('btn-cancel')
  const btnPrev = document.getElementById('btn-prev')
  const btnNext = document.getElementById('btn-next')
  const btnSubmit = document.getElementById('btn-submit')
  const resumePreview = document.getElementById('resume-preview')

  let currentStep = 1
  const totalSteps = 5

  // 表单数据存储
  const resumeData = {
    name: '',
    gender: '',
    birth: '',
    nation: '',
    phone: '',
    email: '',
    city: '',
    goal: '',
    school: '',
    degree: '',
    major: '',
    graduation: '',
    courses: '',
    workExperiences: [{ company: '', position: '', time: '', desc: '' }],
    skills: '',
    language: '',
    cert: '',
    intro: ''
  }

  // 打开模态框
  manualInputBtn?.addEventListener('click', () => {
    currentStep = 1
    updateStepUI()
    resumeModal?.classList.add('active')
    document.body.style.overflow = 'hidden'
    
    // 初始化工作经历容器
    initWorkExperience()
    
    // 添加输入监听器到所有必填字段
    const requiredIds = ['resume-name', 'resume-birth', 'resume-city', 'resume-goal', 
                         'resume-school', 'resume-degree', 'resume-major', 'resume-graduation', 
                         'resume-skills']
    requiredIds.forEach((id) => {
      const inputEl = document.getElementById(id)
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          const currentValue = (inputEl as HTMLInputElement | HTMLTextAreaElement).value.trim()
          if (currentValue) {
            const formGroup = inputEl.closest('.form-group')
            const labelEl = formGroup?.querySelector('.form-label') as HTMLElement
            labelEl?.classList.remove('error')
            inputEl.classList.remove('error')
          }
        })
      }
    })
  })

  // 关闭模态框
  btnCancel?.addEventListener('click', () => {
    resumeModal?.classList.remove('active')
    document.body.style.overflow = ''
    resetForm()
  })

  // 点击背景关闭
  resumeModal?.addEventListener('click', (e) => {
    if (e.target === resumeModal) {
      resumeModal.classList.remove('active')
      document.body.style.overflow = ''
      resetForm()
    }
  })

  // 自定义确认对话框
  const confirmDialog = document.getElementById('confirm-dialog')
  const confirmMessage = document.getElementById('confirm-message')
  const confirmCancelBtn = document.getElementById('confirm-cancel')
  const confirmOkBtn = document.getElementById('confirm-ok')
  let confirmCallback: (() => void) | null = null

  function showConfirmDialog(message: string, onConfirm: () => void) {
    if (confirmMessage) confirmMessage.textContent = message
    confirmCallback = onConfirm
    confirmDialog?.classList.add('active')
  }

  function hideConfirmDialog() {
    confirmDialog?.classList.remove('active')
    confirmCallback = null
  }

  confirmCancelBtn?.addEventListener('click', hideConfirmDialog)
  confirmOkBtn?.addEventListener('click', () => {
    if (confirmCallback) confirmCallback()
    hideConfirmDialog()
  })
  confirmDialog?.addEventListener('click', (e) => {
    if (e.target === confirmDialog) hideConfirmDialog()
  })

  // 上一步
  btnPrev?.addEventListener('click', () => {
    if (currentStep > 1) {
      saveCurrentStepData()
      currentStep--
      updateStepUI()
    }
  })

  // 下一步
  btnNext?.addEventListener('click', () => {
    saveCurrentStepData()
    if (currentStep < totalSteps) {
      currentStep++
      updateStepUI()
      // 最后一步时更新预览
      if (currentStep === 5) {
        updatePreview()
      }
    }
  })

  // 提交表单
  btnSubmit?.addEventListener('click', () => {
    saveCurrentStepData()
    
    // 先清除所有错误状态
    clearErrorStates()
    
    // 验证所有必填项
    const requiredFields = [
      { id: 'resume-name', label: '姓名', value: resumeData.name },
      { id: 'resume-birth', label: '出生年月', value: resumeData.birth },
      { id: 'resume-city', label: '所在城市', value: resumeData.city },
      { id: 'resume-goal', label: '求职意向', value: resumeData.goal },
      { id: 'resume-school', label: '毕业院校', value: resumeData.school },
      { id: 'resume-degree', label: '学历', value: resumeData.degree },
      { id: 'resume-major', label: '专业', value: resumeData.major },
      { id: 'resume-graduation', label: '毕业时间', value: resumeData.graduation },
      { id: 'resume-skills', label: '技能特长', value: resumeData.skills }
    ]
    
    const missingFields: string[] = []
    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        missingFields.push(field.label)
      }
    })
    
    if (missingFields.length > 0) {
      // 找到第一个未填的必填项
      let firstErrorId = ''
      for (const fieldId of requiredFields) {
        if (!fieldId.value.trim()) {
          firstErrorId = fieldId.id
          break
        }
      }

      // 找出该字段在哪个步骤
      const fieldStepMap: Record<string, number> = {
        'resume-name': 1, 'resume-birth': 1, 'resume-city': 1, 'resume-goal': 1,
        'resume-school': 2, 'resume-degree': 2, 'resume-major': 2, 'resume-graduation': 2,
        'resume-skills': 4
      }
      const targetStep = fieldStepMap[firstErrorId] || 1

      // 切换到目标步骤
      currentStep = targetStep
      updateStepUI()

      // 标记所有未填项为错误
      for (const fieldId of requiredFields) {
        if (!fieldId.value.trim()) {
          const inputEl = document.getElementById(fieldId.id) as HTMLElement
          const formGroup = inputEl?.closest('.form-group')
          const labelEl = formGroup?.querySelector('.form-label') as HTMLElement
          labelEl?.classList.add('error')
          inputEl?.classList.add('error')
        }
      }

      // 滚动到第一个错误项
      setTimeout(() => {
        const formContent = document.querySelector('.form-modal .form-content') as HTMLElement
        const firstErrorInput = document.getElementById(firstErrorId) as HTMLElement
        if (firstErrorInput && formContent) {
          formContent.scrollTop = firstErrorInput.offsetTop - 30
        }
      }, 50)
      return
    }

    // 生成纯文本简历内容
    const resumeText = generateResumeText()
    
    // 保存简历文本供 handleSend 使用
    pendingManualResumeText = resumeText
    lastResumeContent = resumeText  // 也保存到 lastResumeContent
    clearProfileData()  // 清除旧画像数据
    
    // 关闭模态框
    resumeModal?.classList.remove('active')
    document.body.style.overflow = ''
    
    // 重置表单
    resetForm()
    
    // 自动触发发送（模拟用户在输入框输入内容并点击发送）
    if (messageInput) {
      messageInput.value = '请分析我的简历'
    }
    handleSend()
  })

  // 更新步骤UI
  function updateStepUI() {
    // 更新步骤指示器
    const dots = document.querySelectorAll('.step-dot')
    dots.forEach((dot, index) => {
      const stepNum = index + 1
      dot.classList.remove('active', 'completed')
      if (stepNum === currentStep) {
        dot.classList.add('active')
      } else if (stepNum < currentStep) {
        dot.classList.add('completed')
      }
    })

    // 更新表单步骤显示
    const steps = document.querySelectorAll('.form-step')
    steps.forEach((step) => {
      const stepNum = parseInt(step.getAttribute('data-step') || '0')
      if (stepNum === currentStep) {
        step.classList.add('active')
      } else {
        step.classList.remove('active')
      }
    })

    // 更新按钮显示
    if (btnPrev) {
      btnPrev.classList.toggle('hidden', currentStep === 1)
    }
    if (btnNext) {
      btnNext.classList.toggle('hidden', currentStep === totalSteps)
    }
    if (btnSubmit) {
      btnSubmit.classList.toggle('hidden', currentStep !== totalSteps)
    }
  }

  // 保存当前步骤数据
  function saveCurrentStepData() {
    switch (currentStep) {
      case 1:
        resumeData.name = (document.getElementById('resume-name') as HTMLInputElement)?.value || ''
        resumeData.gender = (document.getElementById('resume-gender') as HTMLInputElement)?.value || ''
        resumeData.birth = (document.getElementById('resume-birth') as HTMLInputElement)?.value || ''
        resumeData.nation = (document.getElementById('resume-nation') as HTMLInputElement)?.value || ''
        resumeData.phone = (document.getElementById('resume-phone') as HTMLInputElement)?.value || ''
        resumeData.email = (document.getElementById('resume-email') as HTMLInputElement)?.value || ''
        resumeData.city = (document.getElementById('resume-city') as HTMLInputElement)?.value || ''
        resumeData.goal = (document.getElementById('resume-goal') as HTMLInputElement)?.value || ''
        break
      case 2:
        resumeData.school = (document.getElementById('resume-school') as HTMLInputElement)?.value || ''
        resumeData.degree = (document.getElementById('resume-degree') as HTMLInputElement)?.value || ''
        resumeData.major = (document.getElementById('resume-major') as HTMLInputElement)?.value || ''
        resumeData.graduation = (document.getElementById('resume-graduation') as HTMLInputElement)?.value || ''
        resumeData.courses = (document.getElementById('resume-courses') as HTMLTextAreaElement)?.value || ''
        break
      case 3:
        // 保存所有工作经历
        const workItems = document.querySelectorAll('.work-experience-item')
        workItems.forEach((item, index) => {
          if (resumeData.workExperiences[index]) {
            resumeData.workExperiences[index].company = (item.querySelector('.work-company') as HTMLInputElement)?.value || ''
            resumeData.workExperiences[index].position = (item.querySelector('.work-position') as HTMLInputElement)?.value || ''
            resumeData.workExperiences[index].time = (item.querySelector('.work-time') as HTMLInputElement)?.value || ''
            resumeData.workExperiences[index].desc = (item.querySelector('.work-desc') as HTMLTextAreaElement)?.value || ''
          }
        })
        break
      case 4:
        resumeData.skills = (document.getElementById('resume-skills') as HTMLTextAreaElement)?.value || ''
        resumeData.language = (document.getElementById('resume-language') as HTMLInputElement)?.value || ''
        resumeData.cert = (document.getElementById('resume-cert') as HTMLTextAreaElement)?.value || ''
        break
      case 5:
        resumeData.intro = (document.getElementById('resume-intro') as HTMLTextAreaElement)?.value || ''
        break
    }
  }

  // 更新预览
  function updatePreview() {
    if (!resumePreview) return
    
    let html = ''
    
    if (resumeData.name || resumeData.goal) {
      html += `
        <div class="resume-section">
          <div class="resume-section-title">基本信息</div>
          <div class="resume-item-content">
姓名：${resumeData.name || '-'}
性别：${resumeData.gender || '-'}
出生年月：${resumeData.birth || '-'}
民族：${resumeData.nation || '-'}
联系电话：${resumeData.phone || '-'}
邮箱：${resumeData.email || '-'}
所在城市：${resumeData.city || '-'}
求职意向：${resumeData.goal || '-'}
          </div>
        </div>
      `
    }

    if (resumeData.school || resumeData.degree) {
      html += `
        <div class="resume-section">
          <div class="resume-section-title">教育背景</div>
          <div class="resume-item-content">
学校：${resumeData.school || '-'}
学历：${resumeData.degree || '-'}
专业：${resumeData.major || '-'}
毕业时间：${resumeData.graduation || '-'}
${resumeData.courses ? '主修课程：' + resumeData.courses : ''}
          </div>
        </div>
      `
    }

    // 工作经历
    const hasWork = resumeData.workExperiences.some(exp => exp.company || exp.position || exp.desc)
    if (hasWork) {
      html += `
        <div class="resume-section">
          <div class="resume-section-title">工作经历</div>
          <div class="resume-item-content">
      `
      resumeData.workExperiences.forEach((exp, index) => {
        if (exp.company || exp.position || exp.desc) {
          html += `${index > 0 ? '\n\n' : ''}公司：${exp.company || '-'}
职位：${exp.position || '-'}
工作时间：${exp.time || '-'}
工作内容：${exp.desc || '-'}\n`
        }
      })
      html += `</div>
        </div>
      `
    }

    if (resumeData.skills || resumeData.language || resumeData.cert) {
      html += `
        <div class="resume-section">
          <div class="resume-section-title">技能证书</div>
          <div class="resume-item-content">
技能：${resumeData.skills || '-'}
语言能力：${resumeData.language || '-'}
其他证书：${resumeData.cert || '-'}
          </div>
        </div>
      `
    }

    if (resumeData.intro) {
      html += `
        <div class="resume-section">
          <div class="resume-section-title">自我评价</div>
          <div class="resume-item-content">${resumeData.intro}</div>
        </div>
      `
    }

    resumePreview.innerHTML = html || '<p class="text-gray-400 text-sm text-center">暂无内容</p>'
  }

  // 生成纯文本简历
  function generateResumeText(): string {
    let text = ''

    if (resumeData.name) {
      text += '个人简历\n\n'
      text += '姓名：' + resumeData.name + '\n'
      if (resumeData.gender) text += '性别：' + resumeData.gender + '\n'
      if (resumeData.birth) text += '出生年月：' + resumeData.birth + '\n'
      if (resumeData.nation) text += '民族：' + resumeData.nation + '\n'
      if (resumeData.phone) text += '电话：' + resumeData.phone + '\n'
      if (resumeData.email) text += '邮箱：' + resumeData.email + '\n'
      if (resumeData.city) text += '住址：' + resumeData.city + '\n'
      if (resumeData.goal) text += '求职意向：' + resumeData.goal + '\n'
    }

    if (resumeData.school) {
      text += '\n教育背景\n'
      text += resumeData.school + ' '
      if (resumeData.graduation) text += resumeData.graduation + ' '
      if (resumeData.degree) text += resumeData.degree
      if (resumeData.major) text += ' ' + resumeData.major + '\n'
      else text += '\n'
      if (resumeData.courses) text += '主修课程：' + resumeData.courses + '\n'
    }

    // 工作经历
    const hasWork = resumeData.workExperiences.some(exp => exp.company || exp.position || exp.desc)
    if (hasWork) {
      text += '\n工作经历\n'
      resumeData.workExperiences.forEach((exp, index) => {
        if (exp.company || exp.position || exp.desc) {
          if (index > 0) text += '\n'
          if (exp.company) text += exp.company + ' '
          if (exp.time) text += exp.time + '\n'
          else text += '\n'
          if (exp.position) text += exp.position + '\n'
          if (exp.desc) text += exp.desc + '\n'
        }
      })
    }

    const certs: string[] = []
    if (resumeData.skills) certs.push(resumeData.skills)
    if (resumeData.language) certs.push(resumeData.language)
    if (resumeData.cert) certs.push(resumeData.cert)
    if (certs.length > 0) {
      text += '\n技能证书\n'
      text += certs.join('\n') + '\n'
    }

    if (resumeData.intro) {
      text += '\n自我评价\n'
      text += resumeData.intro + '\n'
    }

    return text.trim()
  }

  // 清除所有错误状态
  function clearErrorStates() {
    const errorLabels = document.querySelectorAll('.form-label.error')
    const errorInputs = document.querySelectorAll('.form-input.error')
    errorLabels.forEach((el) => el.classList.remove('error'))
    errorInputs.forEach((el) => el.classList.remove('error'))
  }

  // 工作经历管理
  function initWorkExperience() {
    const container = document.getElementById('work-experience-container')
    if (!container) return

    // 清空工作经历项（保留按钮）
    const existingItems = container.querySelectorAll('.work-experience-item')
    existingItems.forEach(item => item.remove())
    
    // 重置数据
    resumeData.workExperiences = [{ company: '', position: '', time: '', desc: '' }]
    addWorkExperienceItem(0)
    updateRemoveButtons()
  }

  function addWorkExperienceItem(index: number) {
    const container = document.getElementById('work-experience-container')
    if (!container) return

    const item = document.createElement('div')
    item.className = 'work-experience-item'
    item.dataset.index = String(index)
    item.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs text-gray-500 work-item-label">第${index + 1}段工作经历</span>
        <button type="button" class="remove-work-btn text-red-500 hover:text-red-600 text-xs" onclick="removeWorkExp(${index})">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="form-group">
        <label class="form-label">公司名称</label>
        <input type="text" class="form-input work-company" placeholder="请输入公司名称" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">职位</label>
          <input type="text" class="form-input work-position" placeholder="请输入职位名称" />
        </div>
        <div class="form-group">
          <label class="form-label">工作时间</label>
          <input type="text" class="form-input work-time" placeholder="如：2020.03-至今" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">工作内容</label>
        <textarea class="form-input form-textarea work-desc" placeholder="请描述您的主要工作内容"></textarea>
      </div>
    `

    // 添加到容器开头
    container.insertBefore(item, container.firstChild)

    // 更新标签和删除按钮状态
    updateWorkLabels()
    updateRemoveButtons()
  }

  // 全局函数用于删除工作经历
  ;(window as unknown as Record<string, unknown>).removeWorkExp = function(index: number) {
    if (resumeData.workExperiences.length <= 1) {
      alert('至少需要保留一段工作经历')
      return
    }
    
    if (resumeData.workExperiences.length <= 1) {
      showConfirmDialog('至少需要保留一段工作经历', () => {})
      return
    }
    
    showConfirmDialog('确定要删除这段工作经历吗？', () => {
      resumeData.workExperiences.splice(index, 1)
      
      // 重新渲染工作经历
      const container = document.getElementById('work-experience-container')
      if (!container) return
      
      container.innerHTML = ''
      resumeData.workExperiences.forEach((_, i) => {
        addWorkExperienceItem(i)
      })
    })
  }

  function removeWorkExperience(index: number) {
    if (resumeData.workExperiences.length <= 1) return

    resumeData.workExperiences.splice(index, 1)
    initWorkExperience()

    // 恢复其他工作经历的值
    resumeData.workExperiences.forEach((exp, i) => {
      const item = document.querySelector(`.work-experience-item[data-index="${i}"]`)
      if (item) {
        (item.querySelector('.work-company') as HTMLInputElement).value = exp.company
        ;(item.querySelector('.work-position') as HTMLInputElement).value = exp.position
        ;(item.querySelector('.work-time') as HTMLInputElement).value = exp.time
        ;(item.querySelector('.work-desc') as HTMLTextAreaElement).value = exp.desc
      }
    })
  }

  function updateWorkLabels() {
    const items = document.querySelectorAll('.work-experience-item')
    items.forEach((item, index) => {
      const label = item.querySelector('.work-item-label')
      if (label) {
        label.textContent = `第${index + 1}段工作经历`
      }
      ;(item as HTMLElement).dataset.index = String(index)
    })
  }

  function updateRemoveButtons() {
    const items = document.querySelectorAll('.work-experience-item')
    const removeBtns = document.querySelectorAll('.remove-work-btn')
    removeBtns.forEach((btn, index) => {
      if (items.length <= 1) {
        btn.classList.add('hidden')
      } else {
        btn.classList.remove('hidden')
      }
    })
  }

  // 全局函数：添加工作经历
  ;(window as unknown as Record<string, unknown>).handleAddWork = function() {
    resumeData.workExperiences.push({ company: '', position: '', time: '', desc: '' })
    addWorkExperienceItem(resumeData.workExperiences.length - 1)
  }

  // 重置表单
  function resetForm() {
    currentStep = 1
    // 重置基本字段
    ;(resumeData as Record<string, unknown>).name = ''
    ;(resumeData as Record<string, unknown>).gender = ''
    ;(resumeData as Record<string, unknown>).birth = ''
    ;(resumeData as Record<string, unknown>).nation = ''
    ;(resumeData as Record<string, unknown>).phone = ''
    ;(resumeData as Record<string, unknown>).email = ''
    ;(resumeData as Record<string, unknown>).city = ''
    ;(resumeData as Record<string, unknown>).goal = ''
    ;(resumeData as Record<string, unknown>).school = ''
    ;(resumeData as Record<string, unknown>).degree = ''
    ;(resumeData as Record<string, unknown>).major = ''
    ;(resumeData as Record<string, unknown>).graduation = ''
    ;(resumeData as Record<string, unknown>).courses = ''
    ;(resumeData as Record<string, unknown>).skills = ''
    ;(resumeData as Record<string, unknown>).language = ''
    ;(resumeData as Record<string, unknown>).cert = ''
    ;(resumeData as Record<string, unknown>).intro = ''
    // 重置工作经历
    resumeData.workExperiences = [{ company: '', position: '', time: '', desc: '' }]
    
    // 清除错误状态
    clearErrorStates()
    // 清空所有输入
    const inputs = document.querySelectorAll('#resume-modal input, #resume-modal textarea')
    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        input.value = ''
      }
    })
    
    // 重置预览
    if (resumePreview) {
      resumePreview.innerHTML = ''
    }
  }

  // ========== 岗位搜索与筛选功能 ==========
  const filterTags = document.querySelectorAll<HTMLButtonElement>('.filter-tag')
  const searchBtn = document.getElementById('search-btn')
  const filterResults = document.getElementById('filter-results')
  
  // 存储已选筛选条件
  const selectedFilters: Record<string, string> = {}
  
  // 筛选选项数据 - 根据实际数据库值
  const filterOptions: Record<string, string[]> = {
    industry: ['IT服务', '互联网', '计算机软件', '云计算/大数据', '人工智能', '通信/网络设备', '电子/半导体/集成电路'],
    salary: ['3000-4000元', '4000-6000元', '5000-7000元', '6000-8000元', '7000-10000元', '8000-12000元', '1-1.5万', '1.5-2万', '2-3万', '3万以上'],
    location: ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安'],
    company: ['已上市', 'A轮', 'B轮', 'C轮', 'D轮及以上', '天使轮', '未融资'],
    size: ['20人以下', '20-99人', '100-299人', '300-499人', '500-999人', '1000-9999人', '10000人以上'],
    jobType: ['C/C++', 'Java', 'Python', '前端开发', '后端开发', '算法工程师', '产品经理', '数据分析师', '测试工程师', '运维工程师', 'UI设计', '运营']
  }
  
  // 筛选类型中文名称
  const filterNames: Record<string, string> = {
    industry: '行业',
    salary: '薪资',
    location: '地点',
    company: '公司性质',
    size: '公司规模',
    jobType: '岗位类型'
  }
  
  // 格式化薪资，去除 "·XX薪" 等额外内容
  function formatSalary(salary: string | undefined | null): string {
    if (!salary) return '面议'
    // 去除 ·XX薪 或 ·XX薪 的格式
    return salary.replace(/·\d+薪$/, '').replace(/·\d+薪·\d+薪$/, '')
  }
  
  // 渲染筛选结果
  function renderFilterResults() {
    if (!filterResults) return
    
    const entries = Object.entries(selectedFilters)
    if (entries.length === 0) {
      filterResults.classList.add('hidden')
      // 当筛选条件被清空时，恢复原始卡片区域内容
      if (cardsPanel && originalCardsPanelHTML) {
        cardsPanel.innerHTML = originalCardsPanelHTML
      }
      return
    }
    
    filterResults.classList.remove('hidden')
    filterResults.innerHTML = entries.map(([key, value]) => `
      <span class="filter-result-tag">
        <span>${value}</span>
        <span class="remove-result" data-filter="${key}">&times;</span>
      </span>
    `).join('')
    
    // 绑定删除事件
    filterResults.querySelectorAll<HTMLSpanElement>('.remove-result').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterKey = btn.dataset.filter
        if (filterKey && selectedFilters[filterKey]) {
          delete selectedFilters[filterKey]
          // 取消对应tag的激活状态
          const tag = document.querySelector<HTMLButtonElement>(`.filter-tag[data-filter="${filterKey}"]`)
          if (tag) {
            tag.classList.remove('active')
            const span = tag.querySelector('span')
            if (span) span.textContent = getFilterName(filterKey)
          }
          renderFilterResults()
        }
      })
    })
  }
  
  // 获取筛选类型名称
  function getFilterName(filterType: string): string {
    return filterNames[filterType] || filterType
  }
  
  // 创建筛选面板
  function createFilterPanel(filterType: string, anchorElement: HTMLElement): HTMLDivElement {
    const panel = document.createElement('div')
    panel.className = 'filter-panel'
    panel.style.position = 'relative'
    
    const title = document.createElement('div')
    title.className = 'filter-panel-title'
    title.textContent = `选择${getFilterName(filterType)}`
    panel.appendChild(title)
    
    const options = document.createElement('div')
    options.className = 'filter-options'
    
    filterOptions[filterType]?.forEach(option => {
      const opt = document.createElement('button')
      opt.className = 'filter-option' + (selectedFilters[filterType] === option ? ' selected' : '')
      opt.textContent = option
      opt.addEventListener('click', () => {
        if (selectedFilters[filterType] === option) {
          delete selectedFilters[filterType]
          opt.classList.remove('selected')
        } else {
          // 清除同类型其他选中
          options.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'))
          selectedFilters[filterType] = option
          opt.classList.add('selected')
        }
        
        // 更新tag显示
        const tag = anchorElement
        const span = tag.querySelector('span')
        if (span) {
          span.textContent = selectedFilters[filterType] || getFilterName(filterType)
        }
        
        if (selectedFilters[filterType]) {
          tag.classList.add('active')
        } else {
          tag.classList.remove('active')
        }
        
        renderFilterResults()
        panel.remove()
      })
      options.appendChild(opt)
    })
    
    panel.appendChild(options)
    return panel
  }
  
  // 点击筛选标签
  filterTags.forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.stopPropagation()
      const filterType = tag.dataset.filter
      if (!filterType) return
      
      // 关闭其他打开的面板
      document.querySelectorAll('.filter-panel').forEach(p => p.remove())
      
      // 创建并显示面板
      const panel = createFilterPanel(filterType, tag)
      tag.style.position = 'relative'
      tag.appendChild(panel)
    })
  })
  
  // 点击其他地方关闭面板
  document.addEventListener('click', () => {
    document.querySelectorAll('.filter-panel').forEach(p => p.remove())
  })
  
  // 获取关键词搜索输入框
  const keywordSearchInput = document.getElementById('keyword-search') as HTMLInputElement | null
  
  // 搜索按钮点击
  searchBtn?.addEventListener('click', async () => {
    const keyword = keywordSearchInput?.value.trim() || ''
    const entries = Object.entries(selectedFilters)
    
    // 如果既没有选择筛选条件也没有输入关键词，恢复原始界面
    if (entries.length === 0 && !keyword) {
      // 恢复原始卡片区域内容
      if (cardsPanel && originalCardsPanelHTML) {
        cardsPanel.innerHTML = originalCardsPanelHTML
      }
      // 清空筛选结果标签
      const filterResults = document.getElementById('filter-results')
      if (filterResults) {
        filterResults.innerHTML = ''
        filterResults.classList.add('hidden')
      }
      return
    }
    
    // 显示加载状态
    searchBtn.innerHTML = `
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>搜索中</span>
    `
    
    try {
      // 构建搜索参数
      const searchParams: Record<string, string> = { ...selectedFilters }
      if (keyword) {
        searchParams.keyword = keyword
      }
      
      // 调用搜索API
      const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      })
      
      const data = await response.json()
      
      if (data.success && data.jobs?.length > 0) {
        // 将搜索结果显示在左侧卡片区域
        displayJobSearchResults(data.jobs)
        showToast(`找到 ${data.jobs.length} 个岗位`)
      } else if (data.success && data.jobs?.length === 0) {
        showToast('未找到符合条件的岗位')
      } else {
        showToast(data.error || '搜索失败，请重试')
      }
    } catch (error) {
      console.error('搜索失败:', error)
      showToast('搜索失败，请重试')
    } finally {
      // 恢复按钮状态
      searchBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <span>搜索</span>
      `
    }
  })
  
  // 在左侧卡片区域显示搜索结果
  function displayJobSearchResults(jobs: Array<{
    id: number
    title: string
    company: string
    salary: string
    location: string
    industry: string
    company_type: string
    description: string
  }>) {
    const cardsPanel = document.getElementById('cards-panel')
    if (!cardsPanel) return
    
    // 清空并显示搜索结果
    cardsPanel.innerHTML = `
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between px-4 py-3">
          <h2 class="text-xl font-semibold text-gray-700">搜索结果</h2>
          <span class="text-sm text-gray-500">共 ${jobs.length} 个岗位</span>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            ${jobs.map(job => `
              <div class="job-card rounded-2xl p-4 transition-all duration-300 cursor-pointer" data-job-id="${job.id}">
                <div class="flex items-start justify-between mb-2">
                  <h3 class="font-semibold text-gray-700 text-sm leading-tight">${job.title || '未知岗位'}</h3>
                  <span class="job-tag job-tag-salary">${formatSalary(job.salary)}</span>
                </div>
                <p class="text-xs text-gray-500 mb-2">${job.company || '未知公司'}</p>
                <div class="flex flex-wrap gap-1 mb-2">
                  ${job.location ? `<span class="job-tag job-tag-location">${job.location}</span>` : ''}
                  ${job.industry ? `<span class="job-tag job-tag-industry">${job.industry}</span>` : ''}
                  ${job.company_type ? `<span class="job-tag job-tag-company">${job.company_type}</span>` : ''}
                  ${job.company_size ? `<span class="job-tag job-tag-size">${job.company_size}</span>` : ''}
                </div>
                <p class="text-xs text-gray-400 line-clamp-2">${(job.description || '').replace(/<[^>]+>/g, '') || '暂无描述'}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `
    
    // 绑定岗位卡片点击事件
    cardsPanel.querySelectorAll<HTMLDivElement>('.job-card').forEach(card => {
      card.addEventListener('click', () => {
        const jobId = card.dataset.jobId
        if (jobId) {
          showJobDetail(parseInt(jobId))
        }
      })
    })
  }
  
  // 显示岗位详情弹窗
  function showJobDetailModal(jobData: {
    job: {
      id: number
      job_title: string
      company_name: string
      salary_range: string
      address: string
      industry: string
      company_type: string
      job_description: string
    }
    profile?: {
      professional_skills: string
      certificate_requirements: string
      innovation_ability: number
      learning_ability: number
      pressure_resistance: number
      communication_ability: number
      education_requirement: string
      work_experience_requirement: string
      career_direction: string
    }
    career_paths: Array<{
      path_type: string
      difficulty: string
      years_required: number
      additional_skills: string
      additional_certificates: string
      promotion_conditions: string
      salary_change: string
      path_description: string
      is_recommended: number
      to_job_name: string
    }>
    transfer_paths: Array<{
      id: number
      from_job_id: number
      to_job_id: number
      path_type: string
      intermediate_job_id: number | null
      transfer_difficulty: string
      steps_required: number
      additional_skills: string
      additional_certificates: string
      transfer_conditions: string
      salary_impact: string
      transfer_tips: string
      blood_relationship: string
      is_recommended: boolean
      from_job: { id: number; profile_name: string; category: string }
      to_job: { id: number; profile_name: string; category: string }
      intermediate_job: { id: number; profile_name: string; category: string } | null
    }>
  }) {
    const modal = document.getElementById('job-detail-modal')
    const title = document.getElementById('job-detail-title')
    const content = document.getElementById('job-detail-content')
    
    if (!modal || !title || !content) return
    
    const { job, profile, career_paths, transfer_paths } = jobData
    
    // 检查是否有任何岗位画像信息
    const hasProfileInfo = profile && (
      profile.professional_skills || 
      profile.certificate_requirements || 
      profile.innovation_ability > 0 || 
      profile.learning_ability > 0 || 
      profile.pressure_resistance > 0 || 
      profile.communication_ability > 0
    )
    const hasCareerPaths = career_paths && career_paths.length > 0
    const hasTransferPaths = transfer_paths && transfer_paths.length > 0
    const hasAnyInfo = hasProfileInfo || hasCareerPaths || hasTransferPaths
    
    // 设置标题
    title.textContent = job.job_title
    
    // 构建内容
    let html = ''
    
    // 基本信息
    html += `
      <div class="job-info-basic">
        <div class="job-info-item">
          <span class="job-info-label">公司名称</span>
          <span class="job-info-value">${job.company_name || '未知'}</span>
        </div>
        <div class="job-info-item">
          <span class="job-info-label">薪资范围</span>
          <span class="job-info-value">${formatSalary(job.salary_range)}</span>
        </div>
        <div class="job-info-item">
          <span class="job-info-label">工作地点</span>
          <span class="job-info-value">${job.address || '未知'}</span>
        </div>
        <div class="job-info-item">
          <span class="job-info-label">公司类型</span>
          <span class="job-info-value">${job.company_type || '未知'}</span>
        </div>
        <div class="job-info-item">
          <span class="job-info-label">行业</span>
          <span class="job-info-value">${job.industry || '未知'}</span>
        </div>
        <div class="job-info-item">
          <span class="job-info-label">学历要求</span>
          <span class="job-info-value">${profile?.education_requirement || '不限'}</span>
        </div>
      </div>
    `
    
    // 如果没有任何岗位画像信息，不显示岗位画像区域
    if (!hasAnyInfo) {
      // 只显示基本信息和岗位描述
      if (job.job_description) {
        html += `
          <div class="job-skills-section">
            <h4 class="job-section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              岗位描述
            </h4>
            <p style="font-size: 0.8rem; color: #5A7A8A; line-height: 1.6;">${job.job_description.replace(/<[^>]+>/g, '')}</p>
          </div>
        `
      }
    }
    
    // 更新内容
    content.innerHTML = html
    
    // 绑定按钮事件（无论是否有岗位画像信息，都需要绑定）
    const sendBtn = document.getElementById('send-to-ai-btn')
    const closeBtn = document.getElementById('close-job-detail')
    
    if (sendBtn) {
      sendBtn.onclick = () => {
        // 填充到输入框
        const messageInput = document.getElementById('message-input') as HTMLInputElement
        if (messageInput) {
          let prompt = `请分析这个岗位：${job.job_title || '未知岗位'}（${job.company_name || '未知公司'}）`
          if (profile) {
            prompt += `\n\n【专业技能】${profile.professional_skills || '暂无'}${profile.certificate_requirements ? `\n【证书要求】${profile.certificate_requirements}` : ''}`
            prompt += `\n【能力评分】创新能力${profile.innovation_ability || 0}/5, 学习能力${profile.learning_ability || 0}/5, 抗压能力${profile.pressure_resistance || 0}/5, 沟通能力${profile.communication_ability || 0}/5`
          }
          if (career_paths && career_paths.length > 0) {
            prompt += `\n\n【晋升路径】`
            career_paths.forEach((path, i) => {
              prompt += `\n${i + 1}. ${path.to_job_name || '未知岗位'}（${path.path_type === 'vertical' ? '垂直晋升' : '横向转岗'}，${path.years_required || 0}年，${path.difficulty === 'easy' ? '容易' : path.difficulty === 'medium' ? '中等' : '困难'}）`
              if (path.additional_skills) prompt += `\n   补充技能：${path.additional_skills}`
            })
          }
          if (transfer_paths && transfer_paths.length > 0) {
            prompt += `\n\n【换岗路径】`
            transfer_paths.forEach((path, i) => {
              prompt += `\n${i + 1}. ${path.to_job.profile_name || '未知岗位'}（${path.path_type === 'direct' ? '直接转换' : '多步转换'}，${path.steps_required}步，${path.transfer_difficulty === 'easy' ? '容易' : path.transfer_difficulty === 'medium' ? '中等' : '困难'}）`
              if (path.additional_skills) prompt += `\n   补充技能：${path.additional_skills}`
              if (path.blood_relationship) prompt += `\n   血缘关系：${path.blood_relationship}`
            })
          }
          prompt += `\n\n请帮我分析这个岗位的发展前景，并给出职业规划建议。`
          
          messageInput.value = prompt
          messageInput.focus()
        }
        
        // 关闭弹窗
        modal.classList.remove('show')
        
        // 切换到对话面板
        const tabChat = document.getElementById('tab-chat')
        if (tabChat) {
          tabChat.click()
        }
      }
    }
    
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.remove('show')
      }
    }
    
    // 点击背景关闭
    modal.onclick = (e) => {
      const target = e.target as HTMLElement
      if (target === modal || target.classList.contains('job-detail-overlay')) {
        modal.classList.remove('show')
      }
    }
    
    // 显示弹窗
    modal.classList.add('show')
    return
    
    // 岗位画像 - 只有存在时才显示
    if (hasProfileInfo && profile) {
      // 专业技能
      const profileSkills = profile!.professional_skills
      const skillsData = profileSkills ? profileSkills.split(/[,，、]/).filter(Boolean) : []
      if (skillsData.length > 0) {
        html += `
          <div class="job-skills-section">
            <h4 class="job-section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              专业技能
            </h4>
            <div class="skills-tags">
              ${skillsData.map((s: string) => `<span class="skill-tag">${s.trim()}</span>`).join('')}
            </div>
          </div>
        `
      }
      
      // 证书要求
      const profileCerts = profile!.certificate_requirements
      const certsData = profileCerts ? profileCerts.split(/[,，、]/).filter(Boolean) : []
      if (certsData.length > 0) {
        html += `
          <div class="job-skills-section">
            <h4 class="job-section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
              证书要求
            </h4>
            <div class="skills-tags">
              ${certsData.map((c: string) => `<span class="skill-tag">${c.trim()}</span>`).join('')}
            </div>
          </div>
        `
      }
      
      // 能力评分
      const abilities = [
        { name: '创新能力', value: profile?.innovation_ability || 0, color: '#5BBF8A' },
        { name: '学习能力', value: profile?.learning_ability || 0, color: '#4A9EC4' },
        { name: '抗压能力', value: profile?.pressure_resistance || 0, color: '#9B59B6' },
        { name: '沟通能力', value: profile?.communication_ability || 0, color: '#E67E22' }
      ]
      
      html += `
        <div class="job-skills-section">
          <h4 class="job-section-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            能力评分
          </h4>
          <div class="ability-scores">
            ${abilities.map(a => `
              <div class="ability-item">
                <span class="ability-name">${a.name}</span>
                <div class="ability-bar">
                  <div class="ability-fill" style="width: ${(a.value / 5) * 100}%; background: ${a.color};"></div>
                </div>
                <span class="ability-score">${a.value}/5</span>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }
    
    // 晋升路径（垂直晋升）
    const verticalPaths = career_paths?.filter(p => p.path_type === 'vertical') || []
    if (verticalPaths.length > 0) {
      html += `
        <div class="career-paths-section">
          <h4 class="job-section-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
            垂直晋升路径（${verticalPaths.length}条）
          </h4>
          ${verticalPaths.map(path => `
            <div class="career-path-card">
              <div class="career-path-header">
                <span class="career-path-title">📈 → ${path.to_job_name || '未知岗位'}</span>
                <span class="career-path-type vertical">垂直晋升</span>
              </div>
              <div class="career-path-info">
                <span>⏱️ ${path.years_required || 0}年</span>
                <span>📊 ${path.difficulty === 'easy' ? '容易' : path.difficulty === 'medium' ? '中等' : '困难'}</span>
                ${path.is_recommended ? '<span>⭐ 推荐</span>' : ''}
              </div>
              ${path.additional_skills ? `<p class="career-path-desc"><strong>补充技能：</strong>${path.additional_skills}</p>` : ''}
              ${path.promotion_conditions ? `<p class="career-path-desc"><strong>晋升条件：</strong>${path.promotion_conditions}</p>` : ''}
              ${path.salary_change ? `<p class="career-path-desc"><strong>薪资变化：</strong>${path.salary_change}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `
    }
    
    // 横向转岗路径（来自职业路径）
    const horizontalPaths = career_paths?.filter(p => p.path_type === 'horizontal') || []
    if (horizontalPaths.length > 0) {
      html += `
        <div class="career-paths-section">
          <h4 class="job-section-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            横向转岗路径（${horizontalPaths.length}条）
          </h4>
          ${horizontalPaths.map(path => `
            <div class="career-path-card">
              <div class="career-path-header">
                <span class="career-path-title">🔄 → ${path.to_job_name || '未知岗位'}</span>
                <span class="career-path-type horizontal">横向转岗</span>
              </div>
              <div class="career-path-info">
                <span>⏱️ ${path.years_required || 0}年</span>
                <span>📊 ${path.difficulty === 'easy' ? '容易' : path.difficulty === 'medium' ? '中等' : '困难'}</span>
                ${path.is_recommended ? '<span>⭐ 推荐</span>' : ''}
              </div>
              ${path.additional_skills ? `<p class="career-path-desc"><strong>补充技能：</strong>${path.additional_skills}</p>` : ''}
              ${path.promotion_conditions ? `<p class="career-path-desc"><strong>转岗条件：</strong>${path.promotion_conditions}</p>` : ''}
              ${path.salary_change ? `<p class="career-path-desc"><strong>薪资变化：</strong>${path.salary_change}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `
    }
    
    // 换岗路径图谱（来自 job_transfer_graph 表）
    if (hasTransferPaths) {
      const directPaths = transfer_paths.filter(p => p.path_type === 'direct')
      const multiStepPaths = transfer_paths.filter(p => p.path_type === 'through')
      
      html += `
        <div class="career-paths-section">
          <h4 class="job-section-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg>
            换岗路径图谱（${transfer_paths.length}条）
          </h4>
          
          ${directPaths.length > 0 ? `
            <div class="transfer-sub-section">
              <h5 class="transfer-sub-title">直接转换（${directPaths.length}条）</h5>
              ${directPaths.map(path => `
                <div class="career-path-card transfer-path-card">
                  <div class="career-path-header">
                    <span class="career-path-title">${path.to_job.profile_name || '未知岗位'}</span>
                    <div class="career-path-badges">
                      <span class="career-path-type direct">直接转换</span>
                      <span class="difficulty-badge ${path.transfer_difficulty}">${
                        path.transfer_difficulty === 'easy' ? '容易' : 
                        path.transfer_difficulty === 'medium' ? '中等' : '困难'
                      }</span>
                      ${path.is_recommended ? '<span class="recommended-badge">⭐ 推荐</span>' : ''}
                    </div>
                  </div>
                  <div class="career-path-info">
                    <span>📊 ${path.steps_required}步</span>
                  </div>
                  ${path.blood_relationship ? `<p class="career-path-desc"><strong>血缘关系：</strong>${path.blood_relationship}</p>` : ''}
                  ${path.additional_skills ? `<p class="career-path-desc"><strong>补充技能：</strong>${path.additional_skills}</p>` : ''}
                  ${path.additional_certificates ? `<p class="career-path-desc"><strong>证书要求：</strong>${path.additional_certificates}</p>` : ''}
                  ${path.salary_impact ? `<p class="career-path-desc"><strong>薪资影响：</strong>${path.salary_impact}</p>` : ''}
                  ${path.transfer_tips ? `<p class="career-path-desc"><strong>转换建议：</strong>${path.transfer_tips}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${multiStepPaths.length > 0 ? `
            <div class="transfer-sub-section">
              <h5 class="transfer-sub-title">多步转换（${multiStepPaths.length}条）</h5>
              ${multiStepPaths.map(path => `
                <div class="career-path-card transfer-path-card">
                  <div class="career-path-header">
                    <span class="career-path-title">${path.to_job.profile_name || '未知岗位'}</span>
                    <div class="career-path-badges">
                      <span class="career-path-type through">多步转换</span>
                      <span class="difficulty-badge ${path.transfer_difficulty}">${
                        path.transfer_difficulty === 'easy' ? '容易' : 
                        path.transfer_difficulty === 'medium' ? '中等' : '困难'
                      }</span>
                      ${path.is_recommended ? '<span class="recommended-badge">⭐ 推荐</span>' : ''}
                    </div>
                  </div>
                  <div class="career-path-info">
                    <span>📊 ${path.steps_required}步</span>
                  </div>
                  ${path.intermediate_job ? `<p class="career-path-desc"><strong>中间岗位：</strong>${path.intermediate_job.profile_name}</p>` : ''}
                  ${path.blood_relationship ? `<p class="career-path-desc"><strong>血缘关系：</strong>${path.blood_relationship}</p>` : ''}
                  ${path.additional_skills ? `<p class="career-path-desc"><strong>补充技能：</strong>${path.additional_skills}</p>` : ''}
                  ${path.additional_certificates ? `<p class="career-path-desc"><strong>证书要求：</strong>${path.additional_certificates}</p>` : ''}
                  ${path.salary_impact ? `<p class="career-path-desc"><strong>薪资影响：</strong>${path.salary_impact}</p>` : ''}
                  ${path.transfer_tips ? `<p class="career-path-desc"><strong>转换建议：</strong>${path.transfer_tips}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `
    }
    
    // 岗位描述
    if (job.job_description) {
      html += `
        <div class="job-skills-section">
          <h4 class="job-section-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            岗位描述
          </h4>
          <p style="font-size: 0.8rem; color: #5A7A8A; line-height: 1.6;">${job.job_description.replace(/<[^>]+>/g, '')}</p>
        </div>
      `
    }
  }
  
  // 显示岗位详情（发送给AI分析）
  async function showJobDetail(jobId: number) {
    try {
      // 并行获取岗位详情和换岗路径
      const [jobResponse, transferPathsResponse] = await Promise.all([
        fetch(`/api/jobs/${jobId}`),
        fetch(`/api/transfer-paths/${jobId}`)
      ])
      
      const jobData = await jobResponse.json()
      const transferPathsData = await transferPathsResponse.json()
      
      if (jobData.success && jobData.job) {
        // 将换岗路径数据添加到 jobData 中
        const transferPaths = transferPathsData.success ? transferPathsData.data : []
        showJobDetailModal({
          ...jobData,
          transfer_paths: transferPaths
        })
      }
    } catch (error) {
      console.error('获取岗位详情失败:', error)
      showToast('获取岗位详情失败')
    }
  }
  
  // 绘制雷达图
  function drawRadarChart(canvasId: string, data: Record<string, number>) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 设置高清画布
    const dpr = window.devicePixelRatio || 1
    const displayWidth = 320
    const displayHeight = 360
    
    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    ctx.scale(dpr, dpr)
    
    const width = displayWidth
    const height = displayHeight
    const centerX = width / 2
    const centerY = height / 2 - 10
    const maxRadius = Math.min(width, height) / 2 - 70
    
    // 清空画布
    ctx.clearRect(0, 0, width, height)
    
    const labels = Object.keys(data)
    const values = Object.values(data)
    const numPoints = labels.length
    const angleStep = (2 * Math.PI) / numPoints
    
    // 颜色配置
    const gridColor = 'rgba(138, 120, 191, 0.25)'
    const fillColor = 'rgba(138, 120, 191, 0.25)'
    const strokeColor = 'rgba(138, 120, 191, 0.9)'
    const labelColor = '#6A5A8F'
    const scoreColor = '#8A78BF'
    
    // 绘制网格层级标注
    const gridLevels = [20, 40, 60, 80, 100]
    gridLevels.forEach(level => {
      const levelRadius = (level / 100) * maxRadius
      
      ctx.beginPath()
      for (let i = 0; i <= numPoints; i++) {
        const angle = i * angleStep - Math.PI / 2
        const x = centerX + levelRadius * Math.cos(angle)
        const y = centerY + levelRadius * Math.sin(angle)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      ctx.stroke()
      
      // 在右侧标注层级分数
      const labelX = centerX + levelRadius * Math.cos(-Math.PI / 2) + 5
      const labelY = centerY + levelRadius * Math.sin(-Math.PI / 2)
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = 'rgba(138, 120, 191, 0.6)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(level.toString(), labelX, labelY)
    })
    
    // 绘制轴线
    labels.forEach((_, i) => {
      const angle = i * angleStep - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + maxRadius * Math.cos(angle),
        centerY + maxRadius * Math.sin(angle)
      )
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1
      ctx.stroke()
    })
    
    // 绘制数据区域（带渐变效果）
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius)
    gradient.addColorStop(0, 'rgba(138, 120, 191, 0.4)')
    gradient.addColorStop(1, 'rgba(138, 120, 191, 0.15)')
    
    ctx.beginPath()
    values.forEach((value, i) => {
      const angle = i * angleStep - Math.PI / 2
      const radius = (value / 100) * maxRadius
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 2
    ctx.stroke()
    
    // 绘制数据点和分数
    values.forEach((value, i) => {
      const angle = i * angleStep - Math.PI / 2
      const radius = (value / 100) * maxRadius
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      
      // 数据点阴影
      ctx.shadowColor = 'rgba(138, 120, 191, 0.5)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2
      
      // 数据点
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fillStyle = strokeColor
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    })
    
    // 绘制维度标签
    labels.forEach((label, i) => {
      const angle = i * angleStep - Math.PI / 2
      const labelRadius = maxRadius + 28
      const x = centerX + labelRadius * Math.cos(angle)
      const y = centerY + labelRadius * Math.sin(angle)
      
      // 标签背景
      const labelWidth = ctx.measureText(label).width + 12
      const labelHeight = 20
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.beginPath()
      ctx.roundRect(x - labelWidth / 2, y - labelHeight / 2, labelWidth, labelHeight, 4)
      ctx.shadowColor = 'rgba(138, 120, 191, 0.2)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2
      ctx.fill()
      ctx.shadowColor = 'transparent'
      
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillStyle = labelColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x, y)
    })
    
    // 绘制中心标题
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = '#8A78BF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('能力雷达图', centerX, centerY)
  }
  
  // Toast提示
  function showToast(message: string) {
    const existing = document.querySelector('.toast-message')
    if (existing) existing.remove()
    
    const toast = document.createElement('div')
    toast.className = 'toast-message'
    toast.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(60, 80, 100, 0.9);
      color: white;
      padding: 0.6rem 1.2rem;
      border-radius: 20px;
      font-size: 0.8rem;
      z-index: 9999;
      animation: fadeInUp 0.3s ease;
    `
    toast.textContent = message
    document.body.appendChild(toast)
    
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transition = 'opacity 0.3s'
      setTimeout(() => toast.remove(), 300)
    }, 2500)
  }
  
  // 监听画像数据更新事件（使用已定义的 updateProfileCard）
  window.addEventListener('profileUpdate', (event: Event) => {
    const profile = (event as CustomEvent).detail
    updateProfileCard(profile)
  })
  
  // 页面加载时初始化检查：读取 localStorage 并更新卡片
  function initProfileCard() {
    try {
      const storedProfile = localStorage.getItem('studentProfile')
      if (storedProfile) {
        const profile = JSON.parse(storedProfile)
        if (profile.resumeScore || profile.abilityAnalysis || profile.studentProfile) {
          updateProfileCard(profile)
        }
      }
    } catch (error) {
      console.error('Error initializing profile card:', error)
    }
  }
  
  // 初始化时检查 localStorage 并更新卡片
  initProfileCard()
}

document.addEventListener('DOMContentLoaded', createApp)
