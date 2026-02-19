import { exec } from 'child_process';
import { promisify } from 'util';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { TranscribeResult, Segment } from '../types.js';

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface TranscribeOptions {
  audioPath: string;
  outputDir: string;
  modelName?: string;
}

// 解析时间戳格式 "00:00:02.040" 为秒数
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseFloat(parts[2]);
  return hours * 3600 + minutes * 60 + seconds;
}

// 解析 whisper.cpp 输出
function parseWhisperOutput(output: string): Segment[] {
  const segments: Segment[] = [];
  // 匹配格式: [00:00:00.000 --> 00:00:02.040]  文本内容
  const regex = /\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\]\s*(.+)/g;

  let match;
  while ((match = regex.exec(output)) !== null) {
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    const text = match[3].trim();

    segments.push({ start, end, text });
  }

  return segments;
}

export async function transcribe(options: TranscribeOptions): Promise<TranscribeResult> {
  const { audioPath, modelName = 'base' } = options;

  try {
    // 直接调用 whisper.cpp
    const whisperCppPath = resolve(
      __dirname,
      '../../node_modules/whisper-node/lib/whisper.cpp/main'
    );
    const modelPath = resolve(
      __dirname,
      '../../node_modules/whisper-node/lib/whisper.cpp/models',
      `ggml-${modelName}.bin`
    );

    const cmd = `"${whisperCppPath}" -m "${modelPath}" -f "${audioPath}" -l zh -t 4 --output-txt`;

    const { stdout, stderr } = await execAsync(cmd, { timeout: 300000 });

    // 合并 stdout 和 stderr，因为 whisper.cpp 输出到 stderr
    const fullOutput = stdout + stderr;

    // 解析输出
    const segments = parseWhisperOutput(fullOutput);

    if (segments.length === 0) {
      throw new Error('未能解析到任何文本内容');
    }

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
