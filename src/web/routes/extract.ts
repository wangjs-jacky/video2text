import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { extractText, checkAllDependencies } from '../../core/index.js';
import type { OutputFormat, BatchTask } from '../../types.js';

// 批量任务存储（简单实现，生产环境应使用数据库）
const batchTasks = new Map<string, BatchTask>();

export function createRouter() {
  const router = Router();

  // 检测依赖
  router.get('/check', async (req, res) => {
    const deps = await checkAllDependencies();
    res.json({ success: true, data: deps });
  });

  // 单视频提取
  router.post('/extract', async (req, res) => {
    const { url, format = 'txt' } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: '请提供视频链接' });
      return;
    }

    const result = await extractText({
      url,
      outputFormat: format as OutputFormat,
      outputDir: './output',
    });

    res.json({ success: result.success, data: result });
  });

  // 批量提取
  router.post('/extract/batch', async (req, res) => {
    const { urls, format = 'txt' } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ success: false, error: '请提供视频链接数组' });
      return;
    }

    const taskId = uuidv4();
    const task: BatchTask = {
      id: taskId,
      status: 'processing',
      total: urls.length,
      completed: 0,
      results: [],
    };
    batchTasks.set(taskId, task);

    // 异步处理
    (async () => {
      for (const url of urls) {
        const result = await extractText({
          url,
          outputFormat: format as OutputFormat,
          outputDir: './output',
        });
        task.results.push(result);
        task.completed++;
      }
      task.status = 'completed';
    })();

    res.json({ success: true, taskId });
  });

  // 查询任务状态
  router.get('/tasks/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = batchTasks.get(taskId);

    if (!task) {
      res.status(404).json({ success: false, error: '任务不存在' });
      return;
    }

    res.json({ success: true, data: task });
  });

  return router;
}
