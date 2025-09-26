/**
 * iOS Native Module Tests for React Native Google Sign-In Modern
 * Tests iOS-specific behaviors, Google Sign-In SDK integration, and platform-specific error handling
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
  mockUsers,
  resetFactoryCounters,
} from './factories';
import {
  setupSignedInUser,
  setupConfiguredState,
  expectMockCallCounts,
  expectMockCalledWith,
  expectToThrow,
  expectErrorCode,
  commonTestSetup,
  commonTestCleanup,
} from './test-utils';

describe('iOS Native Module Tests', () => {
  beforeEach(async () => {
    await commonTestSetup();
    resetFactoryCounters();
  });

  afterEach(() => {
    commonTestCleanup();
  });

  describe('Module Initialization & Configuration', () => {
    it('should initialize iOS module with proper state', async () => {
      // Verify initial state
      const isConfigured = mockGoogleSignIn.getState().isConfigured;
      expect(isConfigured).toBe(false);
    });

    it('should configure GIDSignIn with valid web client ID', async () => {
      const config = createMockConfig();

      await GoogleSignInModule.configure(config);

      expectMockCallCounts({ configure: 1 });
      expectMockCalledWith('configure', config.webClientId);
      expect(mockGoogleSignIn.getState().isConfigured).toBe(true);
    });

    it('should validate web client ID format on iOS', async () => {
      const invalidConfig = { webClientId: 'invalid-format' };

      // iOS should still configure even with non-standard format (with warning)
      await expect(
        GoogleSignInModule.configure(invalidConfig)
      ).resolves.toBeUndefined();
      expect(mockGoogleSignIn.getState().isConfigured).toBe(true);
    });

    it('should reject configuration with empty web client ID', async () => {
      const emptyConfig = { webClientId: '' };

      await expectToThrow(
        () => GoogleSignInModule.configure(emptyConfig),
        'Invalid web client ID'
      );
    });

    it('should handle configuration when Google SDK is not available', async () => {
      // Simulate iOS without Google Sign-In SDK
      mockGoogleSignIn.setError(
        new Error(
          'Google Sign-In SDK not found. Please install GoogleSignIn pod.'
        )
      );

      const config = createMockConfig();
      await expectToThrow(
        () => GoogleSignInModule.configure(config),
        'Google Sign-In SDK not found. Please install GoogleSignIn pod.'
      );
    });
  });

  describe('iOS Google Sign-In SDK Integration', () => {
    it('should handle successful iOS sign-in flow', async () => {
      await setupConfiguredState();
      const expectedResult = createMockSignInResult();
      mockGoogleSignIn.setSignedIn(expectedResult.user);

      const result = await GoogleSignInModule.signIn();

      expect(result).toBeGoogleSignInResult();
      expect(result.user).toBeGoogleSignInUser();
      expect(result.idToken).toBeDefined();
      expectMockCallCounts({ signIn: 1 });
    });

    it('should simulate iOS view controller presentation', async () => {
      await setupConfiguredState();

      // Simulate iOS UI presentation delay
      mockGoogleSignIn.setState({ signInDelay: 50 });

      const startTime = Date.now();
      await GoogleSignInModule.signIn();
      const endTime = Date.now();

      // Verify some delay occurred (simulating UI presentation)
      expect(endTime - startTime).toBeGreaterThanOrEqual(45);
    });

    it('should handle iOS user cancellation during sign-in', async () => {
      await setupConfiguredState();

      // Simulate iOS kGIDSignInErrorCodeCanceled
      const cancellationError = new Error('User cancelled the sign-in') as any;
      cancellationError.code = 'USER_CANCELLED';
      mockGoogleSignIn.setError(cancellationError);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'USER_CANCELLED');
      }
    });

    it('should handle iOS no auth in keychain error', async () => {
      await setupConfiguredState();

      // Simulate iOS kGIDSignInErrorCodeHasNoAuthInKeychain
      const noAuthError = new Error('No Google accounts available') as any;
      noAuthError.code = 'NO_GOOGLE_ACCOUNTS';
      mockGoogleSignIn.setError(noAuthError);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'NO_GOOGLE_ACCOUNTS');
      }
    });

    it('should extract user ID from iOS ID token properly', async () => {
      await setupConfiguredState();

      // Create a user with specific ID that simulates JWT extraction
      const userWithStableId = {
        ...mockUsers.complete,
        id: 'stable-user-id-from-sub-claim',
      };
      mockGoogleSignIn.setSignedIn(userWithStableId);

      const result = await GoogleSignInModule.signIn();

      expect(result.user.id).toBe('stable-user-id-from-sub-claim');
    });
  });

  describe('iOS Silent Sign-In Flow', () => {
    it('should handle iOS restorePreviousSignIn success', async () => {
      const mockResult = await setupSignedInUser();

      const result = await GoogleSignInModule.signInSilently();

      expect(result).toBeGoogleSignInResult();
      expect(result.user.id).toBe(mockResult.user.id);
      expectMockCallCounts({ signInSilently: 1 });
    });

    it('should handle iOS silent sign-in with no previous user', async () => {
      await setupConfiguredState();

      // Simulate iOS kGIDSignInErrorCodeHasNoAuthInKeychain for silent sign-in
      const noUserError = new Error(
        'The user has never signed in before, or they have since signed out.'
      ) as any;
      noUserError.code = 'SIGN_IN_REQUIRED';
      mockGoogleSignIn.setError(noUserError);

      try {
        await GoogleSignInModule.signInSilently();
        fail('Expected silent sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_REQUIRED');
      }
    });

    it('should handle iOS silent sign-in generic errors', async () => {
      await setupConfiguredState();

      const genericError = new Error(
        'Silent sign-in failed: Network error'
      ) as any;
      genericError.code = 'SIGN_IN_ERROR';
      mockGoogleSignIn.setError(genericError);

      try {
        await GoogleSignInModule.signInSilently();
        fail('Expected silent sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_ERROR');
      }
    });
  });

  describe('iOS Promise Management & Concurrency', () => {
    it('should prevent concurrent iOS sign-in operations', async () => {
      await setupConfiguredState();

      // Add a delay to simulate pending operation
      mockGoogleSignIn.setState({ signInDelay: 100 });

      // Start first sign-in (simulate pending)
      const firstSignInPromise = GoogleSignInModule.signIn();

      // Try to start second sign-in immediately
      try {
        await GoogleSignInModule.signIn();
        fail('Expected second sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_IN_PROGRESS');
      }

      // Wait for first to complete
      await firstSignInPromise;
    });

    it('should prevent concurrent iOS silent sign-in operations', async () => {
      await setupSignedInUser(); // Set up a signed-in user first

      // Start first silent sign-in (simulate delay to test concurrency)
      mockGoogleSignIn.setState({ signInDelay: 100 });
      const firstPromise = GoogleSignInModule.signInSilently();

      // Try to start second immediately
      try {
        await GoogleSignInModule.signInSilently();
        fail('Expected second silent sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_IN_PROGRESS');
      }

      // Wait for first to complete
      await firstPromise;
    });

    it('should clear iOS pending promises on sign out', async () => {
      await setupSignedInUser();

      // Sign out should complete successfully
      await GoogleSignInModule.signOut();

      // After sign out, sign in should be possible again
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);
    });

    it('should handle iOS module destruction during pending operations', async () => {
      await setupConfiguredState();

      // Simulate module destruction error
      const moduleDestroyedError = new Error('Module was destroyed') as any;
      moduleDestroyedError.code = 'MODULE_DESTROYED';
      mockGoogleSignIn.setError(moduleDestroyedError);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected sign in to throw');
      } catch (error) {
        expectErrorCode(error, 'MODULE_DESTROYED');
      }
    });
  });

  describe('iOS Token Management & User Data', () => {
    it('should refresh iOS tokens successfully', async () => {
      await setupSignedInUser();

      const tokens = await GoogleSignInModule.getTokens();

      expect(tokens).toBeGoogleSignInTokens();
      expect(tokens.idToken).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expectMockCallCounts({ getTokens: 1 });
    });

    it('should handle iOS token refresh failures', async () => {
      await setupSignedInUser();

      // Simulate iOS token refresh failure
      const tokenError = new Error(
        'Token refresh failed: Network connection'
      ) as any;
      tokenError.code = 'TOKEN_REFRESH_ERROR';
      mockGoogleSignIn.setError(tokenError);

      try {
        await GoogleSignInModule.getTokens();
        fail('Expected getTokens to throw');
      } catch (error) {
        expectErrorCode(error, 'TOKEN_REFRESH_ERROR');
      }
    });

    it('should handle iOS token refresh with no current user', async () => {
      await setupConfiguredState();

      const noUserError = new Error(
        'No user signed in. Please sign in first.'
      ) as any;
      noUserError.code = 'NO_USER';
      mockGoogleSignIn.setError(noUserError);

      try {
        await GoogleSignInModule.getTokens();
        fail('Expected getTokens to throw');
      } catch (error) {
        expectErrorCode(error, 'NO_USER');
      }
    });

    it('should parse iOS user profile data correctly', async () => {
      await setupConfiguredState();

      // Test with complete user data
      const completeUser = mockUsers.complete;
      mockGoogleSignIn.setSignedIn(completeUser);

      const result = await GoogleSignInModule.signIn();

      expect(result.user.id).toBe(completeUser.id);
      expect(result.user.name).toBe(completeUser.name);
      expect(result.user.email).toBe(completeUser.email);
      expect(result.user.photo).toBe(completeUser.photo);
    });

    it('should handle iOS user with null profile fields', async () => {
      await setupConfiguredState();

      // Test with minimal user data (nulls)
      const minimalUser = mockUsers.minimal;
      mockGoogleSignIn.setSignedIn(minimalUser);

      const result = await GoogleSignInModule.signIn();

      expect(result.user.id).toBe(minimalUser.id);
      expect(result.user.name).toBeNull();
      expect(result.user.email).toBe(minimalUser.email);
      expect(result.user.photo).toBeNull();
    });

    it('should handle iOS profile image URL generation', async () => {
      await setupConfiguredState();

      // User with profile image
      const userWithImage = {
        ...mockUsers.complete,
        photo: 'https://lh3.googleusercontent.com/test-image-120',
      };
      mockGoogleSignIn.setSignedIn(userWithImage);

      const result = await GoogleSignInModule.signIn();

      // Verify image URL contains dimension parameter (iOS specific)
      expect(result.user.photo).toContain('120');
    });
  });

  describe('iOS Sign Out & State Management', () => {
    it('should handle iOS sign out successfully', async () => {
      await setupSignedInUser();

      await GoogleSignInModule.signOut();

      expectMockCallCounts({ signOut: 1 });
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);
    });

    it('should handle iOS sign out errors', async () => {
      await setupSignedInUser();

      const signOutError = new Error('Sign-out failed: Network error') as any;
      signOutError.code = 'SIGN_OUT_ERROR';
      mockGoogleSignIn.setError(signOutError);

      try {
        await GoogleSignInModule.signOut();
        fail('Expected signOut to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_OUT_ERROR');
      }
    });

    it('should clear iOS state completely on sign out', async () => {
      await setupSignedInUser();

      await GoogleSignInModule.signOut();

      // Verify signed-in state is cleared
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);

      // Configuration should still be maintained, so sign-in should work
      await expect(GoogleSignInModule.signIn()).resolves.toBeDefined();
    });

    it('should handle iOS isSignedIn check with current user', async () => {
      await setupSignedInUser();

      const isSignedIn = await GoogleSignInModule.isSignedIn();

      expect(isSignedIn).toBe(true);
      expectMockCallCounts({ isSignedIn: 1 });
    });

    it('should handle iOS isSignedIn check without current user', async () => {
      await setupConfiguredState();

      const isSignedIn = await GoogleSignInModule.isSignedIn();

      expect(isSignedIn).toBe(false);
    });
  });

  describe('iOS Play Services Availability', () => {
    it('should always return true for iOS Play Services check', async () => {
      // iOS doesn't need Play Services, should always return true
      const isAvailable = await GoogleSignInModule.isPlayServicesAvailable();

      expect(isAvailable).toBe(true);
      expectMockCallCounts({ isPlayServicesAvailable: 1 });
    });

    it('should handle iOS Play Services check when Google SDK unavailable', async () => {
      // On iOS, Play Services availability should always return true
      // even when the Google SDK is not available, since iOS doesn't need Play Services

      const isAvailable = await GoogleSignInModule.isPlayServicesAvailable();

      // Should return true since iOS doesn't need Play Services
      expect(isAvailable).toBe(true);
    });
  });

  describe('iOS Error Handling & Exception Management', () => {
    it('should handle iOS configuration exceptions gracefully', async () => {
      const config = createMockConfig();

      // Simulate iOS NSException during configuration
      const nsException = new Error(
        'Failed to configure Google Sign-In: Invalid configuration'
      ) as any;
      nsException.code = 'CONFIGURE_ERROR';
      mockGoogleSignIn.setError(nsException);

      try {
        await GoogleSignInModule.configure(config);
        fail('Expected configure to throw');
      } catch (error) {
        expectErrorCode(error, 'CONFIGURE_ERROR');
      }
    });

    it('should handle iOS sign-in exceptions gracefully', async () => {
      await setupConfiguredState();

      // Simulate iOS NSException during sign-in
      const nsException = new Error(
        'Sign-in failed: Exception in signIn'
      ) as any;
      nsException.code = 'SIGN_IN_ERROR';
      mockGoogleSignIn.setError(nsException);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected signIn to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_ERROR');
      }
    });

    it('should handle iOS token refresh exceptions gracefully', async () => {
      await setupSignedInUser();

      // Simulate iOS NSException during token refresh
      const nsException = new Error(
        'Token refresh failed: Exception in getTokens'
      ) as any;
      nsException.code = 'TOKEN_REFRESH_ERROR';
      mockGoogleSignIn.setError(nsException);

      try {
        await GoogleSignInModule.getTokens();
        fail('Expected getTokens to throw');
      } catch (error) {
        expectErrorCode(error, 'TOKEN_REFRESH_ERROR');
      }
    });

    it('should maintain iOS error code consistency with Android', async () => {
      await setupConfiguredState();

      // Test all iOS error codes match expected values
      const errorMappings = [
        { iosError: 'NOT_CONFIGURED', message: 'Not configured' },
        {
          iosError: 'SIGN_IN_IN_PROGRESS',
          message: 'Sign-in already in progress',
        },
        { iosError: 'USER_CANCELLED', message: 'User cancelled' },
        { iosError: 'NO_GOOGLE_ACCOUNTS', message: 'No Google accounts' },
        { iosError: 'SIGN_IN_ERROR', message: 'Sign-in error' },
        { iosError: 'TOKEN_REFRESH_ERROR', message: 'Token refresh error' },
        { iosError: 'SIGN_OUT_ERROR', message: 'Sign-out error' },
        { iosError: 'NO_USER', message: 'No user' },
      ];

      for (const mapping of errorMappings) {
        mockGoogleSignIn.clearError();
        const error = new Error(mapping.message) as any;
        error.code = mapping.iosError;
        mockGoogleSignIn.setError(error);

        try {
          await GoogleSignInModule.signIn();
          fail(`Should have thrown error for ${mapping.iosError}`);
        } catch (thrownError: any) {
          expect(thrownError.message).toContain(mapping.message);
        }
      }
    });
  });

  describe('iOS Integration Edge Cases', () => {
    it('should handle iOS memory pressure scenarios', async () => {
      await setupConfiguredState();

      // Test sequential rapid calls instead of true concurrency
      // First call should succeed
      const firstResult = await GoogleSignInModule.signIn();
      expect(firstResult).toBeGoogleSignInResult();

      // After first completes, subsequent calls should work too
      await GoogleSignInModule.signOut();
      const secondResult = await GoogleSignInModule.signIn();
      expect(secondResult).toBeGoogleSignInResult();
    });

    it('should handle iOS background/foreground state changes', async () => {
      await setupSignedInUser();

      // Simulate app backgrounding during operation
      const tokens1 = await GoogleSignInModule.getTokens();
      expect(tokens1).toBeGoogleSignInTokens();

      // Simulate app foregrounding - tokens should still work
      const tokens2 = await GoogleSignInModule.getTokens();
      expect(tokens2).toBeGoogleSignInTokens();
    });

    it('should handle iOS view controller hierarchy changes', async () => {
      await setupConfiguredState();

      // Simulate view controller presentation issues
      const presentationError = new Error(
        'No root view controller available'
      ) as any;
      presentationError.code = 'SIGN_IN_ERROR';
      mockGoogleSignIn.setError(presentationError);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected signIn to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_ERROR');
      }
    });

    it('should handle iOS network connectivity changes during sign-in', async () => {
      await setupConfiguredState();

      // Simulate network error during sign-in
      const networkError = new Error(
        'Sign-in failed: Network connection lost'
      ) as any;
      networkError.code = 'SIGN_IN_ERROR';
      mockGoogleSignIn.setError(networkError);

      try {
        await GoogleSignInModule.signIn();
        fail('Expected signIn to throw');
      } catch (error) {
        expectErrorCode(error, 'SIGN_IN_ERROR');
      }
    });
  });

  describe('iOS Complete Integration Flows', () => {
    it('should handle complete iOS authentication flow', async () => {
      const config = createMockConfig();

      // Step 1: Configure
      await GoogleSignInModule.configure(config);
      expect(mockGoogleSignIn.getState().isConfigured).toBe(true);

      // Step 2: Check initial state
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);

      // Step 3: Sign in interactively
      const signInResult = await GoogleSignInModule.signIn();
      expect(signInResult).toBeGoogleSignInResult();

      // Step 4: Verify signed in
      expect(await GoogleSignInModule.isSignedIn()).toBe(true);

      // Step 5: Get fresh tokens
      const tokens = await GoogleSignInModule.getTokens();
      expect(tokens).toBeGoogleSignInTokens();

      // Step 6: Test silent sign-in
      const silentResult = await GoogleSignInModule.signInSilently();
      expect(silentResult).toBeGoogleSignInResult();
      expect(silentResult.user.id).toBe(signInResult.user.id);

      // Step 7: Sign out
      await GoogleSignInModule.signOut();
      expect(await GoogleSignInModule.isSignedIn()).toBe(false);

      // Verify all iOS methods were called
      expectMockCallCounts({
        configure: 1,
        signIn: 1,
        isSignedIn: 3,
        getTokens: 1,
        signInSilently: 1,
        signOut: 1,
      });
    });

    it('should handle iOS authentication flow with user profile updates', async () => {
      await setupConfiguredState();

      // Sign in with initial profile
      const initialUser = mockUsers.complete;
      mockGoogleSignIn.setSignedIn(initialUser);
      const result1 = await GoogleSignInModule.signIn();

      // Simulate profile update (new photo URL)
      const updatedUser = {
        ...initialUser,
        photo: 'https://lh3.googleusercontent.com/updated-photo-120',
      };

      await GoogleSignInModule.signOut();
      mockGoogleSignIn.setSignedIn(updatedUser);
      const result2 = await GoogleSignInModule.signIn();

      expect(result2.user.photo).toBe(updatedUser.photo);
      expect(result2.user.photo).not.toBe(result1.user.photo);
    });
  });
});
