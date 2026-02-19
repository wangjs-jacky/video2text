# Video2Text 设计文档

## 概述

一个从抖音视频提取文案的工具，支持 CLI 和 Web 两种使用方式。

## 技术选型

| 用途 | 方案 | 说明 |
|------|------|------|
| 运行时 | TypeScript + tsx | 类型安全，直接运行 |
| CLI 框架 | cac | 轻量级命令行框架 |
| CLI 交互 | @clack/prompts | 现代化交互提示 |
| Web 框架 | express | Node.js Web 框架 |
| 视频下载 | yt-dlp + child_process | 命令行调用 |
| 音频提取 | fluent-ffmpeg | ffmpeg 的 Node.js 封装 |
| 语音转录 | whisper.cpp Node.js bindings | 本地 C++ 推理 |

## 系统要求

用户需预先安装：
- Node.js >= 18
- yt-dlp（`pip install yt-dlp` 或 `brew install yt-dlp`）
- ffmpeg（`brew install ffmpeg`）

## 项目结构

```
jacky-video-to-text/
├── src/
│   ├── core/                    # 核心处理模块
│   │   ├── downloader.ts        # 视频下载（yt-dlp）
│   │   ├── audio-extractor.ts   # 音频提取（ffmpeg）
│   │   ├── transcriber.ts       # 语音转文字（whisper.cpp）
│   │   └── formatter.ts         # 输出格式化（txt/srt/vtt/md）
│   ├── cli/                     # CLI 入口
│   │   └── index.ts             # 命令解析和执行
│   ├── web/                     # Web 服务
│   │   ├── server.ts            # Express 服务器
│   │   ├── routes/              # API 路由
│   │   └── public/              # 静态前端页面
│   ├── types.ts                 # 类型定义
│   └── index.ts                 # 统一导出
├── bin/
│   └── video2text.ts            # CLI 可执行入口
├── package.json
├── tsconfig.json
└── README.md
```

## 核心模块设计

### 处理流程

```
视频URL → 下载视频 → 提取音频 → 语音转录 → 格式化输出
              ↓
         临时目录存储中间文件
              ↓
         处理完成后清理
```

### 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| downloader | 使用 yt-dlp 下载视频 | yt-dlp（系统安装） |
| audio-extractor | 使用 ffmpeg 提取音频 | ffmpeg（系统安装） |
| transcriber | 调用 whisper.cpp 转录 | whisper.cpp npm 包 |
| formatter | 将转录结果转为目标格式 | 无外部依赖 |

### 类型定义

```typescript
// 处理任务
interface ExtractTask {
  url: string;           // 视频链接
  outputFormat: 'txt' | 'srt' | 'vtt' | 'md';
  outputDir: string;     // 输出目录
}

// 转录结果
interface TranscribeResult {
  text: string;          // 纯文本
  segments: Segment[];   // 带时间戳的片段
  metadata: {
    duration: number;    // 音频时长（秒）
    language: string;    // 检测到的语言
  };
}

interface Segment {
  start: number;         // 开始时间（秒）
  end: number;           // 结束时间（秒）
  text: string;          // 文本内容
}
```

## CLI 设计

### 命令格式

```bash
# 单视频提取
video2text extract <视频链接> [options]

# 批量提取（从文件读取链接）
video2text extract --file links.txt [options]

# 启动 Web 服务
video2text serve [options]
```

### 选项参数

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| --format | -f | 输出格式（txt/srt/vtt/md） | txt |
| --output | -o | 输出目录 | ./output |
| --file | - | 批量处理的链接文件 | - |
| --port | -p | Web 服务端口 | 3000 |
| --keep | -k | 保留中间文件 | false |

### 使用示例

```bash
# 提取单个视频文案，输出 txt
video2text extract https://v.douyin.com/xxx

# 输出 srt 格式到指定目录
video2text extract https://v.douyin.com/xxx --format srt --output ./subs

# 批量处理
video2text extract --file links.txt --format md

# 启动 Web 服务
video2text serve --port 8080
```

## Web 服务设计

### API 接口

**POST /api/extract** - 单视频提取

```typescript
// 请求
{
  "url": "https://v.douyin.com/xxx",
  "format": "txt" | "srt" | "vtt" | "md"
}

// 响应
{
  "success": true,
  "data": {
    "text": "提取的文字内容...",
    "segments": [...],
    "downloadUrl": "/api/download/xxx.txt"
  }
}
```

**POST /api/extract/batch** - 批量提取

```typescript
// 请求
{
  "urls": ["url1", "url2", ...],
  "format": "txt"
}

// 响应
{
  "success": true,
  "taskId": "batch-xxx"
}
```

**GET /api/tasks/:taskId** - 查询批量任务进度

```typescript
// 响应
{
  "status": "processing" | "completed" | "failed",
  "total": 10,
  "completed": 5,
  "results": [...]
}
```

### Web UI

简单的单页应用：
- 输入框：粘贴视频链接（支持多行）
- 下拉框：选择输出格式
- 按钮：开始提取
- 结果区：显示进度和结果，支持下载

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 链接无效/视频不存在 | 返回明确错误信息，跳过继续 |
| 下载失败 | 重试 2 次后报错 |
| 音频提取失败 | 清理临时文件，返回错误 |
| 转录失败 | 记录日志，返回部分结果 |

## 核心流程伪代码

```typescript
async function extractText(task: ExtractTask): Promise<TranscribeResult> {
  // 1. 下载视频
  const videoPath = await downloadVideo(task.url);

  // 2. 提取音频
  const audioPath = await extractAudio(videoPath);

  // 3. 语音转录
  const result = await transcribe(audioPath);

  // 4. 格式化输出
  const output = formatResult(result, task.outputFormat);

  // 5. 清理临时文件
  await cleanup([videoPath, audioPath]);

  return output;
}
```

## 依赖检测

启动时检测必要依赖是否安装：

```typescript
async function checkDependencies() {
  // 检测 yt-dlp
  // 检测 ffmpeg
  // 检测 whisper.cpp 模型
}
```
