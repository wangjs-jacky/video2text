# Video2Text 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个从抖音视频提取文案的工具，支持 CLI 和 Web 两种使用方式。

**Architecture:** 采用单包模块化结构，核心处理逻辑（下载、提取、转录、格式化）放在 `src/core/`，CLI 和 Web 作为独立入口调用核心模块。使用 yt-dlp 下载视频，ffmpeg 提取音频，whisper.cpp 本地转录。

**Tech Stack:** TypeScript, cac, @clack/prompts, express, yt-dlp, fluent-ffmpeg, whisper.cpp

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Step 1: 初始化 npm 项目**

```bash
npm init -y
```

**Step 2: 安装开发依赖**

```bash
npm install -D typescript tsx @types/node
```

**Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: 创建 .gitignore**

```
node_modules/
dist/
output/
*.mp4
*.mp3
*.wav
.env
```

**Step 5: 更新 package.json 添加 scripts**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "cli": "tsx bin/video2text.ts"
  }
}
```

---

## Task 2: 类型定义

**Files:**
- Create: `src/types.ts`

**Step 1: 创建类型定义文件**

```typescript
// 输出格式类型
export type OutputFormat = 'txt' | 'srt' | 'vtt' | 'md';

// 处理任务
export interface ExtractTask {
  url: string;
  outputFormat: OutputFormat;
  outputDir: string;
  keepTempFiles?: boolean;
}

// 转录片段
export interface Segment {
  start: number;
  end: number;
  text: string;
}

// 转录结果
export interface TranscribeResult {
  text: string;
  segments: Segment[];
  metadata: {
    duration: number;
    language: string;
  };
}

// 提取结果
export interface ExtractResult {
  success: boolean;
  result?: TranscribeResult;
  outputPath?: string;
  error?: string;
}

// 批量任务状态
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 批量任务
export interface BatchTask {
  id: string;
  status: TaskStatus;
  total: number;
  completed: number;
  results: ExtractResult[];
}

// 依赖检测结果
export interface DependencyCheckResult {
  name: string;
  installed: boolean;
  version?: string;
  error?: string;
}
```

---

## Task 3: 依赖检测模块

**Files:**
- Create: `src/core/dependency-check.ts`

**Step 1: 创建依赖检测模块**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import type { DependencyCheckResult } from '../types.js';

const execAsync = promisify(exec);

const REQUIRED_DEPENDENCIES = [
  { name: 'yt-dlp', command: 'yt-dlp --version' },
  { name: 'ffmpeg', command: 'ffmpeg -version' },
] as const;

export async function checkDependency(name: string, command: string): Promise<DependencyCheckResult> {
  try {
    const { stdout } = await execAsync(command);
    const version = stdout.split('\n')[0].trim();
    return { name, installed: true, version };
  } catch (error) {
    return {
      name,
      installed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkAllDependencies(): Promise<DependencyCheckResult[]> {
  const results: DependencyCheckResult[] = [];

  for (const dep of REQUIRED_DEPENDENCIES) {
    const result = await checkDependency(dep.name, dep.command);
    results.push(result);
  }

  return results;
}

export function printDependencyStatus(results: DependencyCheckResult[]): void {
  console.log('\n依赖检测:');
  for (const result of results) {
    if (result.installed) {
      console.log(`  ✓ ${result.name}: ${result.version}`);
    } else {
      console.log(`  ✗ ${result.name}: 未安装`);
      console.log(`    安装方法: ${getInstallHint(result.name)}`);
    }
  }
  console.log('');
}

function getInstallHint(name: string): string {
  const hints: Record<string, string> = {
    'yt-dlp': 'brew install yt-dlp 或 pip install yt-dlp',
    'ffmpeg': 'brew install ffmpeg',
  };
  return hints[name] || '请查阅官方文档';
}
```

---

## Task 4: 视频下载模块

**Files:**
- Create: `src/core/downloader.ts`

**Step 1: 安装依赖**

```bash
npm install uuid
npm install -D @types/uuid
```

**Step 2: 创建下载模块**

