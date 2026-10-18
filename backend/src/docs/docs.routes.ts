import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from './openapi.js';

/** Serves `/openapi.json` and the Swagger UI at `/docs`. */
export function createDocsRouter(): Router {
  const router = Router();
  const document = buildOpenApiDocument();

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });

  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'ESMS API docs',
      // No call-outs to the public validator service.
      swaggerOptions: { validatorUrl: null },
    }),
  );

  return router;
}
