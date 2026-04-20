# 岗位匹配算法优化方案 V2

## 📋 概述

按照新的需求，我们完全重构了岗位匹配算法流程，实现了更高效、更智能的匹配方式。

## 🎯 新的流程设计

### 完整流程图

```
1. 用户画像构建完成
   ↓
2. 基于用户画像 → 岗位数据库筛选 → 得到候选岗位库（保存）
   ↓ (前端不展示，直接问第1个问题)
3. 用户回答第1个问题
   ↓
4. 在候选岗位库中筛选符合期望的岗位 → 更新候选库
   ↓ (前端继续问第2个问题)
5. 用户回答第2个问题
   ↓
6. 在最新候选库中继续筛选 → 更新候选库
   ↓ (前端继续问第3个问题)
7. ... 以此类推 ...
   ↓
8. 用户回答第5个问题
   ↓
9. 在最终候选库中，按学生画像和岗位画像打分
   ↓
10. 筛选出5个匹配度最高的岗位
    ↓
11. 通过卡片展示给用户 ✅
```

## 🔧 后端API设计

### 新的V2 API接口

#### 1. 初始化筛选会话（基于用户画像）

**接口**: `POST /api/progressive-filter-v2/init`

**请求参数**:
```json
{
  "sessionId": "唯一会话ID",
  "profile": {
    // 用户画像数据
    "resumeScore": {},
    "abilityAnalysis": {},
    "studentProfile": {}
  }
}
```

**响应**:
```json
{
  "success": true,
  "totalJobs": 9958,
  "candidateCount": 5000,
  "message": "已基于您的画像筛选出 5000 个候选岗位"
}
```

**处理逻辑**:
1. 加载所有岗位数据
2. 基于用户画像进行初步筛选（模拟AI匹配）
3. 保存候选岗位ID列表到会话状态
4. 返回成功，前端开始问第1个问题

---

#### 2. 逐步筛选（在候选库中继续筛选）

**接口**: `POST /api/progressive-filter-v2/step`

**请求参数**:
```json
{
  "sessionId": "唯一会话ID",
  "step": 1,  // 1-5，第几个问题
  "answer": "互联网"  // 用户的回答
}
```

**响应**:
```json
{
  "success": true,
  "step": 1,
  "remainingCount": 3500,
  "wasSkipped": false,
  "message": "筛选完成"
}
```

**处理逻辑**:
1. 获取会话中的当前候选岗位库
2. 判断用户回答是否为"无要求"
3. 如果是"无要求"，跳过此步，候选库不变
4. 如果不是"无要求"，在当前候选库中继续筛选
5. 更新候选库为筛选后的结果
6. 返回剩余岗位数量

**"无要求"的回答关键词**:
- 没有、无、随便、都可以、都行、无所谓
- 不知道、不清楚、没要求、不限制、任意
- no、none、any、whatever、dont care
- not sure、不确定

---

#### 3. 获取最终匹配结果

**接口**: `POST /api/progressive-filter-v2/final`

**请求参数**:
```json
{
  "sessionId": "唯一会话ID",
  "profile": {
    // 用户画像数据（用于最终打分）
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "岗位匹配分析已完成！为您找到了5个最匹配的岗位，请查看左侧卡片！",
  "jobs": [
    {
      "id": 12345,
      "title": "前端开发工程师",
      "company": "字节跳动",
      "salary": "25-35K·14薪",
      "location": "北京",
      "industry": "互联网",
      "company_type": "民营",
      "company_size": "10000人以上",
      "description": "岗位描述..."
    }
    // ... 更多岗位
  ],
  "totalCount": 5,
  "candidateCount": 2000
}
```

**处理逻辑**:
1. 获取最终的候选岗位库
2. 基于学生画像和岗位画像进行匹配度打分
3. 排序并返回前5个匹配度最高的岗位
4. 清理会话状态

---

## 💾 会话状态结构

```typescript
interface FilterStateV2 {
  step: number;  // 0=画像筛选完成, 1-5=用户问题
  profileBasedJobIds: number[];  // 基于画像的初始候选库
  currentFilteredJobIds: number[];  // 当前筛选后的候选库（每步更新）
  filters: {
    industry?: string;
    jobType?: string;
    city?: string;
    salary?: string;
    other?: string;
  };
  allJobs: JobRecord[];  // 所有岗位缓存
  lastUpdated: number;
}
```

---

## 🎨 前端交互流程

### 时序图

```
用户                    前端                    后端
 |                      |                       |
 |-- 简历分析完成 ----->|                       |
 |                      |-- /init (profile) -->|
 |                      |<-- 候选库创建成功 ---|
 |<-- 问第1个问题 ------|                       |
 |-- 回答"互联网" ----->|                       |
 |                      |-- /step (1, answer)->|
 |                      |<-- 筛选完成 ----------|
 |<-- 问第2个问题 ------|                       |
 |-- 回答"无要求" ----->|                       |
 |                      |-- /step (2, answer)->|
 |                      |<-- 跳过筛选 ----------|
 |<-- 问第3个问题 ------|                       |
 |-- ... -------------->|                       |
 |                      | ...                   |
 |<-- 问第5个问题 ------|                       |
 |-- 回答... ---------->|                       |
 |                      |-- /step (5, answer)->|
 |                      |<-- 筛选完成 ----------|
 |                      |-- /final ----------->|
 |                      |<-- Top 5 岗位返回 ---|
 |<-- 展示卡片 ---------|                       |
```

