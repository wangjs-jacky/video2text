import { exec, execSync } from 'child_process';
import { mkdir, readdir, access, writeFile, unlink } from 'fs/promises';
import { join, resolve as pathResolve } from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { parseDouyinUrl, validateAndSuggest } from './url-parser.js';

const execAsync = promisify(exec);

export interface DownloadOptions {
  url: string;
  outputDir: string;
  cookies?: string;
}

export interface DownloadResult {
  videoPath: string;
  title: string;
}

export class DownloadError extends Error {
  public suggestion?: string;
  public needsAuth?: boolean;

  constructor(message: string, suggestion?: string, needsAuth?: boolean) {
    super(message);
    this.name = 'DownloadError';
    this.suggestion = suggestion;
    this.needsAuth = needsAuth;
  }
}

export async function downloadVideo(options: DownloadOptions): Promise<DownloadResult> {
  let { url, outputDir, cookies } = options;

  // 智能解析和验证URL
  const validation = validateAndSuggest(url);

  if (!validation.valid) {
    throw new DownloadError(
      validation.error || '无效的URL',
      validation.solution,
      validation.parsedUrl.needsAuth
    );
  }

  // 使用标准化后的URL
  url = validation.parsedUrl.normalizedUrl;

  // 如果需要认证但未提供Cookie，给出友好提示
  if (validation.parsedUrl.needsAuth && !cookies) {
    throw new DownloadError(
      '此视频需要登录认证',
      validation.parsedUrl.suggestion,
      true
    );
  }

  // 使用绝对路径
  const absoluteOutputDir = pathResolve(outputDir);

  // 确保输出目录存在
  await mkdir(absoluteOutputDir, { recursive: true });

  // 首先尝试使用 f2（对抖音支持更好）
  try {
    return await downloadWithF2(url, absoluteOutputDir, cookies);
  } catch (f2Error) {
    console.log('f2 下载失败，尝试使用 yt-dlp...');
    // 回退到 yt-dlp
    try {
      return await downloadWithYtDlp(url, absoluteOutputDir, cookies);
    } catch (ytDlpError) {
      // 如果是Cookie问题，给出更明确的提示
      const errorMsg = ytDlpError instanceof Error ? ytDlpError.message : String(ytDlpError);
      if (errorMsg.includes('cookies') || errorMsg.includes('Fresh cookies')) {
        throw new DownloadError(
          '需要提供Cookie才能下载此视频',
          '请使用 --cookie 参数提供抖音Cookie，或从抖音APP复制分享链接。\n' +
          '获取Cookie的方法：\n' +
          '1. 浏览器登录抖音网页版\n' +
          '2. 按F12打开开发者工具\n' +
          '3. Network标签 → 找到任意请求 → 复制Cookie值\n' +
          '4. npm run cli extract "URL" --cookie "你的cookie"',
          true
        );
      }
      throw ytDlpError;
    }
  }
}

async function downloadWithF2(url: string, outputDir: string, cookies?: string): Promise<DownloadResult> {
  // f2 会创建自己的目录结构，我们需要在完成后找到视频文件
  const f2OutputDir = join(outputDir, 'f2_download');
  await mkdir(f2OutputDir, { recursive: true });

  let cmd = `f2 dy -M one -u "${url}" -p "${f2OutputDir}"`;
  if (cookies) {
    // f2 使用 -k 参数传递 cookie 字符串
    cmd += ` -k "${cookies}"`;
  }

  try {
    await execAsync(cmd, { timeout: 120000 });

    // 递归查找下载的视频文件
    const videoPath = await findVideoFile(f2OutputDir);

    if (videoPath) {
      // videoPath 已经是完整路径，提取标题
      const fileName = videoPath.split('/').pop() || 'video';
      const title = fileName.replace('.mp4', '').replace(/_[a-zA-Z0-9]+$/, '');
      return { videoPath, title };
    } else {
      throw new Error('未找到下载的视频文件');
    }
  } catch (error) {
    throw new Error(`f2 下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

async function findVideoFile(dir: string): Promise<string | null> {
  // 使用同步命令来查找视频文件，更可靠
  try {
    const { stdout } = await execAsync(
      `find "${dir}" -name "*.mp4" -type f 2>/dev/null | head -1`
    );
    const videoPath = stdout.trim();
    if (videoPath) {
      return videoPath;
    }
    return null;
  } catch {
    return null;
  }
}

async function downloadWithYtDlp(url: string, outputDir: string, cookies?: string): Promise<DownloadResult> {
  const videoId = uuidv4();
  const videoPath = join(outputDir, `${videoId}.mp4`);

  // 如果提供了 cookie，需要保存到临时文件
  let cookieFilePath: string | undefined;
  if (cookies) {
    cookieFilePath = join(tmpdir(), `cookies_${videoId}.txt`);
    // 将 cookie 字符串转换为 Netscape 格式
    const cookieContent = convertToNetscapeFormat(cookies);
    await writeFile(cookieFilePath, cookieContent, 'utf-8');
  }

  try {
    let cmd = `yt-dlp --no-playlist -f "best[ext=mp4]/best" -o "${videoPath}" "${url}"`;
    if (cookieFilePath) {
      cmd = `yt-dlp --no-playlist -f "best[ext=mp4]/best" --cookies "${cookieFilePath}" -o "${videoPath}" "${url}"`;
    }

    await execAsync(cmd, { timeout: 300000 });

    // 验证文件是否存在
    await access(videoPath);

    return { videoPath, title: `video_${videoId.split('-')[0]}` };
  } finally {
    // 清理 cookie 文件
    if (cookieFilePath) {
      try {
        await unlink(cookieFilePath);
      } catch {
        // 忽略删除失败
      }
    }
  }
}

// 将 cookie 字符串转换为 Netscape 格式
function convertToNetscapeFormat(cookieString: string): string {
  const cookies = cookieString.split(';').map(c => c.trim());
  const lines: string[] = ['# Netscape HTTP Cookie File', '# https://curl.haxx.se/rfc/cookie_spec.html', ''];

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=');
    if (name && valueParts.length > 0) {
      const value = valueParts.join('=');
      lines.push(`.douyin.com\tTRUE\t/\tFALSE\t0\t${name.trim()}\t${value.trim()}`);
    }
  }

  return lines.join('\n');
}

// 检查 f2 是否安装
export function checkF2Installed(): boolean {
  try {
    execSync('which f2', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
