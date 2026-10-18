// The one place zod is extended with `.openapi()`. Schema modules import `z` from here, so the
// extension is always applied before any schema is built.
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export { z };
