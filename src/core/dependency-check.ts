import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DependencyCheckResult } from '../types.js';

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED_DEPENDENCIES = [
  { name: 'yt-dlp', command: 'yt-dlp --version' },
  { name: 'ffmpeg', command: 'ffmpeg -version' },
] as const;

export async function checkDependency(name: string, command: string): Promise<DependencyCheckResult> {
  try {
    const { stdout } = await execAsync(command);
    const version = stdout.split('\n')[0].trim();
    return { name, installed: true, version };
  } catch (error) {
    return {
      name,
      installed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkWhisperModel(modelName: string = 'base'): Promise<DependencyCheckResult> {
  const modelPath = resolve(
    __dirname,
    '../../node_modules/whisper-node/lib/whisper.cpp/models',
    `ggml-${modelName}.bin`
  );

  try {
    await access(modelPath);
    return { name: `whisper-${modelName}`, installed: true, version: '已下载' };
  } catch {
    return {
      name: `whisper-${modelName}`,
      installed: false,
      error: '模型未下载',
    };
  }
}

export async function checkAllDependencies(modelName: string = 'base'): Promise<DependencyCheckResult[]> {
  const results: DependencyCheckResult[] = [];

  for (const dep of REQUIRED_DEPENDENCIES) {
    const result = await checkDependency(dep.name, dep.command);
    results.push(result);
  }

  // 检查 whisper 模型
  const whisperResult = await checkWhisperModel(modelName);
  results.push(whisperResult);

  return results;
}

export function printDependencyStatus(results: DependencyCheckResult[]): void {
  console.log('\n依赖检测:');
  for (const result of results) {
    if (result.installed) {
      console.log(`  ✓ ${result.name}: ${result.version}`);
    } else {
      console.log(`  ✗ ${result.name}: 未安装`);
      console.log(`    安装方法: ${getInstallHint(result.name)}`);
    }
  }
  console.log('');
}

function getInstallHint(name: string): string {
  const hints: Record<string, string> = {
    'yt-dlp': 'brew install yt-dlp 或 pip install yt-dlp',
    'ffmpeg': 'brew install ffmpeg',
    'whisper-base': '运行: cd node_modules/whisper-node/lib/whisper.cpp/models && bash download-ggml-model.sh base',
    'whisper-tiny': '运行: cd node_modules/whisper-node/lib/whisper.cpp/models && bash download-ggml-model.sh tiny',
  };

  if (name.startsWith('whisper-')) {
    const modelName = name.replace('whisper-', '');
    return `运行: cd node_modules/whisper-node/lib/whisper.cpp/models && bash download-ggml-model.sh ${modelName}`;
  }

  return hints[name] || '请查阅官方文档';
}
