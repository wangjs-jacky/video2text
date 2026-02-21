# Video2Text

A professional CLI tool for automatically extracting text content from videos, supporting multiple platforms.

[中文文档](./README_CN.md)

## Supported Platforms

| Platform | Status |
|----------|--------|
| Douyin (抖音) | ✅ Supported |
| Bilibili (B站) | ✅ Supported |
| More... | 🚧 Coming soon |

## Features

- Multi-platform support (Douyin, Bilibili)
- AI-powered speech recognition transcription (Whisper)
- Multiple output formats: TXT, SRT, VTT, Markdown
- CLI and Web API interfaces
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
git clone https://github.com/wangjs-jacky/video2text.git
cd video2text
npm install
npm link  # Link video2text command globally
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
video2text extract https://v.douyin.com/xxx/

# Bilibili video
video2text extract https://www.bilibili.com/video/BVxxx/

# Specify format and output
video2text extract https://v.douyin.com/xxx/ -f srt -o ./subs

# Batch processing
video2text extract --file links.txt

# Start web server
video2text serve --port 3000
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
| `-f, --format` | txt | Output format (txt/srt/vtt/md) |
| `-o, --output` | ./output | Output directory |
| `-m, --model` | base | Whisper model (tiny/base/small/medium/large-v3) |
| `-k, --keep` | false | Keep temporary files |
| `-c, --cookie` | - | Cookie for login-required videos |
| `--file` | - | File containing video URLs |

## Tech Stack

- Node.js >= 18, TypeScript
- Express (Web), CAC (CLI)
- ffmpeg, yt-dlp, f2
- whisper.cpp for AI transcription

## License

MIT