```typescript
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface DownloadOptions {
  url: string;
  outputDir: string;
}

export interface DownloadResult {
  videoPath: string;
  title: string;
}

export async function downloadVideo(options: DownloadOptions): Promise<DownloadResult> {
  const { url, outputDir } = options;

  // 确保输出目录存在
  await mkdir(outputDir, { recursive: true });

  // 生成唯一文件名
  const videoId = uuidv4();
  const videoPath = join(outputDir, `${videoId}.mp4`);

  return new Promise((resolve, reject) => {
    const args = [
      '--no-playlist',
      '--no-warnings',
      '-f', 'best[ext=mp4]/best',
      '-o', videoPath,
      '--print', 'title',
      url,
    ];

    const process = spawn('yt-dlp', args);
    let title = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      title = data.toString().trim();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ videoPath, title: title || 'Untitled' });
      } else {
        reject(new Error(`下载失败: ${stderr || `退出码 ${code}`}`));
      }
    });

    process.on('error', (err) => {
      reject(new Error(`启动 yt-dlp 失败: ${err.message}`));
    });
  });
}
```

---

## Task 5: 音频提取模块

**Files:**
- Create: `src/core/audio-extractor.ts`

**Step 1: 安装依赖**

```bash
npm install fluent-ffmpeg
npm install -D @types/fluent-ffmpeg
```

**Step 2: 创建音频提取模块**

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { join } from 'path';
import { existsSync } from 'fs';

export interface ExtractAudioOptions {
  videoPath: string;
  outputDir: string;
}

export interface ExtractAudioResult {
  audioPath: string;
}

export async function extractAudio(options: ExtractAudioOptions): Promise<ExtractAudioResult> {
  const { videoPath, outputDir } = options;

  // 音频输出路径（wav 格式，whisper.cpp 兼容性好）
  const audioPath = join(outputDir, videoPath.replace('.mp4', '.wav').split('/').pop()!);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .on('end', () => {
        if (existsSync(audioPath)) {
          resolve({ audioPath });
        } else {
          reject(new Error('音频文件生成失败'));
        }
      })
      .on('error', (err) => {
        reject(new Error(`音频提取失败: ${err.message}`));
      })
      .save(audioPath);
  });
}
```

---

## Task 6: 语音转录模块

**Files:**
- Create: `src/core/transcriber.ts`

**Step 1: 安装依赖**

```bash
npm install whisper-node
```

**Step 2: 创建转录模块**

```typescript
import whisper from 'whisper-node';
import { join } from 'path';
import type { TranscribeResult, Segment } from '../types.js';

export interface TranscribeOptions {
  audioPath: string;
  outputDir: string;
  modelName?: string;
}

