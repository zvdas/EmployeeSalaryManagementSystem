import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type ResponseConfig,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';
import { z } from '../lib/zod.js';
import {
  employeeExportQuerySchema,
  employeeIdParamsSchema,
  employeeInputSchema,
  employeeListQuerySchema,
  employeeListSchema,
  employeeSchema,
} from '../modules/employees/employee.schemas.js';
import {
  countryStatsSchema,
  departmentStatsSchema,
  distributionQuerySchema,
  distributionSchema,
  jobTitleStatsSchema,
  optionalCountryQuerySchema,
  requiredCountryQuerySchema,
  summarySchema,
} from '../modules/insights/insights.schemas.js';
import { metaSchema } from '../modules/meta/meta.routes.js';
import {
  seedRequestSchema,
  seedResultSchema,
  seedStatusSchema,
} from '../modules/seed/seed.schemas.js';

// The request schemas below are the same objects the `validate` middleware uses, so the
// documentation cannot drift from what the API actually accepts.

const errorSchema = z
  .object({
    error: z.object({
      code: z
        .enum(['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', 'INTERNAL_ERROR'])
        .openapi({ example: 'VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'Request validation failed' }),
      details: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional()
        .openapi({ example: [{ path: 'email', message: 'Invalid email address' }] }),
    }),
  })
  .openapi('Error');

function json(description: string, schema: ZodType): ResponseConfig {
  return { description, content: { 'application/json': { schema } } };
}

const errors = {
  400: json('Validation failed', errorSchema),
  404: json('Not found', errorSchema),
  409: json('Conflict', errorSchema),
} as const;

type Method = RouteConfig['method'];

function registerRoutes(registry: OpenAPIRegistry): void {
  const route = (method: Method, path: string, config: Omit<RouteConfig, 'method' | 'path'>) =>
    registry.registerPath({ method, path, ...config });

  route('get', '/health', {
    tags: ['System'],
    summary: 'Health check',
    responses: { 200: json('API is up', z.object({ status: z.literal('ok') })) },
  });

  route('get', '/meta', {
    tags: ['Reference data'],
    summary: 'Countries, departments, job titles and employment types',
    responses: { 200: json('Reference data', metaSchema) },
  });

  route('get', '/seed/status', {
    tags: ['Seed'],
    summary: 'How many employees the database holds',
    responses: { 200: json('Seed status', seedStatusSchema) },
  });

  route('post', '/seed', {
    tags: ['Seed'],
    summary: 'Seed an empty database with 100 or 10,000 deterministic employees',
    request: { body: { content: { 'application/json': { schema: seedRequestSchema } } } },
    responses: {
      201: json('Employees inserted', seedResultSchema),
      400: errors[400],
      409: json('The database already has employees', errorSchema),
    },
  });

  route('get', '/employees', {
    tags: ['Employees'],
    summary: 'List employees (search, filter, sort, paginate)',
    request: { query: employeeListQuerySchema },
    responses: { 200: json('A page of employees', employeeListSchema), 400: errors[400] },
  });

  route('get', '/employees/export.csv', {
    tags: ['Employees'],
    summary: 'Export the filtered employee list as CSV (no paging)',
    request: { query: employeeExportQuerySchema },
    responses: {
      200: {
        description: 'CSV attachment `employees.csv`',
        content: { 'text/csv': { schema: z.string() } },
      },
      400: errors[400],
    },
  });

  route('get', '/employees/{id}', {
    tags: ['Employees'],
    summary: 'Get one employee',
    request: { params: employeeIdParamsSchema },
    responses: { 200: json('The employee', employeeSchema), 400: errors[400], 404: errors[404] },
  });

  route('post', '/employees', {
    tags: ['Employees'],
    summary: 'Create an employee',
    request: { body: { content: { 'application/json': { schema: employeeInputSchema } } } },
    responses: {
      201: json('The created employee', employeeSchema),
      400: errors[400],
      409: errors[409],
    },
  });

  route('put', '/employees/{id}', {
    tags: ['Employees'],
    summary: 'Replace an employee',
    request: {
      params: employeeIdParamsSchema,
      body: { content: { 'application/json': { schema: employeeInputSchema } } },
    },
    responses: { 200: json('The updated employee', employeeSchema), ...errors },
  });

  route('delete', '/employees/{id}', {
    tags: ['Employees'],
    summary: 'Delete an employee',
    request: { params: employeeIdParamsSchema },
    responses: { 204: { description: 'Deleted' }, 400: errors[400], 404: errors[404] },
  });

  route('get', '/insights/summary', {
    tags: ['Insights'],
    summary: 'Organisation headcount and payroll (USD)',
    responses: { 200: json('Summary', summarySchema) },
  });

  route('get', '/insights/by-country', {
    tags: ['Insights'],
    summary: 'Salary stats per country in local currency and USD, by headcount',
    responses: { 200: json('Per-country stats', z.array(countryStatsSchema)) },
  });

  route('get', '/insights/by-job-title', {
    tags: ['Insights'],
    summary: 'Salary stats per job title within a country (local currency), by average',
    request: { query: requiredCountryQuerySchema },
    responses: {
      200: json('Per-title stats', z.array(jobTitleStatsSchema)),
      400: errors[400],
    },
  });

  route('get', '/insights/by-department', {
    tags: ['Insights'],
    summary: 'Headcount and USD payroll per department, by payroll',
    request: { query: optionalCountryQuerySchema },
    responses: {
      200: json('Per-department stats', z.array(departmentStatsSchema)),
      400: errors[400],
    },
  });

  route('get', '/insights/distribution', {
    tags: ['Insights'],
    summary: 'USD salary histogram with 1.5 × IQR outlier thresholds',
    request: { query: distributionQuerySchema },
    responses: { 200: json('Distribution', distributionSchema), 400: errors[400] },
  });
}

/** Builds the OpenAPI 3 document for every `/api` route. */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();
  registerRoutes(registry);

  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'ACME Employee Salary Management API',
      version: '1.0.0',
      description:
        'Manage employee salary records and analyse pay across countries. Salaries are stored ' +
        'in local currency; USD figures use static FX rates. Every error response uses the ' +
        '`Error` schema.',
    },
    servers: [{ url: '/api' }],
  });
}
