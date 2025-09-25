/**
 * Test utilities and helpers for Google Sign-In Modern testing
 * Common testing patterns and utilities
 */

import { mockGoogleSignIn } from './__mocks__/NativeGoogleSigninModern';
import {
  createMockSignInResult,
  createMockTokens,
  createMockConfig,
} from './factories';

/**
 * Test helper to set up a fully configured and signed-in state
 */
export const setupSignedInUser = async (userOverrides = {}) => {
  // Import here to avoid circular dependencies
  const { GoogleSignInModule } = await import('../index');

  // Reset mock state
  mockGoogleSignIn.reset();

  // Actually configure the GoogleSignIn instance
  const config = createMockConfig();
  await GoogleSignInModule.configure(config);

  // Create and set signed-in user
  const mockResult = createMockSignInResult(userOverrides);
  mockGoogleSignIn.setSignedIn(mockResult.user);

  return mockResult;
};

/**
 * Test helper to set up a configured but signed-out state
 */
export const setupConfiguredState = async () => {
  // Import here to avoid circular dependencies
  const { GoogleSignInModule } = await import('../index');

  mockGoogleSignIn.reset();

  // Actually configure the GoogleSignIn instance
  const config = createMockConfig();
  await GoogleSignInModule.configure(config);
};

/**
 * Test helper to set up an unconfigured state
 */
export const setupUnconfiguredState = () => {
  mockGoogleSignIn.reset();
  mockGoogleSignIn.setState({ isConfigured: false });
};

/**
 * Test helper to set up Play Services unavailable scenario
 */
export const setupPlayServicesUnavailable = async () => {
  // Import here to avoid circular dependencies
  const { GoogleSignInModule } = await import('../index');

  mockGoogleSignIn.reset();

  // Actually configure the GoogleSignIn instance
  const config = createMockConfig();
  await GoogleSignInModule.configure(config);

  // Set Play Services as unavailable
  mockGoogleSignIn.setState({
    isPlayServicesAvailable: false,
  });
};

/**
 * Test helper to set up error scenarios
 */
export const setupErrorScenario = async (error: Error) => {
  // Import here to avoid circular dependencies
  const { GoogleSignInModule } = await import('../index');

  mockGoogleSignIn.reset();

  // Actually configure the GoogleSignIn instance
  const config = createMockConfig();
  await GoogleSignInModule.configure(config);

  mockGoogleSignIn.setError(error);
};

/**
 * Test helper to verify mock function call counts
 */
export const expectMockCallCounts = (expectations: Record<string, number>) => {
  const { mocks } = mockGoogleSignIn;

  Object.entries(expectations).forEach(([methodName, expectedCount]) => {
    const mockFn = (mocks as any)[methodName];
    if (jest.isMockFunction(mockFn)) {
      expect(mockFn).toHaveBeenCalledTimes(expectedCount);
    } else {
      throw new Error(`${methodName} is not a mock function`);
    }
  });
};

/**
 * Test helper to verify mock function was called with specific arguments
 */
export const expectMockCalledWith = (methodName: string, ...args: any[]) => {
  const { mocks } = mockGoogleSignIn;
  const mockFn = (mocks as any)[methodName];

  if (jest.isMockFunction(mockFn)) {
    expect(mockFn).toHaveBeenCalledWith(...args);
  } else {
    throw new Error(`${methodName} is not a mock function`);
  }
};

/**
 * Test helper to create delay for async testing
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Test helper to wrap async operations that should throw
 */
export const expectToThrow = async (
  asyncFn: () => Promise<any>,
  expectedError?: string | RegExp | Error
): Promise<void> => {
  let error: Error | null = null;

  try {
    await asyncFn();
  } catch (e) {
    error = e as Error;
  }

  expect(error).not.toBeNull();

  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(error!.message).toBe(expectedError);
    } else if (expectedError instanceof RegExp) {
      expect(error!.message).toMatch(expectedError);
    } else if (expectedError instanceof Error) {
      expect(error!.message).toBe(expectedError.message);
      if ((expectedError as any).code) {
        expect((error as any).code).toBe((expectedError as any).code);
      }
    }
  }
};

/**
 * Test helper to verify error codes
 */
export const expectErrorCode = (error: any, expectedCode: string) => {
  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe(expectedCode);
};

/**
 * Test helper to create integration test scenarios
 */
export const createIntegrationTestScenario = () => {
  const config = createMockConfig();
  const signInResult = createMockSignInResult();
  const tokens = createMockTokens();

  return {
    config,
    signInResult,
    tokens,

    // Test the complete sign-in flow
    async testCompleteFlow(googleSignIn: any) {
      // Configure
      await googleSignIn.configure(config);

      // Check if configured
      expect(await googleSignIn.isSignedIn()).toBe(false);

      // Sign in
      const result = await googleSignIn.signIn();
      expect(result).toBeGoogleSignInResult();

      // Check if signed in
      expect(await googleSignIn.isSignedIn()).toBe(true);

      // Get tokens
      const fetchedTokens = await googleSignIn.getTokens();
      expect(fetchedTokens).toBeGoogleSignInTokens();

      // Sign out
      await googleSignIn.signOut();

      // Check if signed out
      expect(await googleSignIn.isSignedIn()).toBe(false);
    },
  };
};

/**
 * Test helper to create performance test utilities
 */
export const createPerformanceTest = () => {
  const startTimes = new Map<string, number>();

  return {
    start: (name: string) => {
      startTimes.set(name, performance.now());
    },

    end: (name: string, maxDurationMs: number = 1000) => {
      const startTime = startTimes.get(name);
      if (!startTime) {
        throw new Error(`Performance test '${name}' was not started`);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(maxDurationMs);
      startTimes.delete(name);

      return duration;
    },

    cleanup: () => {
      startTimes.clear();
    },
  };
};

/**
 * Test helper for concurrent operations testing
 */
export const testConcurrentOperations = async <T>(
  operations: Array<() => Promise<T>>,
  expectedResults?: T[]
): Promise<T[]> => {
  const results = await Promise.all(operations.map((op) => op()));

  if (expectedResults) {
    expect(results).toHaveLength(expectedResults.length);
    results.forEach((result, index) => {
      if (expectedResults[index] !== undefined) {
        expect(result).toEqual(expectedResults[index]);
      }
    });
  }

  return results;
};

/**
 * Test helper to verify singleton behavior
 */
export const verifySingleton = (getInstance: () => any) => {
  const instance1 = getInstance();
  const instance2 = getInstance();
  expect(instance1).toBe(instance2);
};

/**
 * Common test setup for beforeEach hooks
 */
export const commonTestSetup = async () => {
  // Reset the GoogleSignIn singleton state
  const { GoogleSignInModule } = await import('../index');
  if (GoogleSignInModule._resetForTesting) {
    GoogleSignInModule._resetForTesting();
  }

  // Reset all mocks
  mockGoogleSignIn.reset();

  // Clear all timers
  jest.clearAllTimers();

  // Reset any performance counters
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    performance.clearMarks();
  }
};

/**
 * Common test cleanup for afterEach hooks
 */
export const commonTestCleanup = () => {
  // Restore all mocks
  jest.restoreAllMocks();

  // Clear all timers
  jest.clearAllTimers();

  // Reset mock state
  mockGoogleSignIn.reset();
};