export async function transcribe(options: TranscribeOptions): Promise<TranscribeResult> {
  const { audioPath, modelName = 'base' } = options;

  try {
    const result = await whisper(audioPath, {
      modelName,
      extractionMethod: 'text',
    });

    // 解析结果
    const segments: Segment[] = result.map((item: any) => ({
      start: item.start,
      end: item.end,
      text: item.speech.trim(),
    }));

    // 合并纯文本
    const text = segments.map((s) => s.text).join(' ');

    return {
      text,
      segments,
      metadata: {
        duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
        language: 'zh',
      },
    };
  } catch (error) {
    throw new Error(`转录失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
```

---

## Task 7: 格式化模块

**Files:**
- Create: `src/core/formatter.ts`

**Step 1: 创建格式化模块**

```typescript
import type { OutputFormat, TranscribeResult } from '../types.js';

export function formatResult(result: TranscribeResult, format: OutputFormat): string {
  switch (format) {
    case 'txt':
      return formatAsTxt(result);
    case 'srt':
      return formatAsSrt(result);
    case 'vtt':
      return formatAsVtt(result);
    case 'md':
      return formatAsMd(result);
    default:
      return result.text;
  }
}

function formatAsTxt(result: TranscribeResult): string {
  return result.text;
}

function formatAsSrt(result: TranscribeResult): string {
  return result.segments
    .map((segment, index) => {
      const startTime = formatSrtTime(segment.start);
      const endTime = formatSrtTime(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
}

function formatAsVtt(result: TranscribeResult): string {
  const header = 'WEBVTT\n\n';
  const body = result.segments
    .map((segment) => {
      const startTime = formatVttTime(segment.start);
      const endTime = formatVttTime(segment.end);
      return `${startTime} --> ${endTime}\n${segment.text}\n`;
    })
    .join('\n');
  return header + body;
}

function formatAsMd(result: TranscribeResult): string {
  const lines = [
    `# 视频文案`,
    '',
    `> 时长: ${Math.round(result.metadata.duration)}秒`,
    `> 语言: ${result.metadata.language}`,
    '',
    '## 文案内容',
    '',
    result.text,
    '',
    '## 时间轴',
    '',
  ];

  for (const segment of result.segments) {
    const startTime = formatReadableTime(segment.start);
    lines.push(`- **${startTime}** ${segment.text}`);
  }

  return lines.join('\n');
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function formatReadableTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

---

## Task 8: 核心提取器

**Files:**
- Create: `src/core/extractor.ts`
- Create: `src/core/index.ts`

**Step 1: 创建核心提取器**

```typescript
import { unlink } from 'fs/promises';
import { join } from 'path';
import { downloadVideo } from './downloader.js';
import { extractAudio } from './audio-extractor.js';
import { transcribe } from './transcriber.js';
import { formatResult } from './formatter.js';
import type { ExtractTask, ExtractResult, TranscribeResult } from '../types.js';

export async function extractText(task: ExtractTask): Promise<ExtractResult> {
  const tempDir = join(task.outputDir, '.temp');

  try {
    // 1. 下载视频
    console.log('正在下载视频...');
    const { videoPath, title } = await downloadVideo({
      url: task.url,
      outputDir: tempDir,
    });

    // 2. 提取音频
    console.log('正在提取音频...');
    const { audioPath } = await extractAudio({
      videoPath,
      outputDir: tempDir,
    });

    // 3. 语音转录
    console.log('正在转录音频...');
    const transcribeResult = await transcribe({
      audioPath,
      outputDir: tempDir,
    });

    // 4. 格式化输出
    const formattedOutput = formatResult(transcribeResult, task.outputFormat);
    const outputPath = join(task.outputDir, `${title}.${task.outputFormat}`);

    // 5. 写入文件
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, formattedOutput, 'utf-8');

    // 6. 清理临时文件
    if (!task.keepTempFiles) {
      await cleanup([videoPath, audioPath]);
    }

    return {
      success: true,
      result: transcribeResult,
      outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

async function cleanup(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await unlink(file);
    } catch {
      // 忽略删除失败
    }
  }
}
```

**Step 2: 创建核心模块索引**

```typescript
export { downloadVideo } from './downloader.js';
export { extractAudio } from './audio-extractor.js';
export { transcribe } from './transcriber.js';
export { formatResult } from './formatter.js';
export { extractText } from './extractor.js';
export { checkAllDependencies, checkDependency, printDependencyStatus } from './dependency-check.js';
```

---

## Task 9: CLI 实现

**Files:**
- Create: `src/cli/index.ts`
- Create: `bin/video2text.ts`

**Step 1: 安装依赖**

```bash
npm install cac @clack/prompts
```

**Step 2: 创建 CLI 入口**

```typescript
import { cac } from 'cac';
import * as p from '@clack/prompts';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractText, checkAllDependencies, printDependencyStatus } from '../core/index.js';
import type { OutputFormat } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 package.json 获取版本号
const pkgPath = resolve(__dirname, '../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

export async function runCli() {
  const cli = cac('video2text');

  cli
    .version(pkg.version)
    .usage('[command] [options]')
    .help();

  // extract 命令
  cli
    .command('extract [url]', '从视频链接提取文案')
    .option('-f, --format <format>', '输出格式 (txt/srt/vtt/md)', { default: 'txt' })
    .option('-o, --output <dir>', '输出目录', { default: './output' })
    .option('--file <file>', '批量处理的链接文件')
    .option('-k, --keep', '保留临时文件', { default: false })
    .action(async (url, options) => {
      // 检测依赖
      const deps = await checkAllDependencies();
      const allInstalled = deps.every((d) => d.installed);
      printDependencyStatus(deps);

      if (!allInstalled) {
        p.log.error('请先安装缺失的依赖');
        process.exit(1);
      }

      // 获取 URL 列表
      let urls: string[] = [];
      if (options.file) {
        const content = readFileSync(options.file, 'utf-8');
        urls = content.split('\n').filter((line: string) => line.trim());
      } else if (url) {
        urls = [url];
      } else {
        url = await p.text({
          message: '请输入视频链接',
          placeholder: 'https://v.douyin.com/xxx',
        }) as string;
        if (p.isCancel(url)) {
          p.cancel('已取消');
          process.exit(0);
        }
        urls = [url];
      }

      // 选择输出格式
      let format = options.format as OutputFormat;
      if (!options.file && !options.format) {
        const formatResult = await p.select({
          message: '选择输出格式',
          options: [
            { value: 'txt', label: '纯文本 (txt)' },
            { value: 'srt', label: '字幕文件 (srt)' },
            { value: 'vtt', label: 'WebVTT 字幕 (vtt)' },
            { value: 'md', label: 'Markdown (md)' },
          ],
        }) as OutputFormat;
        if (p.isCancel(formatResult)) {
          p.cancel('已取消');
          process.exit(0);
        }
        format = formatResult;
      }

      // 处理每个 URL
      const spinner = p.spinner();
      for (let i = 0; i < urls.length; i++) {
        const currentUrl = urls[i];
        spinner.start(`正在处理 (${i + 1}/${urls.length}): ${currentUrl}`);

        const result = await extractText({
          url: currentUrl,
          outputFormat: format,
          outputDir: options.output,
          keepTempFiles: options.keep,
        });

        if (result.success) {
          spinner.stop(`✓ 完成: ${result.outputPath}`);
        } else {
          spinner.stop(`✗ 失败: ${result.error}`);
        }
      }

      p.log.success(`处理完成！共 ${urls.length} 个视频`);
    });

  // serve 命令
  cli
    .command('serve', '启动 Web 服务')
    .option('-p, --port <port>', '服务端口', { default: 3000 })
    .action(async (options) => {
      const { startServer } = await import('../web/server.js');
      startServer(options.port);
    });

  cli.parse();
}
```

**Step 3: 创建可执行入口**

```typescript
#!/usr/bin/env node
import { runCli } from '../src/cli/index.js';

runCli().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
```

**Step 4: 更新 package.json 添加 bin 字段**

```json
{
  "bin": {
    "video2text": "./bin/video2text.ts"
  }
}
```

---

## Task 10: Web 服务实现

**Files:**
- Create: `src/web/server.ts`
- Create: `src/web/routes/extract.ts`
- Create: `src/web/public/index.html`

**Step 1: 创建 Express 服务器**

```typescript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRouter } from './routes/extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startServer(port: number = 3000) {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // 路由
  app.use('/api', createRouter());

  // 启动服务
  app.listen(port, () => {
    console.log(`服务已启动: http://localhost:${port}`);
  });
}
```

**Step 2: 创建 API 路由**

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { extractText, checkAllDependencies } from '../../core/index.js';
import type { OutputFormat, BatchTask } from '../../types.js';

// 批量任务存储（简单实现，生产环境应使用数据库）
const batchTasks = new Map<string, BatchTask>();

export function createRouter() {
  const router = Router();

  // 检测依赖
  router.get('/check', async (req, res) => {
    const deps = await checkAllDependencies();
    res.json({ success: true, data: deps });
  });

  // 单视频提取
  router.post('/extract', async (req, res) => {
    const { url, format = 'txt' } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: '请提供视频链接' });
      return;
    }

    const result = await extractText({
      url,
      outputFormat: format as OutputFormat,
      outputDir: './output',
    });

    res.json({ success: result.success, data: result });
  });

  // 批量提取
  router.post('/extract/batch', async (req, res) => {
    const { urls, format = 'txt' } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ success: false, error: '请提供视频链接数组' });
      return;
    }

    const taskId = uuidv4();
    const task: BatchTask = {
      id: taskId,
      status: 'processing',
      total: urls.length,
      completed: 0,
      results: [],
    };
    batchTasks.set(taskId, task);

    // 异步处理
    (async () => {
      for (const url of urls) {
        const result = await extractText({
          url,
          outputFormat: format as OutputFormat,
          outputDir: './output',
        });
        task.results.push(result);
        task.completed++;
      }
      task.status = 'completed';
    })();

    res.json({ success: true, taskId });
  });

  // 查询任务状态
  router.get('/tasks/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = batchTasks.get(taskId);

    if (!task) {
      res.status(404).json({ success: false, error: '任务不存在' });
      return;
    }

    res.json({ success: true, data: task });
  });

  return router;
}
```

