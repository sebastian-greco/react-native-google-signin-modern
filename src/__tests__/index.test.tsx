/**
 * Comprehensive test suite for React Native Google Sign-In Modern
 * Tests the main GoogleSignIn class and its interactions with the native module
 */

// Mock the native module before importing
jest.mock(
  '../NativeGoogleSigninModern',
  () => require('./__mocks__/NativeGoogleSigninModern').default
);

import { GoogleSignInModule } from '../index';
import { mockGoogleSignIn } from './__mocks__/NativeGoogleSigninModern';
import {
  createMockConfig,
  createMockSignInResult,
  mockErrors,
  mockUsers,
  resetFactoryCounters,
} from './factories';
import {
  setupSignedInUser,
  setupConfiguredState,
  setupUnconfiguredState,
  setupPlayServicesUnavailable,
  setupErrorScenario,
  expectMockCallCounts,
  expectMockCalledWith,
  expectToThrow,
  expectErrorCode,
  commonTestSetup,
  commonTestCleanup,
  verifySingleton,
} from './test-utils';

describe('GoogleSignInModule', () => {
  beforeEach(async () => {
    await commonTestSetup();
    resetFactoryCounters();
  });

  afterEach(() => {
    commonTestCleanup();
  });

  describe('Singleton Pattern', () => {
    it('should always return the same instance', () => {
      verifySingleton(() => GoogleSignInModule);
    });

    it('should maintain state across multiple references', async () => {
      const config = createMockConfig();

      await GoogleSignInModule.configure(config);

      // Get another reference and verify state is maintained
      const { GoogleSignInModule: secondRef } = await import('../index');
      expect(await secondRef.isSignedIn()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should configure successfully with valid webClientId', async () => {
      const config = createMockConfig();

      await expect(
        GoogleSignInModule.configure(config)
      ).resolves.toBeUndefined();

      expectMockCallCounts({ configure: 1 });
      expectMockCalledWith('configure', config.webClientId, null, null);
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = { webClientId: '' };

      await expectToThrow(
        () => GoogleSignInModule.configure(invalidConfig),
        'Invalid web client ID'
      );
    });

    it('should handle native module configuration errors', async () => {
      const config = createMockConfig();
      const error = new Error('Native configuration failed');
      await setupErrorScenario(error);

      await expectToThrow(() => GoogleSignInModule.configure(config), error);
    });
  });

  describe('Play Services Availability', () => {
    it('should check Play Services availability successfully', async () => {
      mockGoogleSignIn.setState({ isPlayServicesAvailable: true });

      const result = await GoogleSignInModule.isPlayServicesAvailable();

      expect(result).toBe(true);
      expectMockCallCounts({ isPlayServicesAvailable: 1 });
    });

    it('should return false when Play Services are not available', async () => {
      mockGoogleSignIn.setState({ isPlayServicesAvailable: false });

      const result = await GoogleSignInModule.isPlayServicesAvailable();

      expect(result).toBe(false);
    });

    it('should handle Play Services check errors', async () => {
      const error = new Error('Play Services check failed');
      await setupErrorScenario(error);

      await expectToThrow(
        () => GoogleSignInModule.isPlayServicesAvailable(),
        error
      );
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully when configured', async () => {
      await setupConfiguredState();
      const expectedResult = createMockSignInResult();
      mockGoogleSignIn.setSignedIn(expectedResult.user);

      const result = await GoogleSignInModule.signIn();

      expect(result).toBeGoogleSignInResult();
      expect(result.user).toBeGoogleSignInUser();
      expect(result.idToken).toBeDefined();
      expect(typeof result.idToken).toBe('string');
      expectMockCallCounts({ signIn: 1 });
    });

    it('should handle users with null name and photo', async () => {
      await setupConfiguredState();
      const userWithNulls = mockUsers.minimal;
      mockGoogleSignIn.setSignedIn(userWithNulls);

      const result = await GoogleSignInModule.signIn();

      expect(result.user.name).toBeNull();
      expect(result.user.photo).toBeNull();
      expect(result.user.id).toBe(userWithNulls.id);
      expect(result.user.email).toBe(userWithNulls.email);
    });

    it('should throw error when not configured', async () => {
      setupUnconfiguredState();

      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        'Google Sign-In not configured. Call configure() first.'
      );

      expectMockCallCounts({ signIn: 0 });
    });

    it('should handle Play Services unavailable error', async () => {
      await setupPlayServicesUnavailable();

      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        'Google Play Services not available'
      );
    });

    it('should handle sign in cancellation', async () => {
      await setupConfiguredState();
      await setupErrorScenario(mockErrors.signInCanceled);

      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        mockErrors.signInCanceled
      );
    });

    it('should handle generic sign in failures', async () => {
      await setupConfiguredState();
      await setupErrorScenario(mockErrors.signInFailed);

      await expectToThrow(
        () => GoogleSignInModule.signIn(),
        mockErrors.signInFailed
      );
    });
  });

  describe('Silent Sign In', () => {
    it('should sign in silently when user is already signed in', async () => {
      const mockResult = await setupSignedInUser();

      const result = await GoogleSignInModule.signInSilently();

      expect(result).toBeGoogleSignInResult();
      expect(result.user.id).toBe(mockResult.user.id);
      expectMockCallCounts({ signInSilently: 1 });
    });

    it('should throw error when not configured', async () => {
      setupUnconfiguredState();

      await expectToThrow(
        () => GoogleSignInModule.signInSilently(),
        'Google Sign-In not configured. Call configure() first.'
      );
    });

    it('should throw error when no user is signed in', async () => {
      await setupConfiguredState();

      await expectToThrow(
        () => GoogleSignInModule.signInSilently(),
        'No signed in user'
      );
    });

    it('should handle users with null name and photo in silent sign in', async () => {
      await setupConfiguredState();
      const userWithNulls = mockUsers.minimal;
      mockGoogleSignIn.setSignedIn(userWithNulls);

      const result = await GoogleSignInModule.signInSilently();

      expect(result.user.name).toBeNull();
      expect(result.user.photo).toBeNull();
      expect(result.user.id).toBe(userWithNulls.id);
      expect(result.user.email).toBe(userWithNulls.email);
      expectMockCallCounts({ signInSilently: 1 });
    });

    it('should handle silent sign in errors', async () => {
      await setupConfiguredState();
      await setupErrorScenario(mockErrors.noSignedInUser);

      await expectToThrow(
        () => GoogleSignInModule.signInSilently(),
        mockErrors.noSignedInUser
      );
    });
  });

  describe('Token Management', () => {
    it('should get fresh tokens for signed in user', async () => {
      await setupSignedInUser();

      const tokens = await GoogleSignInModule.getTokens();

      expect(tokens).toBeGoogleSignInTokens();
      expect(tokens.idToken).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expectMockCallCounts({ getTokens: 1 });
    });

    it('should throw error when not configured', async () => {
      setupUnconfiguredState();

      await expectToThrow(
        () => GoogleSignInModule.getTokens(),
        'Google Sign-In not configured. Call configure() first.'
      );
    });

    it('should throw error when no user is signed in', async () => {
      await setupConfiguredState();

      await expectToThrow(
        () => GoogleSignInModule.getTokens(),
        'No signed in user'
      );
    });

    it('should handle token retrieval errors', async () => {
      await setupConfiguredState();
      await setupErrorScenario(new Error('Token retrieval failed'));

      await expectToThrow(
        () => GoogleSignInModule.getTokens(),
        'Token retrieval failed'
      );
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully when configured', async () => {
      await setupSignedInUser();

      await expect(GoogleSignInModule.signOut()).resolves.toBeUndefined();

      expectMockCallCounts({ signOut: 1 });
    });

    it('should throw error when not configured', async () => {
      setupUnconfiguredState();

      await expectToThrow(
        () => GoogleSignInModule.signOut(),
        'Google Sign-In not configured'
      );
    });

    it('should handle sign out errors', async () => {
      await setupConfiguredState();
      await setupErrorScenario(new Error('Sign out failed'));

      await expectToThrow(
        () => GoogleSignInModule.signOut(),
        'Sign out failed'
      );
    });
  });

  describe('Sign In Status', () => {
    it('should return true when user is signed in', async () => {
      await setupSignedInUser();

      const result = await GoogleSignInModule.isSignedIn();

      expect(result).toBe(true);
      expectMockCallCounts({ isSignedIn: 1 });
    });

    it('should return false when user is not signed in', async () => {
      await setupConfiguredState();

      const result = await GoogleSignInModule.isSignedIn();

      expect(result).toBe(false);
    });

    it('should return false when not configured', async () => {
      setupUnconfiguredState();

      const result = await GoogleSignInModule.isSignedIn();

      expect(result).toBe(false);
      expectMockCallCounts({ isSignedIn: 0 });
    });

    it('should handle status check errors', async () => {
      await setupConfiguredState();
      await setupErrorScenario(new Error('Status check failed'));

      await expectToThrow(
        () => GoogleSignInModule.isSignedIn(),
        'Status check failed'
      );
    });
  });

  describe('Complete Integration Flow', () => {
    it('should handle complete sign in and sign out flow', async () => {
      const config = createMockConfig();

      // Configure
      await GoogleSignInModule.configure(config);

      // Initially not signed in
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);

      // Sign in
      const signInResult = await GoogleSignInModule.signIn();
      expect(signInResult).toBeGoogleSignInResult();

      // Now signed in
      expect(await GoogleSignInModule.isSignedIn()).toBe(true);

      // Get tokens
      const tokens = await GoogleSignInModule.getTokens();
      expect(tokens).toBeGoogleSignInTokens();

      // Sign out
      await GoogleSignInModule.signOut();

      // No longer signed in
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);

      // Verify all methods were called
      expectMockCallCounts({
        configure: 1,
        signIn: 1,
        isSignedIn: 3,
        getTokens: 1,
        signOut: 1,
      });
    });

    it('should handle silent sign in after regular sign in', async () => {
      const config = createMockConfig();

      // Configure and sign in
      await GoogleSignInModule.configure(config);
      const firstResult = await GoogleSignInModule.signIn();

      // Silent sign in should work
      const secondResult = await GoogleSignInModule.signInSilently();
      expect(secondResult).toBeGoogleSignInResult();
      expect(secondResult.user.id).toBe(firstResult.user.id);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle multiple consecutive errors', async () => {
      await setupConfiguredState();

      // Set up error for first call
      await setupErrorScenario(new Error('First error'));
      await expectToThrow(() => GoogleSignInModule.signIn(), 'First error');

      // Clear error and set up different error
      mockGoogleSignIn.clearError();
      await setupErrorScenario(new Error('Second error'));
      await expectToThrow(() => GoogleSignInModule.signIn(), 'Second error');
    });

    it('should handle error codes properly', async () => {
      await setupConfiguredState();

      const errorWithCode = mockErrors.playServicesNotAvailable;
      await setupErrorScenario(errorWithCode);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected error to be thrown');
      } catch (error) {
        expectErrorCode(error, 'PLAY_SERVICES_NOT_AVAILABLE');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive calls', async () => {
      const config = createMockConfig();
      await GoogleSignInModule.configure(config);

      // Make multiple rapid calls
      const promises = [
        GoogleSignInModule.signIn(),
        GoogleSignInModule.signIn(),
        GoogleSignInModule.signIn(),
      ];

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).toBeGoogleSignInResult();
      });
    });

    it('should handle configuration changes', async () => {
      const firstConfig = createMockConfig();
      const secondConfig = createMockConfig({
        webClientId: 'different-client-id.googleusercontent.com',
      });

      // Configure with first config
      await GoogleSignInModule.configure(firstConfig);
      expectMockCalledWith('configure', firstConfig.webClientId, null, null);

      // Reconfigure with second config
      await GoogleSignInModule.configure(secondConfig);
      expectMockCalledWith('configure', secondConfig.webClientId, null, null);

      expectMockCallCounts({ configure: 2 });
    });
  });
});
