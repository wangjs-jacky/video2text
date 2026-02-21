# CLAUDE.md

## 项目概述

Video2Text - 从抖音视频提取文案的 CLI 工具。

## 核心命令

```bash
# 提取视频文案
npm run cli extract <url> [-f txt|srt|vtt|md] [-o ./output]

# 启动 Web 服务
npm run cli serve [-p 3000]
```

## 项目结构

```
src/
├── cli/index.ts        # CLI 入口 (cac + @clack/prompts)
├── core/
│   ├── downloader.ts   # 视频下载 (f2 → yt-dlp 回退)
│   ├── transcriber.ts  # 语音转录 (whisper.cpp)
│   ├── formatter.ts    # 格式转换
│   ├── extractor.ts    # 主流程编排
│   └── url-parser.ts   # URL 解析
└── web/server.ts       # Web API (Express)
```

## 技术栈

- Node.js 18+, TypeScript
- CLI: cac, @clack/prompts
- 下载: f2 (优先), yt-dlp (回退)
- 转录: whisper-node (whisper.cpp)
- 音频: ffmpeg

## 依赖要求

- ffmpeg (必需)
- yt-dlp (必需)
- f2 (可选，推荐)
- whisper model: 需下载到 `node_modules/whisper-node/lib/whisper.cpp/models/`