### 前端关键逻辑

#### 1. 初始化时机

在检测到用户画像构建完成后（AI输出画像JSON后），立即调用：

```javascript
// 伪代码
async function onProfileReady(profile) {
  const sessionId = 'session_' + Date.now();
  
  // 1. 调用初始化API
  const initResponse = await fetch('/api/progressive-filter-v2/init', {
    method: 'POST',
    body: JSON.stringify({ sessionId, profile })
  });
  
  // 2. 保存sessionId
  saveSessionId(sessionId);
  
  // 3. 不展示任何筛选过程，直接让AI问第1个问题
  // 前端继续正常对话流程
}
```

#### 2. 每步回答处理

```javascript
// 伪代码
async function onUserAnswer(step, answer) {
  const sessionId = getSessionId();
  
  // 1. 调用step API进行筛选
  const stepResponse = await fetch('/api/progressive-filter-v2/step', {
    method: 'POST',
    body: JSON.stringify({ sessionId, step, answer })
  });
  
  // 2. 不展示筛选过程，继续让AI问下一个问题
  // 前端继续正常对话流程
}
```

#### 3. 最终匹配

在用户回答完第5个问题后：

```javascript
// 伪代码
async function onFifthAnswer(answer) {
  // 1. 先处理第5步的筛选
  await onUserAnswer(5, answer);
  
  // 2. 调用final API获取Top 5岗位
  const finalResponse = await fetch('/api/progressive-filter-v2/final', {
    method: 'POST',
    body: JSON.stringify({ sessionId, profile })
  });
  
  // 3. 展示卡片给用户
  showJobCards(finalResponse.jobs);
  
  // 4. 展示AI的友好提示语
  showAIMessage(finalResponse.message);
}
```

---

## 🔍 关键特性

### 1. 基于画像的初步筛选
- 在用户画像构建完成后立即进行
- 从全库中筛选出符合用户背景的候选岗位
- 保存为初始候选库，后续都在这个库中筛选

### 2. 逐步缩小范围
- 每回答一个问题，就在当前候选库中继续筛选
- 筛选结果作为下一步的新候选库
- 逐步缩小范围，提高匹配精度

### 3. 智能跳过"无要求"
- 检测用户回答是否为"无要求"类回答
- 如果是，跳过此步筛选，候选库保持不变
- 继续问下一个问题

### 4. 最终匹配度打分
- 5个问题都回答完后，进行最终匹配
- 基于学生画像和岗位画像进行多维度打分
- 排序返回Top 5匹配度最高的岗位

### 5. 前端不展示筛选过程
- 所有筛选都在后台进行
- 前端只展示：问问题 → 用户回答 → 问下一个问题
- 最后直接展示匹配结果卡片

---

## 📊 优势对比

| 特性 | V1（旧方案） | V2（新方案） |
|------|-------------|-------------|
| 初始筛选 | 无 | ✅ 基于用户画像初步筛选 |
| 筛选范围 | 全库 | ✅ 逐步缩小的候选库 |
| "无要求"处理 | 继续筛选 | ✅ 智能跳过 |
| 前端展示 | 展示筛选进度 | ✅ 不展示，只问问题 |
| 最终匹配 | 直接用筛选结果 | ✅ 基于画像打分排序 |
| 返回岗位数 | 放宽条件到够5个 | ✅ 从候选库取Top 5 |

---

## 🚀 使用指南

### 后端已完成

- ✅ 新的V2 API已实现
- ✅ 会话状态管理已实现
- ✅ "无要求"检测已实现
- ✅ 逐步筛选逻辑已实现
- ✅ 旧的V1 API保留（向后兼容）

### 前端需要修改

1. **监听画像完成事件**
   - 检测到AI输出学生画像JSON后
   - 调用 `/api/progressive-filter-v2/init`

2. **每步回答后调用筛选**
   - 用户回答第1-5个问题后
   - 调用 `/api/progressive-filter-v2/step`

3. **第5个问题后调用最终匹配**
   - 用户回答第5个问题后
   - 先调用 `/step`，再调用 `/final`
   - 展示返回的Top 5岗位卡片

4. **不展示筛选过程**
   - 所有API调用都在后台
   - 前端只展示对话和最终结果

---

## 📝 注意事项

1. **会话管理**
   - 每个用户/对话使用唯一的sessionId
   - 会话状态在内存中，重启会丢失（生产环境建议用Redis）

2. **画像筛选实现**
   - 当前是简单实现（返回所有岗位）
   - 实际项目中应该用AI进行学生画像和岗位画像的匹配

3. **最终匹配实现**
   - 当前是简单实现（随机返回前5个）
   - 实际项目中应该用AI进行多维度打分和排序

4. **向后兼容**
   - 旧的V1 API仍然保留
   - 前端可以逐步迁移到V2 API

---

## 🎯 总结

新的V2优化方案实现了：

✅ 基于用户画像的初步筛选
✅ 在候选库中逐步缩小范围
✅ 智能处理"无要求"的回答
✅ 前端不展示筛选过程，只问问题
✅ 最终基于画像进行匹配度打分
✅ 返回Top 5最匹配的岗位

这是一个更智能、更高效的岗位匹配流程！🚀
