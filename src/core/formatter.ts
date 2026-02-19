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
