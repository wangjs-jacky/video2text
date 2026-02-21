import { exec, execSync } from 'child_process';
import { mkdir, readdir, access, writeFile, unlink } from 'fs/promises';
import { join, resolve as pathResolve } from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { parseVideoUrl, validateAndSuggest, type Platform } from './url-parser.js';

const execAsync = promisify(exec);

export interface DownloadOptions {
  url: string;
  outputDir: string;
  cookies?: string;
  videoId?: string;  // 视频ID，用于创建保存目录
}

export interface DownloadResult {
  videoPath: string;
  title: string;
  videoId: string;  // 返回视频ID
  saveDir: string;  // 保存目录路径
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
  let { url, outputDir, cookies, videoId: providedVideoId } = options;

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
  const platform = validation.parsedUrl.platform;

  // 获取视频ID（优先使用传入的，否则从URL解析）
  const videoId = providedVideoId || validation.parsedUrl.videoId || uuidv4();

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

  // 创建以视频ID命名的保存目录
  const saveDir = join(absoluteOutputDir, videoId);
  await mkdir(saveDir, { recursive: true });

  // 根据平台选择下载策略
  if (platform === 'bilibili') {
    // B站直接使用 yt-dlp
    return downloadWithYtDlp(url, saveDir, cookies, videoId, 'bilibili');
  }

  // 抖音：首先尝试使用 f2（对抖音支持更好）
  try {
    const result = await downloadWithF2(url, saveDir, cookies, videoId);
    return { ...result, videoId, saveDir };
  } catch (f2Error) {
    console.log('f2 下载失败，尝试使用 yt-dlp...');
    // 回退到 yt-dlp
    try {
      const result = await downloadWithYtDlp(url, saveDir, cookies, videoId, 'douyin');
      return { ...result, videoId, saveDir };
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
          '4. video2text extract "URL" -c "你的cookie"',
          true
        );
      }
      throw ytDlpError;
    }
  }
}

async function downloadWithF2(url: string, saveDir: string, cookies?: string, videoId?: string): Promise<DownloadResult> {
  // f2 会创建自己的目录结构，我们先下载到临时目录
  const tempDir = join(saveDir, '_temp_f2');
  await mkdir(tempDir, { recursive: true });

  let cmd = `f2 dy -M one -u "${url}" -p "${tempDir}"`;
  if (cookies) {
    // f2 使用 -k 参数传递 cookie 字符串
    cmd += ` -k "${cookies}"`;
  }

  try {
    await execAsync(cmd, { timeout: 120000 });

    // 递归查找下载的视频文件
    const videoPath = await findVideoFile(tempDir);

    if (videoPath) {
      // 提取标题
      const fileName = videoPath.split('/').pop() || 'video';
      const title = fileName.replace('.mp4', '').replace(/_[a-zA-Z0-9]+$/, '');

      // 清理标题中的特殊字符
      const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_');

      // 移动视频到目标目录
      const finalVideoPath = join(saveDir, `${safeTitle}.mp4`);
      await execAsync(`mv "${videoPath}" "${finalVideoPath}"`);

      // 清理临时目录
      try {
        await execAsync(`rm -rf "${tempDir}"`);
      } catch {
        // 忽略清理失败
      }

      return { videoPath: finalVideoPath, title: safeTitle, videoId: videoId || '', saveDir };
    } else {
      throw new Error('未找到下载的视频文件');
    }
  } catch (error) {
    // 清理临时目录
    try {
      await execAsync(`rm -rf "${tempDir}"`);
    } catch {
      // 忽略清理失败
    }
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

async function downloadWithYtDlp(url: string, saveDir: string, cookies?: string, videoId?: string, platform?: Platform): Promise<DownloadResult> {
  const id = videoId || uuidv4().split('-')[0];
  const tempVideoPath = join(saveDir, `temp_${id}.mp4`);

  // 如果提供了 cookie，需要保存到临时文件
  let cookieFilePath: string | undefined;
  if (cookies) {
    cookieFilePath = join(tmpdir(), `cookies_${id}.txt`);
    // 将 cookie 字符串转换为 Netscape 格式
    const cookieContent = convertToNetscapeFormat(cookies, platform);
    await writeFile(cookieFilePath, cookieContent, 'utf-8');
  }

  try {
    // 使用更灵活的格式选择器，支持分离的视频/音频流
    // B站等平台视频音频分离，需要 --merge-output-format mp4 来合并
    let cmd = `yt-dlp --no-playlist -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${tempVideoPath}" "${url}"`;
    if (cookieFilePath) {
      cmd = `yt-dlp --no-playlist -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 --cookies "${cookieFilePath}" -o "${tempVideoPath}" "${url}"`;
    }

    await execAsync(cmd, { timeout: 300000 });

    // 验证文件是否存在
    await access(tempVideoPath);

    // 获取视频标题
    let title = `video_${id}`;
    try {
      const { stdout } = await execAsync(`yt-dlp --print "%(title)s" "${url}"`);
      title = stdout.trim().replace(/[<>:"/\\|?*]/g, '_') || `video_${id}`;
    } catch {
      // 获取标题失败，使用默认值
    }

    const finalVideoPath = join(saveDir, `${title}.mp4`);

    // 重命名视频文件
    await execAsync(`mv "${tempVideoPath}" "${finalVideoPath}"`);

    return { videoPath: finalVideoPath, title, videoId: id, saveDir };
  } finally {
    // 清理 cookie 文件
    if (cookieFilePath) {
      try {
        await unlink(cookieFilePath);
      } catch {
        // 忽略删除失败
      }
    }
    // 清理临时视频文件
    try {
      await unlink(tempVideoPath);
    } catch {
      // 忽略删除失败
    }
  }
}

// 将 cookie 字符串转换为 Netscape 格式
function convertToNetscapeFormat(cookieString: string, platform?: Platform): string {
  const cookies = cookieString.split(';').map(c => c.trim());
  const lines: string[] = ['# Netscape HTTP Cookie File', '# https://curl.haxx.se/rfc/cookie_spec.html', ''];

  // 根据平台选择域名
  let domain = '.douyin.com';
  if (platform === 'bilibili') {
    domain = '.bilibili.com';
  }

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=');
    if (name && valueParts.length > 0) {
      const value = valueParts.join('=');
      lines.push(`${domain}\tTRUE\t/\tFALSE\t0\t${name.trim()}\t${value.trim()}`);
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
