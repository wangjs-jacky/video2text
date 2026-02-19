import ffmpeg from 'fluent-ffmpeg';
import { join, basename } from 'path';
import { existsSync } from 'fs';

export interface ExtractAudioOptions {
  videoPath: string;
  outputDir: string;
}

export interface ExtractAudioResult {
  audioPath: string;
}

export async function extractAudio(options: ExtractAudioOptions): Promise<ExtractAudioResult> {
  const { videoPath, outputDir } = options;

  // 音频输出路径（wav 格式，whisper.cpp 兼容性好）
  const videoBasename = basename(videoPath, '.mp4');
  const audioPath = join(outputDir, `${videoBasename}.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .on('end', () => {
        if (existsSync(audioPath)) {
          resolve({ audioPath });
        } else {
          reject(new Error('音频文件生成失败'));
        }
      })
      .on('error', (err) => {
        reject(new Error(`音频提取失败: ${err.message}`));
      })
      .save(audioPath);
  });
}
