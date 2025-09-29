/**
 * Test setup file for React Native Google Sign-In Modern
 * This file configures the testing environment and global utilities
 */

// Import React Native Testing Library for custom matchers (built-in since v12.4+)
import 'react-native';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(), // Do not globally mock console.error; mock only in specific tests if needed
};

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeGoogleSignInResult(): R;
      toBeGoogleSignInTokens(): R;
      toBeGoogleSignInUser(): R;
    }
  }
}

// Custom Jest matchers for Google Sign-In specific assertions
expect.extend({
  /**
   * Matcher to verify Google Sign-In result structure
   */
  toBeGoogleSignInResult(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      typeof received.idToken === 'string' &&
      received.idToken.length > 0 &&
      typeof received.user === 'object' &&
      received.user !== null &&
      typeof received.user.id === 'string' &&
      typeof received.user.email === 'string' &&
      (received.user.name === null || typeof received.user.name === 'string') &&
      (received.user.photo === null || typeof received.user.photo === 'string') &&
      (received.nonce === null || received.nonce === undefined || typeof received.nonce === 'string');

    return {
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a valid GoogleSignInResult`
          : `expected ${JSON.stringify(received)} to be a valid GoogleSignInResult with { idToken: string, user: { id: string, email: string, name: string | null, photo: string | null }, nonce?: string | null }`,
      pass,
    };
  },

  /**
   * Matcher to verify Google Sign-In tokens structure
   */
  toBeGoogleSignInTokens(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      typeof received.idToken === 'string' &&
      received.idToken.length > 0 &&
      typeof received.accessToken === 'string' &&
      received.accessToken.length > 0;

    return {
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be valid GoogleSignInTokens`
          : `expected ${JSON.stringify(received)} to be valid GoogleSignInTokens with { idToken: string, accessToken: string }`,
      pass,
    };
  },

  /**
   * Matcher to verify Google Sign-In user structure
   */
  toBeGoogleSignInUser(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      typeof received.id === 'string' &&
      received.id.length > 0 &&
      typeof received.email === 'string' &&
      received.email.length > 0 &&
      (received.name === null || typeof received.name === 'string') &&
      (received.photo === null || typeof received.photo === 'string');

    return {
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a valid GoogleSignInUser`
          : `expected ${JSON.stringify(received)} to be a valid GoogleSignInUser with { id: string, email: string, name: string | null, photo: string | null }`,
      pass,
    };
  },
});

// Global test timeout (can be overridden per test)
jest.setTimeout(10000);

// Mock warnings that are expected in test environment
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress specific React Native warnings that are common in test environment
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('TurboModuleRegistry.getEnforcing'))
  ) {
    return;
  }
  originalWarn(...args);
};
