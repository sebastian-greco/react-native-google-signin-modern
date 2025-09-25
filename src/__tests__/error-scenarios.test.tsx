/**
 * Error handling test suite for React Native Google Sign-In Modern
 * Tests comprehensive error scenarios and edge cases
 */

// Mock the native module before importing
jest.mock(
  '../NativeGoogleSigninModern',
  () => require('./__mocks__/NativeGoogleSigninModern').default
);

import { GoogleSignInModule } from '../index';
import { mockGoogleSignIn } from './__mocks__/NativeGoogleSigninModern';
import { mockErrors, createMockConfig } from './factories';
import {
  setupConfiguredState,
  expectToThrow,
  expectErrorCode,
  commonTestSetup,
  commonTestCleanup,
} from './test-utils';

describe('GoogleSignInModule - Error Handling', () => {
  beforeEach(() => {
    commonTestSetup();
  });

  afterEach(() => {
    commonTestCleanup();
  });

  describe('Configuration Errors', () => {
    it('should handle empty web client ID', async () => {
      await expectToThrow(
        () => GoogleSignInModule.configure({ webClientId: '' }),
        'Invalid web client ID'
      );
    });

    it('should handle malformed web client ID', async () => {
      mockGoogleSignIn.setError(new Error('Invalid client ID format'));

      await expectToThrow(
        () => GoogleSignInModule.configure({ webClientId: 'invalid-format' }),
        'Invalid client ID format'
      );
    });

    it('should handle network errors during configuration', async () => {
      mockGoogleSignIn.setError(mockErrors.networkError);

      await expectToThrow(
        () => GoogleSignInModule.configure(createMockConfig()),
        mockErrors.networkError
      );
    });
  });

  describe('Sign In Errors', () => {
    it('should handle sign in cancellation by user', async () => {
      await setupConfiguredState();
      mockGoogleSignIn.setError(mockErrors.signInCanceled);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_CANCELLED');
      }
    });

    it('should handle Play Services not available', async () => {
      await setupConfiguredState();
      mockGoogleSignIn.setError(mockErrors.playServicesNotAvailable);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'PLAY_SERVICES_NOT_AVAILABLE');
      }
    });

    it('should handle network timeout during sign in', async () => {
      await setupConfiguredState();

      // Simulate timeout
      const timeoutError = new Error('Network timeout') as any;
      timeoutError.code = 'NETWORK_TIMEOUT';
      mockGoogleSignIn.setError(timeoutError);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected timeout error');
      } catch (error) {
        expectErrorCode(error, 'NETWORK_TIMEOUT');
      }
    });

    it('should handle generic sign in failures', async () => {
      await setupConfiguredState();
      mockGoogleSignIn.setError(mockErrors.signInFailed);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected sign in to fail');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_FAILED');
      }
    });
  });

  describe('Token Management Errors', () => {
    it('should handle expired tokens', async () => {
      await setupConfiguredState();

      const expiredTokenError = new Error('Token expired') as any;
      expiredTokenError.code = 'TOKEN_EXPIRED';
      mockGoogleSignIn.setError(expiredTokenError);

      try {
        await GoogleSignInModule.getTokens();
        fail('Expected token error');
      } catch (error) {
        expectErrorCode(error, 'TOKEN_EXPIRED');
      }
    });

    it('should handle token refresh failures', async () => {
      await setupConfiguredState();

      const refreshError = new Error('Token refresh failed') as any;
      refreshError.code = 'TOKEN_REFRESH_FAILED';
      mockGoogleSignIn.setError(refreshError);

      try {
        await GoogleSignInModule.getTokens();
        fail('Expected refresh error');
      } catch (error) {
        expectErrorCode(error, 'TOKEN_REFRESH_FAILED');
      }
    });

    it('should handle network errors during token retrieval', async () => {
      await setupConfiguredState();
      mockGoogleSignIn.setError(mockErrors.networkError);

      try {
        await GoogleSignInModule.getTokens();
        fail('Expected network error');
      } catch (error) {
        expectErrorCode(error, 'NETWORK_ERROR');
      }
    });
  });

  describe('Silent Sign In Errors', () => {
    it('should handle no cached credentials', async () => {
      await setupConfiguredState();

      const noCacheError = new Error('No cached credentials') as any;
      noCacheError.code = 'NO_CACHED_CREDENTIALS';
      mockGoogleSignIn.setError(noCacheError);

      try {
        await GoogleSignInModule.signInSilently();
        fail('Expected no cache error');
      } catch (error) {
        expectErrorCode(error, 'NO_CACHED_CREDENTIALS');
      }
    });

    it('should handle expired cached credentials', async () => {
      await setupConfiguredState();

      const expiredError = new Error('Cached credentials expired') as any;
      expiredError.code = 'CACHED_CREDENTIALS_EXPIRED';
      mockGoogleSignIn.setError(expiredError);

      try {
        await GoogleSignInModule.signInSilently();
        fail('Expected expired credentials error');
      } catch (error) {
        expectErrorCode(error, 'CACHED_CREDENTIALS_EXPIRED');
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient errors', async () => {
      const config = createMockConfig();

      // First call fails
      mockGoogleSignIn.setError(new Error('Transient error'));
      await expectToThrow(
        () => GoogleSignInModule.configure(config),
        'Transient error'
      );

      // Clear error and retry succeeds
      mockGoogleSignIn.clearError();
      await expect(
        GoogleSignInModule.configure(config)
      ).resolves.toBeUndefined();
    });

    it('should handle consecutive different errors', async () => {
      await setupConfiguredState();

      // First error
      mockGoogleSignIn.setError(mockErrors.networkError);
      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        mockErrors.networkError
      );

      // Different error on retry
      mockGoogleSignIn.setError(mockErrors.playServicesNotAvailable);
      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        mockErrors.playServicesNotAvailable
      );

      // Success on third try
      mockGoogleSignIn.clearError();
      const result = await GoogleSignInModule.signIn();
      expect(result).toBeGoogleSignInResult();
    });
  });

  describe('State Consistency During Errors', () => {
    it('should maintain configuration state after sign in error', async () => {
      await setupConfiguredState();

      // Sign in fails but should stay configured
      mockGoogleSignIn.setError(mockErrors.signInFailed);
      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        mockErrors.signInFailed
      );

      // Should still be configured and able to check Play Services
      mockGoogleSignIn.clearError();
      const available = await GoogleSignInModule.isPlayServicesAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should not change signed in state after token error', async () => {
      await setupConfiguredState();

      // First sign in successfully
      const signInResult = await GoogleSignInModule.signIn();
      expect(signInResult).toBeGoogleSignInResult();

      // Token retrieval fails but should still be signed in
      mockGoogleSignIn.setError(new Error('Token error'));
      await expectToThrow(() => GoogleSignInModule.getTokens(), 'Token error');

      // Should still be signed in
      mockGoogleSignIn.clearError();
      const isSignedIn = await GoogleSignInModule.isSignedIn();
      expect(isSignedIn).toBe(true);
    });
  });
});
