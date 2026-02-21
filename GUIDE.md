# Video2Text 使用指南

> 抖音视频文案提取工具 - 从视频中自动识别并提取文字内容

## 快速开始

```bash
# 1. 克隆项目并安装依赖
git clone https://github.com/wangjs-jacky/video2text.git
cd video2text
npm install

# 2. 下载 Whisper 语音识别模型
cd node_modules/whisper-node/lib/whisper.cpp/models
bash download-ggml-model.sh base
cd -

# 3. 提取视频文案
npm run cli extract https://v.douyin.com/xxx/
```

## 命令详解

### extract - 提取视频文案

```bash
video2text extract [url] [选项]
```

| 选项 | 简写 | 默认值 | 说明 |
|------|------|--------|------|
| `--format` | `-f` | txt | 输出格式 |
| `--output` | `-o` | ./output | 输出目录 |
| `--model` | `-m` | base | Whisper 模型 |
| `--file` | | | 批量处理的链接文件 |
| `--keep` | `-k` | false | 保留临时文件 |
| `--cookie` | `-c` | | 抖音 Cookie |

#### 输出格式

| 格式 | 说明 | 适用场景 |
|------|------|----------|
| `txt` | 纯文本 | 快速获取文案内容 |
| `srt` | 字幕文件 | 视频字幕制作 |
| `vtt` | WebVTT 字幕 | 网页视频字幕 |
| `md` | Markdown | 文档记录、博客发布 |

#### Whisper 模型选择

| 模型 | 大小 | 速度 | 准确度 | 推荐场景 |
|------|------|------|--------|----------|
| `tiny` | ~75MB | 最快 | 一般 | 快速预览 |
| `base` | ~142MB | 快 | 良好 | 日常使用（推荐） |
| `small` | ~466MB | 中等 | 较好 | 较高准确度需求 |
| `medium` | ~1.5GB | 较慢 | 很好 | 专业使用 |
| `large-v3` | ~2.9GB | 最慢 | 最好 | 最高准确度需求 |

#### 使用示例

```bash
# 基本使用 - 提取为纯文本
video2text extract https://v.douyin.com/xxx/

# 输出 SRT 字幕文件
video2text extract https://v.douyin.com/xxx/ -f srt

# 指定输出目录和模型
video2text extract https://v.douyin.com/xxx/ -o ./subtitles -m small

# 批量处理 - 从文件读取链接
video2text extract --file videos.txt -f md

# 处理需要登录的视频
video2text extract https://v.douyin.com/xxx/ -c "你的Cookie"
```

### serve - 启动 Web 服务

```bash
video2text serve [选项]
```

| 选项 | 简写 | 默认值 | 说明 |
|------|------|--------|------|
| `--port` | `-p` | 3000 | 服务端口 |

#### API 接口

**POST /api/extract** - 提取视频文案

```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://v.douyin.com/xxx/",
    "format": "txt",
    "model": "base"
  }'
```

响应示例：
```json
{
  "success": true,
  "outputPath": "./output/video_xxx.txt",
  "result": {
    "text": "提取的文案内容...",
    "segments": [...],
    "metadata": {
      "duration": 60,
      "language": "zh"
    }
  }
}
```

## Cookie 获取方法

部分视频需要登录才能访问，此时需要提供 Cookie：

1. 浏览器打开 [抖音网页版](https://www.douyin.com) 并登录
2. 按 `F12` 打开开发者工具
3. 切换到 `Network` 标签
4. 刷新页面，点击任意请求
5. 在 `Headers` 中找到 `Cookie` 字段并复制

```bash
# 使用 Cookie 提取
video2text extract https://v.douyin.com/xxx/ -c "你的Cookie内容"
```

## 批量处理

创建一个文本文件，每行一个视频链接：

```text
# videos.txt
https://v.douyin.com/aaa/
https://v.douyin.com/bbb/
https://v.douyin.com/ccc/
```

执行批量处理：

```bash
video2text extract --file videos.txt -f md -o ./batch_output
```

## 常见问题

### 1. 下载失败

**原因**：f2 或 yt-dlp 未安装，或视频需要登录

**解决**：
```bash
# 安装下载工具
brew install yt-dlp f2

# 如果需要登录，提供 Cookie
video2text extract URL -c "Cookie"
```

### 2. 转录不准确

**原因**：模型太小或音频质量差

**解决**：使用更大的模型
```bash
video2text extract URL -m small  # 或 medium/large-v3
```

### 3. 内存不足

**原因**：大模型需要更多内存

**解决**：使用较小的模型
```bash
video2text extract URL -m tiny  # 或 base
```

## 项目结构

```
video2text/
├── bin/
│   └── video2text.ts      # CLI 入口
├── src/
│   ├── cli/
│   │   └── index.ts       # CLI 命令定义
│   ├── core/
│   │   ├── downloader.ts  # 视频下载
│   │   ├── transcriber.ts # 语音转录
│   │   ├── formatter.ts   # 格式转换
│   │   └── extractor.ts   # 主流程
│   ├── web/
│   │   └── server.ts      # Web 服务
│   └── types.ts           # 类型定义
├── output/                # 默认输出目录
└── package.json
```

## 依赖说明

| 依赖 | 用途 | 必需 |
|------|------|------|
| Node.js >= 18 | 运行环境 | 是 |
| ffmpeg | 音频提取 | 是 |
| yt-dlp | 视频下载 | 是 |
| f2 | 抖音优化下载 | 否（推荐） |
| whisper.cpp | 语音识别 | 内置 |

## 许可证

MIT License
