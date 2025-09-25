/**
 * Test data factories for creating consistent test data
 * These factories help create realistic mock data for testing
 */

import type {
  GoogleSignInResult,
  GoogleSignInTokens,
} from '../NativeGoogleSigninModern';
import type { GoogleSignInConfig } from '../index';

// Counter for generating unique values
let counter = 0;
const getUniqueId = () => ++counter;

/**
 * Factory for creating mock Google Sign-In users
 */
export const createMockUser = (
  overrides: Partial<GoogleSignInResult['user']> = {}
): GoogleSignInResult['user'] => {
  const id = getUniqueId();
  return {
    id: `user-${id}@example.com`,
    email: `user-${id}@example.com`,
    name: `Test User ${id}`,
    photo: `https://example.com/photo-${id}.jpg`,
    ...overrides,
  };
};

/**
 * Factory for creating mock Google Sign-In results
 */
export const createMockSignInResult = (
  userOverrides: Partial<GoogleSignInResult['user']> = {},
  resultOverrides: Partial<Omit<GoogleSignInResult, 'user'>> = {}
): GoogleSignInResult => {
  const id = getUniqueId();
  return {
    idToken: `mock-id-token-${id}-${Date.now()}`,
    user: createMockUser(userOverrides),
    ...resultOverrides,
  };
};

/**
 * Factory for creating mock Google Sign-In tokens
 */
export const createMockTokens = (
  overrides: Partial<GoogleSignInTokens> = {}
): GoogleSignInTokens => {
  const id = getUniqueId();
  const timestamp = Date.now();
  return {
    idToken: `mock-id-token-${id}-${timestamp}`,
    accessToken: `mock-access-token-${id}-${timestamp}`,
    ...overrides,
  };
};

/**
 * Factory for creating mock Google Sign-In configuration
 */
export const createMockConfig = (
  overrides: Partial<GoogleSignInConfig> = {}
): GoogleSignInConfig => {
  const id = getUniqueId();
  return {
    webClientId: `mock-client-id-${id}.googleusercontent.com`,
    ...overrides,
  };
};

/**
 * Factory for creating mock errors with proper structure
 */
export const createMockError = (
  message: string,
  code?: string,
  overrides: Record<string, any> = {}
): Error => {
  const error = new Error(message) as any;
  if (code) {
    error.code = code;
  }
  Object.assign(error, overrides);
  return error;
};

/**
 * Predefined mock users for common test scenarios
 */
export const mockUsers = {
  // Basic user with all fields
  complete: createMockUser({
    id: 'complete@example.com',
    email: 'complete@example.com',
    name: 'Complete User',
    photo: 'https://example.com/complete.jpg',
  }),

  // User with minimal information
  minimal: createMockUser({
    id: 'minimal@example.com',
    email: 'minimal@example.com',
    name: null,
    photo: null,
  }),

  // User with no photo
  noPhoto: createMockUser({
    id: 'nophoto@example.com',
    email: 'nophoto@example.com',
    name: 'No Photo User',
    photo: null,
  }),

  // User with no name
  noName: createMockUser({
    id: 'noname@example.com',
    email: 'noname@example.com',
    name: null,
    photo: 'https://example.com/noname.jpg',
  }),
};

/**
 * Predefined mock configurations for common test scenarios
 */
export const mockConfigs = {
  valid: createMockConfig({
    webClientId: '123456789-abcdef.apps.googleusercontent.com',
  }),

  invalid: createMockConfig({
    webClientId: '',
  }),

  malformed: createMockConfig({
    webClientId: 'not-a-valid-client-id',
  }),
};

/**
 * Predefined mock errors for common test scenarios
 */
export const mockErrors = {
  notConfigured: createMockError(
    'Google Sign-In not configured. Call configure() first.'
  ),

  playServicesNotAvailable: createMockError(
    'Google Play Services not available',
    'PLAY_SERVICES_NOT_AVAILABLE'
  ),

  noSignedInUser: createMockError('No signed in user', 'NO_SIGNED_IN_USER'),

  signInCanceled: createMockError(
    'Sign in was canceled by user',
    'SIGN_IN_CANCELLED'
  ),

  signInFailed: createMockError('Sign in failed', 'SIGN_IN_FAILED'),

  networkError: createMockError('Network error occurred', 'NETWORK_ERROR'),

  invalidConfiguration: createMockError(
    'Invalid configuration provided',
    'INVALID_CONFIGURATION'
  ),
};

/**
 * Reset the counter for generating unique IDs (useful in beforeEach)
 */
export const resetFactoryCounters = (): void => {
  counter = 0;
};

/**
 * Helper to create multiple mock users
 */
export const createMockUsers = (
  count: number,
  baseOverrides: Partial<GoogleSignInResult['user']> = {}
): GoogleSignInResult['user'][] => {
  return Array.from({ length: count }, (_, index) =>
    createMockUser({
      ...baseOverrides,
      id: `user-${index}@example.com`,
      email: `user-${index}@example.com`,
      name: `Test User ${index}`,
    })
  );
};

/**
 * Helper to create multiple mock sign-in results
 */
export const createMockSignInResults = (
  count: number
): GoogleSignInResult[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockSignInResult({
      id: `user-${index}@example.com`,
      email: `user-${index}@example.com`,
      name: `Test User ${index}`,
    })
  );
};
