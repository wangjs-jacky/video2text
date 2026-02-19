import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRouter } from './routes/extract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startServer(port: number = 3000) {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // 路由
  app.use('/api', createRouter());

  // 启动服务
  app.listen(port, () => {
    console.log(`服务已启动: http://localhost:${port}`);
  });
}
