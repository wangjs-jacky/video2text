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

## 函数调用流程

### 主流程

```
npm run cli extract "URL"
         │
         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  CLI 层 [src/cli/index.ts]                                                 │
├────────────────────────────────────────────────────────────────────────────┤
│  runCli()                                                                  │
│    ├── cac.version()                    # 设置版本                         │
│    ├── cac.command('extract')           # 注册 extract 命令                │
│    ├── checkAllDependencies()           # 检查 yt-dlp, ffmpeg, whisper     │
│    ├── printDependencyStatus()          # 打印依赖状态                     │
│    │                                                                       │
│    └── extractText({...})               # 调用核心提取函数                 │
└────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  核心提取层 [src/core/extractor.ts]                                        │
├────────────────────────────────────────────────────────────────────────────┤
│  extractText(task)                                                         │
│    │                                                                       │
│    ├── mkdir()                           # 创建输出目录                     │
│    │                                                                       │
│    ├── [Step 1] downloadVideo()          # 下载视频                        │
│    │       │                                                               │
│    │       ▼                                                               │
│    │   ┌──────────────────────────────────────────────────────────────┐   │
│    │   │  下载器层 [src/core/downloader.ts]                           │   │
│    │   ├──────────────────────────────────────────────────────────────┤   │
│    │   │  downloadVideo(options)                                       │   │
│    │   │    ├── validateAndSuggest(url)    # URL 验证                  │   │
│    │   │    │   └── parseDouyinUrl()       # 解析抖音 URL              │   │
│    │   │    │       ├── extractVideoId()   # 提取视频 ID               │   │
│    │   │    │       ├── detectUrlType()    # 检测 URL 类型             │   │
│    │   │    │       └── needsAuthentication() # 判断是否需要认证       │   │
│    │   │    │                                                             │   │
│    │   │    ├── mkdir(saveDir)             # 创建保存目录               │   │
│    │   │    │                                                             │   │
│    │   │    ├── downloadWithF2()           # 尝试用 f2 下载             │   │
│    │   │    │   ├── execAsync('f2 dy...')  # 执行 f2 命令               │   │
│    │   │    │   ├── findVideoFile()        # 查找下载的文件            │   │
│    │   │    │   └── mv videoPath           # 移动到目标目录            │   │
│    │   │    │                                                             │   │
│    │   │    └── downloadWithYtDlp()        # [备用] yt-dlp 下载        │   │
│    │   │        ├── convertToNetscapeFormat() # 转换 Cookie 格式       │   │
│    │   │        └── execAsync('yt-dlp...') # 执行 yt-dlp 命令           │   │
│    │   └──────────────────────────────────────────────────────────────┘   │
│    │                                                                       │
│    ├── [Step 2] extractAudio()           # 提取音频                       │
│    │       │                                                               │
│    │       ▼                                                               │
│    │   ┌──────────────────────────────────────────────────────────────┐   │
│    │   │  音频提取层 [src/core/audio-extractor.ts]                     │   │
│    │   ├──────────────────────────────────────────────────────────────┤   │
│    │   │  extractAudio(options)                                        │   │
│    │   │    └── ffmpeg(videoPath)           # 使用 ffmpeg 提取音频     │   │
│    │   │          .audioCodec('pcm_s16le')  # 16-bit PCM               │   │
│    │   │          .audioChannels(1)         # 单声道                    │   │
│    │   │          .audioFrequency(16000)    # 16kHz 采样率              │   │
│    │   │          .format('wav')            # WAV 格式                  │   │
│    │   │          .save(audioPath)          # 保存音频文件              │   │
│    │   └──────────────────────────────────────────────────────────────┘   │
│    │                                                                       │
│    ├── [Step 3] transcribe()             # 语音转录                       │
│    │       │                                                               │
│    │       ▼                                                               │
│    │   ┌──────────────────────────────────────────────────────────────┐   │
│    │   │  转录层 [src/core/transcriber.ts]                             │   │
│    │   ├──────────────────────────────────────────────────────────────┤   │
│    │   │  transcribe(options)                                          │   │
│    │   │    ├── execAsync(whisper.cpp)      # 调用 whisper.cpp         │   │
│    │   │    │   -m modelPath                # 指定模型                  │   │
│    │   │    │   -f audioPath                # 指定音频文件              │   │
│    │   │    │   -l zh                       # 中文语言                  │   │
│    │   │    │   -t 4                        # 4 线程                    │   │
│    │   │    │                                                             │   │
│    │   │    └── parseWhisperOutput()        # 解析转录结果              │   │
│    │   │        └── parseTimestamp()        # 解析时间戳                │   │
│    │   └──────────────────────────────────────────────────────────────┘   │
│    │                                                                       │
│    ├── [Step 4] formatResult()           # 格式化输出                    │
│    │       │                                                               │
│    │       ▼                                                               │
│    │   ┌──────────────────────────────────────────────────────────────┐   │
│    │   │  格式化层 [src/core/formatter.ts]                             │   │
│    │   ├──────────────────────────────────────────────────────────────┤   │
│    │   │  formatResult(result, format)                                 │   │
│    │   │    ├── formatAsTxt()              # txt 格式                   │   │
│    │   │    ├── formatAsSrt()              # srt 字幕格式               │   │
│    │   │    ├── formatAsVtt()              # vtt 字幕格式               │   │
│    │   │    └── formatAsMarkdown()         # markdown 格式              │   │
│    │   └──────────────────────────────────────────────────────────────┘   │
│    │                                                                       │
│    ├── [Step 5] writeFile()              # 保存文案文件                  │
│    │                                                                       │
│    └── [Step 6] cleanup()                # 清理临时文件                   │
│            └── unlink()                                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 自动获取 Cookie 流程

```
需要 Cookie 时
         │
         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Cookie 提取层 [src/core/cookie-extractor.ts]                              │
├────────────────────────────────────────────────────────────────────────────┤
│  getDouyinCookiesFromChrome()                                              │
│    │                                                                       │
│    └── chrome-cookies-secure.getCookies()                                  │
│            ├── 读取 Chrome SQLite 数据库                                   │
│            ├── 使用 Keychain 解密 (macOS)                                  │
│            └── 返回 'header' 格式的 Cookie 字符串                           │
└────────────────────────────────────────────────────────────────────────────┘
```

### 数据流向

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   URL   │───▶│  视频   │───▶│  音频   │───▶│  文字   │───▶│   txt   │
│ (输入)  │    │  .mp4   │    │  .wav   │    │segments │    │ (输出)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     │   downloadVideo()  extractAudio()  transcribe()  writeFile()
     │              │              │              │              │
     │         f2/yt-dlp       ffmpeg       whisper.cpp       fs
     │              │              │              │              │
     └──────────────┴──────────────┴──────────────┴──────────────┘
                              保存到 output/[视频ID]/
```

## 输出结构

```
output/
└── [视频ID]/
    ├── [标题].mp4      # 视频文件
    └── [标题].txt      # 提取的文案
```
