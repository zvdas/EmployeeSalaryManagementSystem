import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Router } from 'express';

/**
 * Serves the built Angular app from `staticDir`: real files first, then `index.html` for
 * client-side routes (GET/HEAD outside /api without a file extension), so deep links such as
 * /insights survive a reload. Unknown /api paths and missing assets fall through to the 404 handler.
 */
export function serveSpa(staticDir: string): Router {
  const root = path.resolve(staticDir);
  const indexFile = path.join(root, 'index.html');
  if (!existsSync(indexFile)) {
    throw new Error(`STATIC_DIR has no index.html: ${root}`);
  }

  const router = express.Router();
  router.use(
    express.static(root, {
      index: false,
      // Built bundles have content hashes, so they can be cached; index.html never is.
      maxAge: '7d',
    }),
  );
  router.use((req, res, next) => {
    const isPageRequest =
      (req.method === 'GET' || req.method === 'HEAD') &&
      !req.path.startsWith('/api') &&
      path.extname(req.path) === '';
    if (!isPageRequest) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return router;
}
