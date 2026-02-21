/**
 * 智能URL解析器
 * 支持多平台视频链接格式的自动识别和转换
 */

export type Platform = 'douyin' | 'bilibili' | 'unknown';

export interface ParsedUrl {
  originalUrl: string;
  normalizedUrl: string;
  videoId: string | null;
  platform: Platform;
  type: 'video' | 'user' | 'collection' | 'unknown';
  needsAuth: boolean;
  suggestion?: string;
}

/**
 * 从各种URL格式中提取视频ID
 */
export function extractVideoId(url: string, platform: Platform): string | null {
  if (platform === 'bilibili') {
    // B站视频: https://www.bilibili.com/video/BV1VSFAz2EKS/
    const bvMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
    if (bvMatch) {
      return bvMatch[1];
    }
    // B站短链接: https://b23.tv/xxx
    const b23Match = url.match(/b23\.tv\/([a-zA-Z0-9]+)/);
    if (b23Match) {
      return b23Match[1];
    }
    return null;
  }

  // 抖音链接
  // 标准视频链接: https://www.douyin.com/video/7595594238893840886
  const videoMatch = url.match(/douyin\.com\/video\/(\d+)/);
  if (videoMatch) {
    return videoMatch[1];
  }

  // 带modal_id参数的链接（收藏夹、用户主页等）
  const modalMatch = url.match(/modal_id=(\d+)/);
  if (modalMatch) {
    return modalMatch[1];
  }

  // 短链接: https://v.douyin.com/xxx/
  const shortMatch = url.match(/v\.douyin\.com\/([A-Za-z0-9]+)/);
  if (shortMatch) {
    return null; // 短链接需要先访问才能获取真实ID
  }

  // note链接: https://www.douyin.com/note/7595594238893840886
  const noteMatch = url.match(/douyin\.com\/note\/(\d+)/);
  if (noteMatch) {
    return noteMatch[1];
  }

  return null;
}

/**
 * 检测平台
 */
export function detectPlatform(url: string): Platform {
  if (url.includes('douyin.com') || url.includes('v.douyin.com')) {
    return 'douyin';
  }
  if (url.includes('bilibili.com') || url.includes('b23.tv')) {
    return 'bilibili';
  }
  return 'unknown';
}

/**
 * 判断URL类型
 */
export function detectUrlType(url: string, platform: Platform): ParsedUrl['type'] {
  if (platform === 'bilibili') {
    if (url.includes('/video/')) {
      return 'video';
    }
    return 'unknown';
  }

  // 抖音
  if (url.includes('/video/') || url.includes('/note/')) {
    return 'video';
  }

  if (url.includes('showTab=favorite_collection') || url.includes('/collection')) {
    return 'collection';
  }

  if (url.includes('/user/') || url.includes('user/self')) {
    return 'user';
  }

  if (url.includes('v.douyin.com')) {
    return 'video'; // 短链接通常是视频
  }

  return 'unknown';
}

/**
 * 判断是否需要认证
 */
export function needsAuthentication(url: string, type: ParsedUrl['type'], platform: Platform): boolean {
  if (platform === 'bilibili') {
    // B站大部分视频不需要登录，部分会员视频需要
    return false;
  }

  // 抖音
  // 收藏夹需要认证
  if (type === 'collection') {
    return true;
  }

  // user/self 需要认证
  if (url.includes('user/self')) {
    return true;
  }

  // 私密视频（通常在收藏夹中）需要认证
  if (url.includes('modal_id') && !url.includes('/video/')) {
    return true;
  }

  return false;
}

/**
 * 生成解决建议
 */