**Step 3: 创建 Web UI**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video2Text - 视频文案提取</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { font-size: 24px; margin-bottom: 8px; }
    p { color: #666; margin-bottom: 24px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-weight: 500; margin-bottom: 8px; }
    textarea {
      width: 100%;
      height: 120px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      resize: vertical;
    }
    select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
    }
    button {
      width: 100%;
      padding: 14px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover { background: #0056b3; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .result {
      margin-top: 24px;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .error { color: #dc3545; }
    .progress { margin-top: 16px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Video2Text</h1>
    <p>从抖音视频链接提取文案内容</p>

    <div class="form-group">
      <label>视频链接（每行一个）</label>
      <textarea id="urls" placeholder="https://v.douyin.com/xxx&#10;https://v.douyin.com/yyy"></textarea>
    </div>

    <div class="form-group">
      <label>输出格式</label>
      <select id="format">
        <option value="txt">纯文本 (txt)</option>
        <option value="srt">字幕文件 (srt)</option>
        <option value="vtt">WebVTT 字幕 (vtt)</option>
        <option value="md">Markdown (md)</option>
      </select>
    </div>

    <button id="submit" onclick="extract()">开始提取</button>

    <div id="progress" class="progress" style="display:none;"></div>
    <div id="result" class="result" style="display:none;"></div>
  </div>

  <script>
    async function extract() {
      const urls = document.getElementById('urls').value.trim();
      const format = document.getElementById('format').value;
      const submitBtn = document.getElementById('submit');
      const progress = document.getElementById('progress');
      const result = document.getElementById('result');

      if (!urls) {
        alert('请输入视频链接');
        return;
      }

      submitBtn.disabled = true;
      progress.style.display = 'block';
      progress.textContent = '正在处理...';
      result.style.display = 'none';

      const urlList = urls.split('\n').filter(u => u.trim());

      try {
        if (urlList.length === 1) {
          // 单视频
          const res = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlList[0], format })
          });
          const data = await res.json();
          if (data.success) {
            result.textContent = data.data.result?.text || '提取完成';
          } else {
            result.innerHTML = `<span class="error">${data.data?.error || '提取失败'}</span>`;
          }
        } else {
          // 批量
          const res = await fetch('/api/extract/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlList, format })
          });
          const data = await res.json();

          // 轮询任务状态
          const taskId = data.taskId;
          let task = null;
          while (!task || task.status === 'processing') {
            await new Promise(r => setTimeout(r, 1000));
            const taskRes = await fetch(`/api/tasks/${taskId}`);
            const taskData = await taskRes.json();
            task = taskData.data;
            progress.textContent = `处理中: ${task.completed}/${task.total}`;
          }
          result.textContent = `完成！共处理 ${task.total} 个视频`;
        }
      } catch (err) {
        result.innerHTML = `<span class="error">请求失败: ${err.message}</span>`;
      }

      result.style.display = 'block';
      progress.style.display = 'none';
      submitBtn.disabled = false;
    }
  </script>
