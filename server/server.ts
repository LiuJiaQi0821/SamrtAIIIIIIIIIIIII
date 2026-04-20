// ABOUTME: Express server with Vite integration
// ABOUTME: Handles API routes and serves frontend in dev/prod modes

import { createServer, type Server } from 'http';
import express from 'express';
import router from './routes/index';
import chatRouter from './routes/chat';
import uploadRouter from './routes/upload';
import parseDocumentRouter from './routes/parse-document';
import validateResumeRouter from './routes/validate-resume';
import jobsRouter from './routes/jobs';
import transferPathsRouter from './routes/transfer-paths';
import jobMatchRouter from './routes/job-match';
import progressiveFilterRouter from './routes/progressive-filter';
import { setupVite } from './vite';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';
const port = parseInt(process.env.PORT || '5000', 10);
const hostname = process.env.HOSTNAME || 'localhost';
const app = express();
// 使用 http.createServer 包装 Express app，以便支持 WebSocket 等协议升级
const server = createServer(app);

async function startServer(): Promise<Server> {
  // 请求日志（仅开发环境）
  if (isDev) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${ms}ms`);
      });
      next();
    });
  }

  // 添加请求体解析 - 支持最大50MB（用于文件上传）
  app.use(express.json({ limit: '50mb', verify: (req: any, _res: any, buf: Buffer) => {
    // 确保请求体使用 UTF-8 编码
    req.rawBody = buf;
  }}));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // 设置默认字符编码为 UTF-8
  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // 注册 API 路由
  app.use(router);
  app.use(chatRouter);
  app.use(uploadRouter);
  app.use(parseDocumentRouter);
  app.use(validateResumeRouter);
  app.use(jobsRouter);
  app.use(transferPathsRouter);
  app.use(jobMatchRouter);
  app.use(progressiveFilterRouter);

  // 集成 Vite（开发模式）或静态文件服务（生产模式）
  await setupVite(app);

  // 全局错误处理
  app.use((err: Error, req: express.Request, res: express.Response) => {
    console.error('Server error:', err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = 'status' in err ? (err as any).status || 500 : 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  });

  server.once('error', err => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`\n✨ Server running at http://${hostname}:${port}`);
    console.log(`📝 Environment: ${isDev ? 'development' : 'production'}\n`);
  });

  return server;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
