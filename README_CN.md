# Video2Text - 视频文案提取工具

[![npm version](https://img.shields.io/npm/v/@wangjs-jacky/video2text.svg)](https://www.npmjs.com/package/@wangjs-jacky/video2text)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

从视频平台自动提取文字内容的专业 CLI 工具，支持多平台。

[English](./README.md)

## 支持平台

| 平台 | 状态 |
|------|------|
| 抖音 | ✅ 已支持 |
| B站 | ✅ 已支持 |
| 更多... | 🚧 开发中 |

## 功能特性

- 多平台支持（抖音、B站）
- AI 语音识别转录（Whisper）
- 多种输出格式: TXT、SRT、VTT、Markdown
- CLI 命令行和 Web API 两种使用方式
- 批量处理支持
- 本地处理，保护隐私安全

## 系统要求

- **Node.js**: 版本 >= 18.0.0
- **yt-dlp**: 视频下载工具
- **ffmpeg**: 音视频处理工具
- **f2** (可选): 专门针对抖音优化的下载工具

## 安装

### 快速安装（推荐）

```bash
# 通过 npm 全局安装
npm install -g @wangjs-jacky/video2text

# 下载 Whisper 模型（首次使用必须执行）
npx whisper-node-download
```

或手动下载模型：

```bash
cd $(npm root -g)/@wangjs-jacky/video2text/node_modules/whisper-node/lib/whisper.cpp/models
bash download-ggml-model.sh base
```

### 安装系统依赖

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

### 从源码安装

```bash
git clone https://github.com/wangjs-jacky/video2text.git
cd video2text
npm install
npm link

# 下载 Whisper 模型
cd node_modules/whisper-node/lib/whisper.cpp/models
bash download-ggml-model.sh base
cd -
```

## 使用方法

### CLI 命令行

```bash
# 基本用法（抖音）
video2text extract https://v.douyin.com/xxx/

# B站视频
video2text extract https://www.bilibili.com/video/BVxxx/

# 指定格式和输出目录
video2text extract https://v.douyin.com/xxx/ -f srt -o ./subs

# 批量处理
video2text extract --file links.txt

# 启动 Web 服务
video2text serve --port 3000
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
| `-f, --format` | txt | 输出格式 (txt/srt/vtt/md) |
| `-o, --output` | ./output | 输出目录 |
| `-m, --model` | base | Whisper 模型 (tiny/base/small/medium/large-v3) |
| `-k, --keep` | false | 保留临时文件 |
| `-c, --cookie` | - | 登录视频所需 Cookie |
| `--file` | - | 包含视频链接的文件 |

## 技术栈

- Node.js >= 18, TypeScript
- Express (Web), CAC (CLI)
- ffmpeg, yt-dlp, f2
- whisper.cpp AI 转录

## 许可证

MIT