</body>
</html>
```

---

## Task 11: 统一导出和完成

**Files:**
- Create: `src/index.ts`
- Create: `README.md`

**Step 1: 创建主入口**

```typescript
export * from './types.js';
export * from './core/index.js';
```

**Step 2: 创建 README**

```markdown
# Video2Text

从抖音视频提取文案的工具，支持 CLI 和 Web 两种使用方式。

## 安装

```bash
# 克隆项目
git clone https://github.com/yourname/video2text.git
cd video2text

# 安装依赖
npm install
```

## 系统要求

- Node.js >= 18
- yt-dlp: `brew install yt-dlp` 或 `pip install yt-dlp`
- ffmpeg: `brew install ffmpeg`

## 使用方法

### CLI

```bash
# 单视频提取
npm run cli extract https://v.douyin.com/xxx

# 指定格式
npm run cli extract https://v.douyin.com/xxx --format srt

# 批量处理
npm run cli extract --file links.txt

# 启动 Web 服务
npm run cli serve --port 3000
```

### Web

```bash
npm run cli serve
# 访问 http://localhost:3000
```

## 输出格式

- `txt`: 纯文本
- `srt`: 字幕文件
- `vtt`: WebVTT 字幕
- `md`: Markdown（包含时间轴）

## API

### POST /api/extract

```json
{
  "url": "https://v.douyin.com/xxx",
  "format": "txt"
}
```

### POST /api/extract/batch

```json
{
  "urls": ["url1", "url2"],
  "format": "txt"
}
```

### GET /api/tasks/:taskId

查询批量任务进度。

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build
```

## License

MIT
```

**Step 3: 验证项目结构**

```bash
# 检查文件结构
ls -la src/
ls -la src/core/
ls -la src/cli/
ls -la src/web/
```

---

## 实施顺序总结

1. **Task 1**: 项目初始化
2. **Task 2**: 类型定义
3. **Task 3**: 依赖检测模块
4. **Task 4**: 视频下载模块
5. **Task 5**: 音频提取模块
6. **Task 6**: 语音转录模块
7. **Task 7**: 格式化模块
8. **Task 8**: 核心提取器
9. **Task 9**: CLI 实现
10. **Task 10**: Web 服务实现
11. **Task 11**: 统一导出和完成
