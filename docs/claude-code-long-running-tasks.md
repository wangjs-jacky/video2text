# Claude Code 超长任务执行方案

> 整合自 Anthropic 官方文章及实践经验

## 一、核心问题

AI Agent 在多个上下文窗口（context window）间工作时会遇到以下挑战：

1. **会话间记忆断层**：每个新会话开始时没有之前工作的记忆
2. **一次性完成倾向**：Agent 试图在一个会话中完成所有工作，导致上下文溢出
3. **过早宣告完成**：Agent 在项目未完成时就认为任务已结束
4. **留下混乱状态**：会话结束时留下未完成的功能或 bug，影响后续工作

---

## 二、Anthropic 官方解决方案

### 2.1 双重 Agent 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     首次运行                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Initializer Agent                        │   │
│  │  • 创建 init.sh 启动脚本                             │   │
│  │  • 创建 claude-progress.txt 进度文件                 │   │
│  │  • 创建 feature_list.json 功能列表                   │   │
│  │  • 初始 git commit                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   后续每次会话                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Coding Agent                            │   │
│  │  1. 读取进度文件和 git log                           │   │
│  │  2. 选择一个未完成的功能                             │   │
│  │  3. 实现功能并测试                                   │   │
│  │  4. 提交 git commit                                  │   │
│  │  5. 更新进度文件和功能状态                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 关键组件

#### 1. Feature List（功能列表）

使用 JSON 格式记录所有功能及其状态：

```json
{
  "category": "functional",
  "description": "New chat button creates a fresh conversation",
  "steps": [
    "Navigate to main interface",
    "Click the 'New Chat' button",
    "Verify a new conversation is created",
    "Check that chat area shows welcome state",
    "Verify conversation appears in sidebar"
  ],
  "passes": false
}
```

**为什么要用 JSON 而非 Markdown？**
- 模型更不容易随意修改或覆盖 JSON 文件

#### 2. Progress File（进度文件）

`claude-progress.txt` 记录每个会话完成的工作：

```
## Session 2024-01-15 14:30
- Implemented user authentication
- Added login/logout functionality
- Created user profile page
- All tests passing

## Session 2024-01-16 09:00
- Started implementing chat feature
- Added message input component
- TODO: Complete message display
```

#### 3. init.sh 启动脚本

```bash
#!/bin/bash
# 启动开发环境的脚本
npm install
npm run dev
```

#### 4. Git Commits

每次会话结束时：
- 提交有意义的 commit message
- 确保代码处于可工作状态
- 方便后续回滚或恢复

### 2.3 Coding Agent 会话流程

每个会话开始时，Agent 执行以下步骤：

```
1. pwd                    # 确认工作目录
2. 读取进度文件            # 了解之前的工作
3. 读取 git log           # 查看最近的提交
4. 读取 feature_list.json # 选择下一个功能
5. 运行 init.sh           # 启动开发环境
6. 运行基础测试            # 确保环境正常
7. 实现一个功能            # 增量工作
8. 端到端测试              # 验证功能完整
9. git commit             # 保存进度
10. 更新进度文件           # 为下一个会话留下记录
```

---

## 三、失败模式与解决方案对照表

| 问题 | Initializer Agent 行为 | Coding Agent 行为 |
|------|------------------------|-------------------|
| Agent 过早宣告项目完成 | 创建功能列表文件，列出所有端到端功能描述 | 会话开始时读取功能列表，选择单个功能工作 |
| Agent 留下 bug 或未记录的进度 | 创建初始 git 仓库和进度文件 | 会话开始时读取进度文件和 git log，运行基础测试；会话结束时提交 git commit 和进度更新 |
| Agent 过早标记功能完成 | 创建功能列表文件 | 自我验证所有功能，只有经过仔细测试后才标记为"通过" |
| Agent 需要花时间弄清楚如何运行应用 | 编写 init.sh 脚本 | 会话开始时读取 init.sh |

---

## 四、Claude Code 内置能力

### 4.1 Task Agent 机制

Claude Code 支持启动子 Agent 处理复杂任务：

```javascript
// 后台运行
{
  "run_in_background": true
}

// 并行执行多个 Agent
Task + Task + Task

// 检查后台任务状态
TaskOutput
```

### 4.2 任务管理工具

- `TaskCreate` - 创建任务
- `TaskUpdate` - 更新任务状态
- `TaskList` - 查看所有任务
- `TaskGet` - 获取任务详情

---

## 五、外部框架集成

| 框架 | 特点 | 适用场景 |
|------|------|----------|
| **LangGraph** | 状态机驱动的 Agent 工作流，支持持久化 | 复杂状态管理 |
| **CrewAI** | 多 Agent 协作，任务分解 | 团队协作模拟 |
| **AutoGen** | Microsoft 出品，人机协作循环 | 需要人工干预的任务 |
| **Temporal** | 分布式工作流引擎 | 超长任务可靠执行 |
| **LlamaIndex** | 上下文管理，索引检索 | 大规模知识库 |

---

## 六、推荐架构

```
┌────────────────────────────────────────────────┐
│         编排层 (Orchestration Layer)            │
│  LangGraph / Temporal / Custom Scheduler        │
├────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Task 1   │  │ Task 2   │  │ Task 3   │      │
│  │ (探索)    │  │ (规划)    │  │ (执行)    │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │            │
│       └─────────────┼─────────────┘            │
│                     ▼                          │
│           ┌─────────────────┐                  │
│           │  Claude Code    │                  │
│           │  (执行引擎)      │                  │
│           └─────────────────┘                  │
├────────────────────────────────────────────────┤
│              持久化层 (Persistence)              │
│  • feature_list.json                           │
│  • claude-progress.txt                         │
│  • Git commits                                 │
│  • 任务状态文件                                 │
└────────────────────────────────────────────────┘
```

---

## 七、最佳实践总结

### 7.1 环境管理
- ✅ 使用 JSON 格式的功能列表（比 Markdown 更稳定）
- ✅ 强调"不允许删除或编辑测试"
- ✅ 每个功能都有明确的测试步骤

### 7.2 增量进度
- ✅ 每次只工作在一个功能上
- ✅ 会话结束时确保代码处于"可合并"状态
- ✅ 使用 git commit 保存里程碑
- ✅ 使用 git revert 恢复坏状态

### 7.3 测试策略
- ✅ 使用浏览器自动化工具（如 Puppeteer MCP）进行端到端测试
- ✅ 像人类用户一样测试功能
- ✅ 只有通过完整测试才标记功能为"完成"

### 7.4 会话启动检查清单
1. 确认工作目录
2. 读取进度文件
3. 读取 git log
4. 读取功能列表
5. 启动开发环境
6. 运行基础测试
7. 选择下一个功能

---

## 八、参考资料

- [Effective harnesses for long-running agents - Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Claude Agent SDK Quickstart](https://github.com/anthropics/anthropic-quickstarts/tree/main/agents-sdk)
- [Claude 4 Prompting Guide](https://docs.anthropic.com/en/docs/claud-4-prompting-guide)
