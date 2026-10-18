// Replaces environment.ts in production builds (see angular.json fileReplacements).
// The real API URL is injected at build time in a later phase; '/api' is a placeholder.
export const environment = {
  production: true,
  apiUrl: '/api',
};