export function generateSuggestion(
  type: ParsedUrl['type'],
  needsAuth: boolean,
  videoId: string | null,
  platform: Platform
): string | undefined {
  if (platform === 'bilibili') {
    if (type === 'unknown') {
      return '无法识别的B站链接格式。请使用以下格式之一：\n' +
             '- https://www.bilibili.com/video/BVxxx\n' +
             '- https://b23.tv/xxx （B站短链接）';
    }
    return undefined;
  }

  if (needsAuth) {
    if (type === 'collection') {
      return '检测到收藏夹链接。请按以下步骤操作：\n' +
             '1. 在抖音APP中找到该视频\n' +
             '2. 点击分享按钮，复制视频链接\n' +
             '3. 使用复制的链接重新运行命令\n\n' +
             '或者提供Cookie：\n' +
             'video2text extract "URL" -c "你的cookie"';
    }

    if (videoId) {
      return '检测到需要登录的视频。解决方案：\n\n' +
             '方案1（推荐）：\n' +
             '1. 在抖音APP中打开该视频\n' +
             '2. 点击分享，复制链接\n' +
             '3. 使用复制的链接重新运行\n\n' +
             '方案2：提供Cookie\n' +
             'video2text extract "https://www.douyin.com/video/' + videoId + '" -c "你的cookie"\n\n' +
             '获取Cookie的方法：\n' +
             '1. 浏览器登录抖音网页版\n' +
             '2. 按F12打开开发者工具\n' +
             '3. Network标签 → 找到任意请求 → 复制Cookie值';
    }

    return '此链接需要登录认证。请提供Cookie或使用抖音APP分享的链接。';
  }

  if (type === 'user') {
    return '检测到用户主页链接。请提供具体的视频链接，或使用视频ID：\n' +
           'video2text extract "https://www.douyin.com/video/视频ID"';
  }

  if (type === 'unknown') {
    return '无法识别的链接格式。请使用以下格式之一：\n' +
           '- https://v.douyin.com/xxx/ （抖音分享链接）\n' +
           '- https://www.douyin.com/video/视频ID\n' +
           '- https://www.bilibili.com/video/BVxxx （B站）\n' +
           '- 或直接从APP复制分享链接';
  }

  return undefined;
}

/**
 * 标准化URL
 */
export function normalizeUrl(url: string, videoId: string | null, platform: Platform): string {
  if (platform === 'bilibili') {
    // B站链接已经是标准格式，直接返回
    return url;
  }

  // 抖音：如果已经有视频ID且不是标准格式，转换为标准格式
  if (videoId && !url.includes('/video/')) {
    return `https://www.douyin.com/video/${videoId}`;
  }

  return url;
}

/**
 * 智能解析视频URL（支持多平台）
 */
export function parseVideoUrl(originalUrl: string): ParsedUrl {
  const platform = detectPlatform(originalUrl);
  const videoId = extractVideoId(originalUrl, platform);
  const type = detectUrlType(originalUrl, platform);
  const needsAuth = needsAuthentication(originalUrl, type, platform);
  const normalizedUrl = normalizeUrl(originalUrl, videoId, platform);
  const suggestion = generateSuggestion(type, needsAuth, videoId, platform);

  return {
    originalUrl,
    normalizedUrl,
    videoId,
    platform,
    type,
    needsAuth,
    suggestion
  };
}

/**
 * 智能解析抖音URL（兼容旧接口）
 * @deprecated 请使用 parseVideoUrl
 */
export function parseDouyinUrl(originalUrl: string): ParsedUrl {
  return parseVideoUrl(originalUrl);
}

/**
 * 验证URL并提供建议
 */
export function validateAndSuggest(url: string): {
  valid: boolean;
  parsedUrl: ParsedUrl;
  error?: string;
  solution?: string;
} {
  const parsedUrl = parseVideoUrl(url);

  // 检查是否是支持的平台
  if (parsedUrl.platform === 'unknown') {
    return {
      valid: false,
      parsedUrl,
      error: '不支持的平台',
      solution: '目前支持以下平台：\n' +
                '- 抖音：https://v.douyin.com/xxx/ 或 https://www.douyin.com/video/xxx\n' +
                '- B站：https://www.bilibili.com/video/BVxxx 或 https://b23.tv/xxx'
    };
  }

  // 检查是否需要认证但未提供Cookie
  if (parsedUrl.needsAuth) {
    return {
      valid: false,
      parsedUrl,
      error: '此链接需要登录认证',
      solution: parsedUrl.suggestion
    };
  }

  // 检查链接类型
  if (parsedUrl.type === 'unknown') {
    return {
      valid: false,
      parsedUrl,
      error: '无法识别的链接格式',
      solution: parsedUrl.suggestion
    };
  }

  // 检查是否是用户主页或收藏夹（不支持批量下载）
  if (parsedUrl.type === 'user' || parsedUrl.type === 'collection') {
    return {
      valid: false,
      parsedUrl,
      error: parsedUrl.type === 'collection' ? '不支持直接下载收藏夹' : '不支持直接下载用户主页',
      solution: parsedUrl.suggestion
    };
  }

  return {
    valid: true,
    parsedUrl
  };
}
