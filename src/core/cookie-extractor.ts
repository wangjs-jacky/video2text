/**
 * 自动从浏览器获取抖音 Cookie 的模块
 * 支持 Chrome 浏览器（macOS/Windows/Linux）
 */

import chrome from 'chrome-cookies-secure';

export interface CookieExtractResult {
  success: boolean;
  cookies?: string;
  error?: string;
}

/**
 * 从 Chrome 浏览器获取抖音 Cookie
 * @returns Cookie 字符串或错误信息
 */
export async function getDouyinCookiesFromChrome(): Promise<CookieExtractResult> {
  const douyinUrl = 'https://www.douyin.com';

  try {
    // 使用 Promise 包装回调
    const cookies = await new Promise<string>((resolve, reject) => {
      chrome.getCookies(douyinUrl, 'header', (err, cookies) => {
        if (err) {
          reject(err);
        } else {
          resolve(cookies as string);
        }
      });
    });

    if (!cookies || cookies.trim() === '') {
      return {
        success: false,
        error: '未找到抖音 Cookie，请确保已在 Chrome 浏览器中登录抖音',
      };
    }

    return {
      success: true,
      cookies: cookies.trim(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `获取 Cookie 失败: ${errorMessage}`,
    };
  }
}

/**
 * 检查是否能够从浏览器获取 Cookie
 * @returns 是否支持自动获取
 */
export function canAutoExtractCookies(): boolean {
  // 目前支持 macOS、Windows、Linux 上的 Chrome
  const platform = process.platform;
  return ['darwin', 'win32', 'linux'].includes(platform);
}

/**
 * 获取浏览器名称（用于提示用户）
 */
export function getBrowserName(): string {
  return 'Chrome';
}
