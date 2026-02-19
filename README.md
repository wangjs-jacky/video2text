# Video2Text - Douyin Video Transcription Tool

[English](#english) | [中文](#chinese)

<a name="english"></a>
## English

A professional tool for automatically extracting text content from Douyin videos, supporting both CLI and Web interfaces.

## Features

- Auto-download Douyin videos
- AI-powered speech recognition transcription
- Multiple output formats: TXT, SRT, VTT, Markdown
- CLI and Web interface
- Batch processing support
- Local processing for privacy protection

## System Requirements

- **Node.js**: >= 18.0.0
- **yt-dlp**: Video download tool
- **ffmpeg**: Audio/video processing
- **f2** (optional): Optimized for Douyin downloads

## Installation

### 1. Install System Dependencies

**macOS:**
```bash
brew install yt-dlp ffmpeg
brew tap fyrfyrr/f2 && brew install f2  # optional
```

**Linux:**
```bash
pip install yt-dlp
sudo apt install ffmpeg
```

**Windows:**
```bash
choco install yt-dlp ffmpeg
```

### 2. Install Project Dependencies

```bash
cd jacky-video-to-text
npm install
```

### 3. Download Whisper Model

```bash
cd node_modules/whisper-node/lib/whisper.cpp/models
bash download-ggml-model.sh base
cd -
```

## Usage

### CLI

```bash
# Basic usage
npm run cli extract https://v.douyin.com/xxx/

# Specify format and output
npm run cli extract https://v.douyin.com/xxx/ -f srt -o ./subs

# Batch processing
npm run cli extract --file links.txt

# Start web server
npm run cli serve --port 3000
```

### API

```bash
# Extract video
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://v.douyin.com/xxx/", "format": "txt"}'
```

## Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--format` | txt | Output format (txt/srt/vtt/md) |
| `--output` | ./output | Output directory |
| `--model` | base | Whisper model (tiny/base/small/medium/large-v3) |
| `--cookie` | - | Douyin cookie for login-required videos |

## Tech Stack

- Node.js >= 18, TypeScript
- Express (Web), CAC (CLI)
- ffmpeg, yt-dlp, f2
- whisper.cpp for AI transcription

## License

MIT

---

<a name="chinese"></a>
## 中文

从抖音视频自动提取文字内容的专业工具，支持 CLI 命令行和 Web 界面两种使用方式。

## 功能特性

- 支持抖音视频链接自动下载
- 使用 AI 语音识别技术转录视频内容
- 支持多种输出格式: TXT、SRT、VTT、Markdown
- 提供 CLI 命令行和 Web 界面两种使用方式
- 支持批量处理多个视频
- 本地处理，保护隐私安全

## 系统要求

- **Node.js**: 版本 >= 18.0.0
- **yt-dlp**: 视频下载工具
- **ffmpeg**: 音视频处理工具
- **f2** (可选): 专门针对抖音优化的下载工具

## 安装

### 1. 安装系统依赖

**macOS:**
```bash
brew install yt-dlp ffmpeg
brew tap fyrfyrr/f2 && brew install f2  # 可选
```

**Linux:**
```bash
pip install yt-dlp
sudo apt install ffmpeg
```

**Windows:**
```bash
choco install yt-dlp ffmpeg
```

### 2. 安装项目依赖

```bash
cd jacky-video-to-text
npm install
```

### 3. 下载 Whisper 模型

```bash
cd node_modules/whisper-node/lib/whisper.cpp/models
bash download-ggml-model.sh base
cd -
```

## 使用方法

### CLI 命令行

```bash
# 基本用法
npm run cli extract https://v.douyin.com/xxx/

# 指定格式和输出目录
npm run cli extract https://v.douyin.com/xxx/ -f srt -o ./subs

# 批量处理
npm run cli extract --file links.txt

# 启动 Web 服务
npm run cli serve --port 3000
```

### API 接口

```bash
# 提取视频
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://v.douyin.com/xxx/", "format": "txt"}'
```

## 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--format` | txt | 输出格式 (txt/srt/vtt/md) |
| `--output` | ./output | 输出目录 |
| `--model` | base | Whisper 模型 |
| `--cookie` | - | 抖音 Cookie |

## 技术栈

- Node.js >= 18, TypeScript
- Express (Web), CAC (CLI)
- ffmpeg, yt-dlp, f2
- whisper.cpp AI 转录

## 许可证

MIT
