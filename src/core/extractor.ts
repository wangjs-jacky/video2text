import { unlink, writeFile, mkdir, rename } from 'fs/promises';
import { join, resolve, basename, dirname } from 'path';
import { downloadVideo, DownloadError } from './downloader.js';
import { extractAudio } from './audio-extractor.js';
import { transcribe } from './transcriber.js';
import { formatResult } from './formatter.js';
import type { ExtractTask, ExtractResult } from '../types.js';

export async function extractText(task: ExtractTask): Promise<ExtractResult> {
  // 使用绝对路径，避免工作目录变化导致的问题
  const absoluteOutputDir = resolve(task.outputDir);
  const tempDir = join(absoluteOutputDir, '.temp');

  try {
    // 确保目录存在
    await mkdir(tempDir, { recursive: true });
    await mkdir(absoluteOutputDir, { recursive: true });

    // 1. 下载视频（保存到 output/[视频ID]/ 目录）
    console.log('正在下载视频...');
    const { videoPath, title, saveDir } = await downloadVideo({
      url: task.url,
      outputDir: absoluteOutputDir,
      cookies: task.cookies,
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
      modelName: task.modelName,
    });

    // 4. 格式化输出
    const formattedOutput = formatResult(transcribeResult, task.outputFormat);

    // 5. 将文案保存到视频同目录
    const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_');
    const outputPath = join(saveDir, `${safeTitle}.${task.outputFormat}`);
    await writeFile(outputPath, formattedOutput, 'utf-8');

    // 6. 清理临时文件
    if (!task.keepTempFiles) {
      await cleanup([audioPath]);
    }

    return {
      success: true,
      result: transcribeResult,
      outputPath,
    };
  } catch (error) {
    // 如果是 DownloadError，重新抛出以便 CLI 可以显示友好的错误信息
    if (error instanceof DownloadError) {
      throw error;
    }

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
