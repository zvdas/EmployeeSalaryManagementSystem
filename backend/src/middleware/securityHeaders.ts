import type { RequestHandler } from 'express';
import helmet from 'helmet';

const DOCS_PATH = '/api/docs';

const strictHeaders = helmet();

/**
 * Swagger UI renders inline SVG/data images and is often opened over plain http (localhost,
 * Render previews), so its pages get a slightly looser CSP: data/https images and no forced
 * upgrade to https. Scripts are still limited to 'self'.
 */
const docsHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      'img-src': ["'self'", 'data:', 'https:'],
      'upgrade-insecure-requests': null,
    },
  },
});

/** Helmet everywhere, with the relaxed policy applied to the docs pages only. */
export const securityHeaders: RequestHandler = (req, res, next) => {
  const isDocs = req.path === DOCS_PATH || req.path.startsWith(`${DOCS_PATH}/`);
  (isDocs ? docsHeaders : strictHeaders)(req, res, next);
};
