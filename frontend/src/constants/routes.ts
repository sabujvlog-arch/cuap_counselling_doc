/**
 * CUAP WCCMS — Route Constants
 *
 * All application routes defined in one place.
 */

export const ROUTES = {
  HOME: '/',
  RESET_PASSWORD: '/reset-password',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
