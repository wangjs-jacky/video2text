# Video2Text

A professional tool for automatically extracting text content from Douyin videos, supporting both CLI and Web interfaces.

[中文文档](./README_CN.md)

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
git clone https://github.com/wangjs-jacky/video2text.git
cd video2text
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
