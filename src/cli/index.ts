import { cac } from 'cac';
import * as p from '@clack/prompts';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  extractText,
  checkAllDependencies,
  printDependencyStatus,
  DownloadError,
  getDouyinCookiesFromChrome,
  canAutoExtractCookies,
  getBrowserName,
} from '../core/index.js';
import type { OutputFormat } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 package.json 获取版本号
const pkgPath = resolve(__dirname, '../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

export async function runCli() {
  const cli = cac('video2text');

  cli
    .version(pkg.version)
    .usage('[command] [options]')
    .help();

  // extract 命令
  cli
    .command('extract [url]', '从视频链接提取文案')
    .option('-f, --format <format>', '输出格式 (txt/srt/vtt/md)', { default: 'txt' })
    .option('-o, --output <dir>', '输出目录', { default: './output' })
    .option('-m, --model <model>', 'Whisper 模型 (tiny/base/small/medium/large-v3)', { default: 'base' })
    .option('--file <file>', '批量处理的链接文件')
    .option('-k, --keep', '保留临时文件', { default: false })
    .option('-c, --cookie <cookie>', '抖音 Cookie（用于需要登录的视频）')
    .option('--auto-cookie', '自动从浏览器获取 Cookie（默认开启）', { default: true })
    .option('--no-auto-cookie', '禁用自动获取 Cookie')
    .action(async (url, options) => {
      // 检测依赖
      const deps = await checkAllDependencies();
      const allInstalled = deps.every((d) => d.installed);
      printDependencyStatus(deps);

      if (!allInstalled) {
        p.log.error('请先安装缺失的依赖');
        process.exit(1);
      }

      // 获取 URL 列表
      let urls: string[] = [];
      if (options.file) {
        const content = readFileSync(options.file, 'utf-8');
        urls = content.split('\n').filter((line: string) => line.trim());
      } else if (url) {
        urls = [url];
      } else {
        const inputUrl = await p.text({
          message: '请输入视频链接',
          placeholder: 'https://v.douyin.com/xxx',
        });
        if (p.isCancel(inputUrl)) {
          p.cancel('已取消');
          process.exit(0);
        }
        urls = [inputUrl as string];
      }

      // 选择输出格式（如果未指定）
      let format = options.format as OutputFormat;
      if (!options.format) {
        const formatResult = await p.select({
          message: '选择输出格式',
          options: [
            { value: 'txt', label: '纯文本 (txt)' },
            { value: 'srt', label: '字幕文件 (srt)' },
            { value: 'vtt', label: 'WebVTT 字幕 (vtt)' },
            { value: 'md', label: 'Markdown (md)' },
          ],
        });
        if (p.isCancel(formatResult)) {
          p.cancel('已取消');
          process.exit(0);
        }
        format = formatResult as OutputFormat;
      }

      // 处理每个 URL
      const spinner = p.spinner();
      for (let i = 0; i < urls.length; i++) {
        const currentUrl = urls[i];
        spinner.start(`正在处理 (${i + 1}/${urls.length}): ${currentUrl}`);

        try {
          const result = await extractText({
            url: currentUrl,
            outputFormat: format,
            outputDir: options.output,
            keepTempFiles: options.keep,
            cookies: options.cookie,
            modelName: options.model,
          });

          if (result.success) {
            spinner.stop(`✓ 完成: ${result.outputPath}`);
          } else {
            spinner.stop(`✗ 失败: ${result.error}`);
          }
        } catch (error) {
          // 处理 DownloadError，提供友好的错误信息和建议
          if (error instanceof DownloadError) {
            spinner.stop(`✗ 错误: ${error.message}`);

            if (error.suggestion) {
              p.log.info('\n' + '='.repeat(60));
              p.log.info('💡 解决方案：');
              p.log.info(error.suggestion);
              p.log.info('='.repeat(60) + '\n');
            }

            // 如果需要认证，自动从浏览器获取 Cookie
            if (error.needsAuth && !options.cookie) {
              // 检查是否支持自动获取
              if (canAutoExtractCookies()) {
                // 如果开启了自动获取，直接获取
                if (options.autoCookie) {
                  spinner.start('正在从浏览器获取 Cookie...');
                  const cookieResult = await getDouyinCookiesFromChrome();

                  if (cookieResult.success && cookieResult.cookies) {
                    spinner.stop('✓ Cookie 获取成功');

                    // 使用获取到的 Cookie 重试
                    spinner.start('正在使用 Cookie 重试...');
                    const retryResult = await extractText({
                      url: currentUrl,
                      outputFormat: format,
                      outputDir: options.output,
                      keepTempFiles: options.keep,
                      cookies: cookieResult.cookies,
                      modelName: options.model,
                    });

                    if (retryResult.success) {
                      spinner.stop(`✓ 完成: ${retryResult.outputPath}`);
                    } else {
                      spinner.stop(`✗ 重试失败: ${retryResult.error}`);
                    }
                  } else {
                    spinner.stop(`✗ ${cookieResult.error}`);
                    p.log.info('请确保已在 Chrome 浏览器中登录抖音网页版 (douyin.com)');
                  }
                } else {
                  // 未开启自动获取，询问用户
                  const shouldAutoGet = await p.confirm({
                    message: `是否自动从 ${getBrowserName()} 浏览器获取 Cookie？`,
                    initialValue: true
                  });

                  if (shouldAutoGet && !p.isCancel(shouldAutoGet)) {
                    spinner.start('正在从浏览器获取 Cookie...');
                    const cookieResult = await getDouyinCookiesFromChrome();

                    if (cookieResult.success && cookieResult.cookies) {
                      spinner.stop('✓ Cookie 获取成功');

                      // 使用获取到的 Cookie 重试
                      spinner.start('正在使用 Cookie 重试...');
                      const retryResult = await extractText({
                        url: currentUrl,
                        outputFormat: format,
                        outputDir: options.output,
                        keepTempFiles: options.keep,
                        cookies: cookieResult.cookies,
                        modelName: options.model,
                      });

                      if (retryResult.success) {
                        spinner.stop(`✓ 完成: ${retryResult.outputPath}`);
                      } else {
                        spinner.stop(`✗ 重试失败: ${retryResult.error}`);
                      }
                    } else {
                      spinner.stop(`✗ ${cookieResult.error}`);
                      p.log.info('请确保已在 Chrome 浏览器中登录抖音网页版 (douyin.com)');
                    }
                  }
                }
              } else {
                // 不支持自动获取，提示手动输入
                const shouldProvideCookie = await p.confirm({
                  message: '是否现在提供Cookie？',
                  initialValue: false
                });

                if (shouldProvideCookie && !p.isCancel(shouldProvideCookie)) {
                  const cookieInput = await p.text({
                    message: '请粘贴Cookie内容',
                    placeholder: '粘贴从浏览器复制的Cookie...'
                  });

                  if (cookieInput && !p.isCancel(cookieInput)) {
                    // 使用提供的Cookie重试
                    spinner.start('正在使用Cookie重试...');
                    const retryResult = await extractText({
                      url: currentUrl,
                      outputFormat: format,
                      outputDir: options.output,
                      keepTempFiles: options.keep,
                      cookies: cookieInput as string,
                      modelName: options.model,
                    });

                    if (retryResult.success) {
                      spinner.stop(`✓ 完成: ${retryResult.outputPath}`);
                    } else {
                      spinner.stop(`✗ 重试失败: ${retryResult.error}`);
                    }
                  }
                }
              }
            }
          } else {
            // 其他错误
            const errorMsg = error instanceof Error ? error.message : String(error);
            spinner.stop(`✗ 失败: ${errorMsg}`);
          }
        }
      }

      p.log.success(`处理完成！共 ${urls.length} 个视频`);
    });

  // serve 命令
  cli
    .command('serve', '启动 Web 服务')
    .option('-p, --port <port>', '服务端口', { default: 3000 })
    .action(async (options) => {
      const { startServer } = await import('../web/server.js');
      startServer(options.port);
    });

  cli.parse();
}
